import type { ReactNode } from 'react';

import type { LandingConfig } from '../config';
import { Footer } from './Footer';
import { Header } from './Header';

/**
 * Khung chung của mọi trang công khai: nav cố định 64px, nội dung, footer.
 *
 * `pt-16` bù đúng chiều cao nav — nav `fixed` nên nó không chiếm chỗ trong luồng,
 * thiếu padding thì section đầu nằm dưới nav.
 */
export function Shell({ config, children }: { config: LandingConfig; children: ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col pt-16">
            <Header config={config} />
            <main className="flex-1">{children}</main>
            <Footer config={config} />
        </div>
    );
}
