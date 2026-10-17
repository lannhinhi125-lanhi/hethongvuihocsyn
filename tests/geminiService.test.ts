import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {generateGeminiText,validateGeminiInput} from '../services/geminiService';
import {createGeminiHandler} from '../server/geminiHandler';

const originalFetch=globalThis.fetch;
const env={GEMINI_API_KEY:'test-server-secret',GEMINI_MODEL:'gemini-test',VITE_SUPABASE_URL:'https://project.supabase.co',VITE_SUPABASE_ANON_KEY:'public-test-key'};
const input={messages:[{role:'user' as const,text:'Xin chào'}]};
let permission=true,validSession=true,upstreamStatus=200;
const calls:{url:string;headers:Headers;body:any}[]=[];
globalThis.fetch=async(url,init)=>{
  calls.push({url:String(url),headers:new Headers(init?.headers),body:JSON.parse(String(init?.body))});
  if(String(url).includes('vuihoc_session'))return Response.json(validSession ? {
    actor:{madinhdanh:'USER',manhomquyen:'ROLE',trangthai:'active'},
    role_groups:[{madinhdanh:'ROLE',congtruycap:'TEACHER',danhsachquyen:permission?['T_SCHEDULE_ALL']:['T_SCHEDULE_READ']}],
  } : {error:'Invalid session'}, {status:validSession?200:401});
  return upstreamStatus===200 ? Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'internal thought',thought:true},{text:'Chào bạn!'}]}}]})
    : Response.json({error:{message:'test-server-secret must never escape'}},{status:upstreamStatus});
};

async function request(body:unknown=input,headers:Record<string,string>={'content-type':'application/json',authorization:'Bearer session'},method='POST',parsed=true){
  const req=Readable.from(parsed ? [] : [JSON.stringify(body)]) as IncomingMessage & {body?:unknown};
  req.method=method;req.headers=headers;if(parsed)req.body=body;
  const responseHeaders:Record<string,string>={};
  let output='';
  const res={statusCode:200,setHeader:(key:string,value:string)=>{responseHeaders[key]=value;},end:(value:string)=>{output=value;}};
  await createGeminiHandler(()=>env)(req,res as unknown as ServerResponse);
  return {status:res.statusCode,body:JSON.parse(output),headers:responseHeaders};
}
try {
  assert.throws(()=>validateGeminiInput({messages:[]}),/tin nhắn/);
  assert.throws(()=>validateGeminiInput({messages:[{role:'model',text:'wrong role'}]}),/tin nhắn/);
  assert.throws(()=>validateGeminiInput({messages:[{role:'user',text:'a'.repeat(120_001)}]}),/quá dài/);
  await assert.rejects(generateGeminiText(input,{API_KEY:'wrong-variable',GEMINI_MODEL:'gemini-test'}),/GEMINI_API_KEY/);
  assert.equal(calls.length,0);
  assert.equal(await generateGeminiText(input,env),'Chào bạn!');
  assert.equal(calls[0].headers.get('x-goog-api-key'),env.GEMINI_API_KEY);
  assert.equal(calls[0].url.includes(env.GEMINI_API_KEY),false);
  assert.equal(calls[0].url.endsWith('/gemini-test:generateContent'),true);
  assert.deepEqual(calls[0].body.contents,[{role:'user',parts:[{text:'Xin chào'}]}]);
  const success=await request();assert.equal(success.status,200);assert.equal(success.body.text,'Chào bạn!');
  assert.equal(success.headers['Cache-Control'],'no-store');
  assert.equal((await request(input,undefined,'POST',false)).status,200);
  let count=calls.length;
  assert.equal((await request(input,{'content-type':'application/json'})).status,401);
  assert.equal(calls.length,count);
  assert.equal((await request(input,{},'GET')).status,405);
  assert.equal((await request(input,{'content-type':'text/plain'})).status,415);
  assert.equal((await request({messages:[{role:'user',text:'a'.repeat(600_000)}]})).status,413);
  validSession=false;assert.equal((await request()).status,401);validSession=true;
  permission=false;count=calls.length;assert.equal((await request()).status,403);assert.equal(calls.length,count+1);permission=true;
  upstreamStatus=429;const limited=await request();assert.equal(limited.status,429);
  assert.equal(JSON.stringify(limited).includes(env.GEMINI_API_KEY),false);
  upstreamStatus=403;const rejected=await request();assert.equal(rejected.status,502);
  assert.equal(JSON.stringify(rejected).includes(env.GEMINI_API_KEY),false);
  console.log('PASS: Gemini request, explicit env key, authenticated endpoint, permissions, local/Vercel body formats, limits, no key in errors/URL');
} finally {globalThis.fetch=originalFetch;}
