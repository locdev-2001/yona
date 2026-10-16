import Icon from 'dashboard/components-next/icon/Icon';
import { t } from '../../../i18n';

// Ô cuối của thanh tab điện thoại: mở ngăn kéo sidebar cho những gì không có tab riêng
// (chuông, hồ sơ, đổi tài khoản, Chiến dịch, Trung tâm trợ giúp). Số chưa đọc đã nằm
// trên tab Hộp thư nên ô này không lặp lại. Ngăn kéo rộng 200px nên ô này ở mép phải
// vẫn lộ ra để bấm đóng. `id` để ngăn kéo không coi cú bấm này là bấm ra ngoài.
interface MobileSidebarLauncherProps {
    isMobileSidebarOpen: boolean;
    onToggle: () => void;
}

export default function MobileSidebarLauncher({ isMobileSidebarOpen, onToggle }: MobileSidebarLauncherProps) {
    const label = t(isMobileSidebarOpen ? 'MOBILE_TAB_BAR.CLOSE_MENU' : 'MOBILE_TAB_BAR.MORE');

    return (
        <button
            id="mobile-sidebar-launcher"
            type="button"
            aria-expanded={isMobileSidebarOpen}
            className={`flex flex-col items-center justify-center gap-0.5 h-[59px] min-w-0 px-0.5 text-xs ${
                isMobileSidebarOpen ? 'text-n-blue-11 font-medium' : 'text-n-slate-11'
            }`}
            onClick={onToggle}
        >
            <Icon icon={isMobileSidebarOpen ? 'i-lucide-x' : 'i-lucide-menu'} className="size-5 shrink-0" />
            <span className="max-w-full truncate">{label}</span>
        </button>
    );
}
