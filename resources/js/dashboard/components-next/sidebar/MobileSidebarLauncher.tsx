import Icon from 'dashboard/components-next/icon/Icon';

// Port từ sidebar/MobileSidebarLauncher.vue
interface MobileSidebarLauncherProps {
    isMobileSidebarOpen: boolean;
    onToggle: () => void;
}

export default function MobileSidebarLauncher({ isMobileSidebarOpen, onToggle }: MobileSidebarLauncherProps) {
    return (
        <button
            id="mobile-sidebar-launcher"
            type="button"
            className="fixed bottom-4 ltr:left-4 rtl:right-4 z-50 flex md:hidden items-center justify-center size-10 rounded-full bg-n-solid-2 border border-n-weak shadow-lg text-n-slate-11"
            onClick={onToggle}
        >
            <Icon icon={isMobileSidebarOpen ? 'i-lucide-x' : 'i-lucide-menu'} className="size-5" />
        </button>
    );
}
