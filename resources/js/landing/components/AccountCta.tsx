import type { LandingConfig } from '../config';
import type { LandingCopy } from '../copy';
import { CtaPair } from './Button';

/** Cặp nút mở và khép trang: khách thì Tạo tài khoản + Đăng nhập, người đã đăng nhập thì vào thẳng app. */
export function AccountCta({ config, copy }: { config: LandingConfig; copy: LandingCopy }) {
    const { urls, isAuthenticated } = config;

    return isAuthenticated ? (
        <CtaPair align="center" primary={{ label: copy.nav.open_app, href: urls.dashboard }} />
    ) : (
        <CtaPair
            align="center"
            primary={{ label: copy.nav.register, href: urls.register }}
            secondary={{ label: copy.nav.login, href: urls.login }}
        />
    );
}
