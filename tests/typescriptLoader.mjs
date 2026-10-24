// Run TypeScript tests using Node's built-in type stripping, resolving extensionless local imports.
export async function resolve(specifier,context,nextResolve) {
 try{return await nextResolve(specifier,context);}catch(error){
  if(specifier.startsWith('.')&&!specifier.split('/').at(-1).includes('.'))return nextResolve(specifier+'.ts',context);
  throw error;
 }
}
