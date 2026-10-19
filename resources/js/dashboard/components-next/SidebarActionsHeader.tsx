import Button from 'dashboard/components-next/button/Button';
import { t } from '../../i18n';

// Port từ components-next/SidebarActionsHeader.vue.
interface SidebarActionsHeaderProps {
    title: string;
    buttons?: { key: string; icon: string; tooltip?: string }[];
    onClick?: (key: string) => void;
    onClose: () => void;
}

export default function SidebarActionsHeader({ title, buttons = [], onClick, onClose }: SidebarActionsHeaderProps) {
    return (
        <div className="flex items-center justify-between px-4 py-2 h-12">
            <div className="flex items-center justify-between gap-2 flex-1">
                <span className="font-medium text-sm text-n-slate-12">{title}</span>
                <div className="flex items-center">
                    {buttons.map(button => (
                        <Button key={button.key} title={button.tooltip} icon={button.icon} ghost sm onClick={() => onClick?.(button.key)} />
                    ))}
                    <Button title={t('GENERAL.CLOSE')} icon="i-lucide-x" ghost sm onClick={onClose} />
                </div>
            </div>
        </div>
    );
}
