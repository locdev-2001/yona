import { createRoot } from 'react-dom/client';

import App from './App';

// Trang công khai theo token — không store, không router: chỉ một màn đọc token
// trên đường dẫn (giống resources/js/survey/main.tsx).
const container = document.getElementById('app');

if (container) {
    createRoot(container).render(<App />);
}
