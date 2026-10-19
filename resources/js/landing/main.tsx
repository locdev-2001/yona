import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

import { landingConfig, type LandingPage } from './config';
import { landingCopy } from './copy';
import { Shell } from './components/Shell';
import { Landing } from './Landing';
import { LegalDocument } from './pages/LegalDocument';
import { NotFound } from './pages/NotFound';

const container = document.getElementById('app');

if (container) {
    const config = landingConfig();

    // Một bundle cho cả bề mặt, blade chọn trang bằng `page`. Không có router
    // phía client: mỗi trang là một request thật, nên link chia sẻ và nút back
    // của trình duyệt hoạt động không cần thêm gì. `null` = trang chủ.
    const pages: Record<LandingPage, ReactElement | null> = {
        home: null,
        zalo_personal: null,
        demo: null,
        demo_thanks: null,
        terms: <LegalDocument config={config} />,
        privacy: <LegalDocument config={config} />,
        not_found: <NotFound config={config} />,
    };
    const page = pages[config.page];

    // Thẻ meta trong blade đọc lang/landing.php; trang chủ lấy lời giới thiệu ở
    // copy.ts nên tab trình duyệt phải theo cùng nguồn đó.
    if (page === null) {
        const meta = landingCopy(config.locale).meta;
        document.title = meta.title;
        document.querySelector('meta[name="description"]')?.setAttribute('content', meta.description);
    }

    createRoot(container).render(page === null ? <Landing /> : <Shell config={config}>{page}</Shell>);
}
