import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ReportSplitPane} from '../../src/components/ReportSplitPane';
import {ResizableChatPanel} from '../../src/components/ResizableChatPanel';
import {TeacherChatThread} from '../../src/components/TeacherChatThread';
import '../../src/index.css';
function Fixture(){
 const [draft,setDraft]=useState('');
 return <main className="mx-auto max-w-[1600px] p-4"><ReportSplitPane initialWidth={420}
  controlsLabel="Thiết lập chatbot quản trị" controlsTitle="Cấu hình chatbot" resultsLabel="Chatbot quản trị"
  controls={<div className="rounded-lg border p-4">Cấu hình chatbot</div>}>
  <ResizableChatPanel><header className="shrink-0 border-b p-4">Thử nghiệm Bot chat AI</header>
   <TeacherChatThread turns={[]} greeting={'Nội dung trò chuyện được giữ nguyên khi thay đổi kích thước. '.repeat(100)}
    isBusy={false} isAnswering={false} hasOlder={false} onOlder={()=>{}} onAskAgain={()=>{}}/>
   <form className="flex shrink-0 gap-2 border-t p-3" onSubmit={event=>event.preventDefault()}>
    <input aria-label="Câu hỏi" className="min-w-0 flex-1 border p-2" value={draft} onChange={event=>setDraft(event.target.value)}/>
    <button type="submit">Gửi</button>
   </form>
  </ResizableChatPanel>
 </ReportSplitPane></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
