import React from 'react';
import {createRoot} from 'react-dom/client';
import {ProfileExcelImport} from '../../src/components/ProfileExcelImport';
import '../../src/index.css';
createRoot(document.getElementById('root')!).render(<main className="space-y-5 p-6"><p id="test-toast" role="status"/><section data-kind="students"><h2>Hồ sơ học sinh</h2><ProfileExcelImport kind="students"/></section><section data-kind="teachers"><h2>Hồ sơ giáo viên</h2><ProfileExcelImport kind="teachers"/></section></main>);
