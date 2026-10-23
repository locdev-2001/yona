import { ChevronRight, Menu, Moon, Search, Sun } from '@admin/components/icons';
import { useTheme } from '@admin/components/ThemeProvider';
import { useSidebar } from '@admin/components/ui/sidebar';
import { PreviewButton, SearchField } from '../design-preview/components';
import { useDesignCopy } from '../design-preview/copy';
import { NotificationCenter } from '../design-preview/notification-center';
import { useConsoleLabels } from '../labels';
import { useActiveConsoleNavigation } from './navigation';

const retainNotificationSkeleton = () => {};

export default function ConsoleHeader({ onOpenSearch }: { onOpenSearch: (query?: string) => void }) {
    const { group: currentGroup, item: currentItem } = useActiveConsoleNavigation();
    const label = useConsoleLabels();
    const { copy: previewCopy } = useDesignCopy();
    const { theme, setTheme } = useTheme();
    const { openMobile, setOpenMobile } = useSidebar();
    return (
        <header className="preview-topbar">
            <div className="topbar-breadcrumb">
                <PreviewButton appearance="ghost" className="mobile-menu" aria-label={label('open_menu')} aria-expanded={openMobile} onClick={() => setOpenMobile(!openMobile)}><Menu /></PreviewButton>
                {currentGroup?.label && currentGroup.label !== currentItem?.label && <><span>{currentGroup.label}</span><ChevronRight /></>}
                <strong aria-current="page">{currentItem?.label ?? label('console_name')}</strong>
            </div>
            <div className="topbar-actions">
                <SearchField className="global-search" label={label('search')} placeholder={label('search_shortcut_hint')} clearLabel={label('clear_search')} value="" onChange={onOpenSearch} onClick={() => onOpenSearch()} onKeyDown={event => { if (event.key === 'Enter') onOpenSearch(); }} shortcut />
                <PreviewButton appearance="ghost" className="mobile-menu" aria-label={label('search')} onClick={() => onOpenSearch()}><Search /></PreviewButton>
                <PreviewButton appearance="ghost" aria-label={theme === 'dark' ? previewCopy.chuyen_sang_giao_dien_sang : previewCopy.chuyen_sang_giao_dien_toi} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                    {theme === 'dark' ? <Sun /> : <Moon />}
                </PreviewButton>
                <NotificationCenter entries={[]} loading onRead={retainNotificationSkeleton} onReadAll={retainNotificationSkeleton} onArchive={retainNotificationSkeleton} onDecision={retainNotificationSkeleton} />
            </div>
        </header>
    );
}
