import type { ReactNode } from 'react';

import SnackbarContainer from 'v3/components/SnackBar/Container';
import authBg from '../../../images/auth/signup-bg.jpg';

// Nền chung cho mọi trang auth (đăng nhập, đăng ký, quên mật khẩu…).
// Thẻ card do từng trang tự dựng — MfaVerification/SessionLimitOverlay đã có
// card riêng nên shell chỉ lo phần nền.
export const authCard =
    'w-full max-w-[460px] py-10 px-10 bg-white rounded-lg outline outline-1 outline-n-container shadow-sm';

export default function AuthShell({ children }: { children: ReactNode }) {
    return (
        <div
            className="relative w-full h-full min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat p-4"
            style={{ backgroundImage: `url(${authBg})` }}
        >
            <div className="absolute inset-0 bg-n-gray-12/60 backdrop-blur-sm" />
            <div className="relative w-full flex justify-center">{children}</div>
            <SnackbarContainer />
        </div>
    );
}
