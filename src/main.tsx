import { clearLegacyBrowserData } from './lib/localData';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Chạy trước khi mount: không để cache cũ và phiên đăng nhập cũ được nạp lại.
clearLegacyBrowserData();
createRoot(document.getElementById('root')!).render(<App />);
