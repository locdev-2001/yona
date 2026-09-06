import { createRoot } from 'react-dom/client';

import Response from './Response';

// Port từ entrypoints/survey.js — trang khảo sát công khai, không store, không
// router: chỉ một màn duy nhất đọc uuid trên URL.
const container = document.getElementById('app');

if (container) {
    createRoot(container).render(
        <div id="app-wrap" dir="ltr" className="woot-survey-wrap min-h-screen">
            <Response />
        </div>,
    );
}
