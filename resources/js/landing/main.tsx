import { createRoot } from 'react-dom/client';

import { landingConfig } from './config';
import { Shell } from './components/Shell';
import { Landing } from './Landing';
import { DemoRequest } from './pages/DemoRequest';
import { DemoThanks } from './pages/DemoThanks';
import { LegalDocument } from './pages/LegalDocument';
import { NotFound } from './pages/NotFound';
import { ZaloPersonal } from './pages/ZaloPersonal';

const container = document.getElementById('app');

if (container) {
    const config = landingConfig();

    // Một bundle cho cả bề mặt công khai, blade chọn trang bằng `page`. Không có
    // router phía client: mỗi trang là một request thật, nên link chia sẻ và nút
    // back của trình duyệt hoạt động không cần thêm gì.
    const page = {
        home: <Landing />,
        zalo_personal: <ZaloPersonal config={config} />,
        demo: <DemoRequest config={config} />,
        demo_thanks: <DemoThanks config={config} />,
        terms: <LegalDocument config={config} />,
        privacy: <LegalDocument config={config} />,
        not_found: <NotFound config={config} />,
    }[config.page];

    createRoot(container).render(config.page === 'home' ? page : <Shell config={config}>{page}</Shell>);
}
