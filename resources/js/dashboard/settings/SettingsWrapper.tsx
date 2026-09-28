import type { ReactNode } from 'react';

// Port từ dashboard/routes/dashboard/settings/SettingsWrapper.vue
// (router-view/keep-alive là chi tiết Vue router — children thay thế).
// `wide`: màn làm việc nhiều cột (kho sticker) dùng hết bề ngang, lề 16px trên điện thoại.
export default function SettingsWrapper({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
    return (
        <div className={`flex flex-col w-full h-full m-0 pb-8 pt-4 overflow-auto bg-n-surface-1 ${wide ? 'px-4 md:px-6' : 'px-6'}`}>
            <div className={`flex items-start w-full mx-auto ${wide ? 'max-w-[1600px]' : 'max-w-5xl'}`}>{children}</div>
        </div>
    );
}
