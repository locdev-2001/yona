import type { ReactNode } from 'react';

import SnackbarContainer from 'v3/components/SnackBar/Container';
import { t } from '../../i18n';

// Nền chung cho mọi trang auth (đăng nhập, đăng ký, quên mật khẩu…): nền sáng chuyển
// nhẹ từ xanh Yona, thẻ trắng bo góc không viền. Thẻ do từng trang tự dựng bằng `authCard`
// (MfaVerification/SessionLimitOverlay có thẻ riêng nên shell chỉ lo phần nền).
export const authCard = 'w-full max-w-[440px] px-6 py-8 sm:px-10 sm:py-10 bg-n-surface-panel rounded-xl shadow-overlay';

export default function AuthShell({ children }: { children: ReactNode }) {
    return (
        <div className="relative w-full h-full min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-n-blue-3 via-n-surface-canvas to-n-surface-canvas">
            <div className="relative w-full flex justify-center">{children}</div>
            <SnackbarContainer />
        </div>
    );
}

export function AuthHomeLink() {
    return (
        <a
            href="/"
            className="flex items-center justify-center gap-1.5 mx-auto mt-3 text-sm w-fit text-n-slate-11 hover:text-n-slate-12"
        >
            <span className="i-lucide-arrow-left size-4" aria-hidden="true" />
            {t('LANDING.nav.back_to_home')}
        </a>
    );
}

// Dòng chuyển trang ở cuối thẻ ("Chưa có tài khoản? Tạo tài khoản").
export function AuthSwitchLink({ prompt, label, href }: { prompt: string; label: string; href: string }) {
    return (
        <p className="mt-6 mb-0 text-sm text-center text-n-slate-11">
            {prompt}{' '}
            <a href={href} className="font-medium text-n-blue-11 hover:underline">
                {label}
            </a>
        </p>
    );
}
