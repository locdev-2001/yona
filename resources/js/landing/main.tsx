import { createRoot } from 'react-dom/client';

import { Landing } from './Landing';

// Bề mặt công khai độc lập như survey/portal: không store, không router, không
// nạp bundle dashboard.
const container = document.getElementById('app');

if (container) {
    createRoot(container).render(<Landing />);
}
