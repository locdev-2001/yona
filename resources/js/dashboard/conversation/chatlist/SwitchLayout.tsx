import { t } from '../../../i18n';
import NextButton from 'dashboard/components-next/button/Button';

// Port từ routes/dashboard/conversation/search/SwitchLayout.vue.
interface SwitchLayoutProps {
    isOnExpandedLayout?: boolean;
    onToggle: () => void;
}

export default function SwitchLayout({ isOnExpandedLayout = false, onToggle }: SwitchLayoutProps) {
    return (
        <NextButton
            title={t('CONVERSATION.SWITCH_VIEW_LAYOUT')}
            icon={isOnExpandedLayout ? 'i-lucide-arrow-left-to-line' : 'i-lucide-arrow-right-to-line'}
            slate
            xs
            faded
            className="flex-shrink-0 rtl:rotate-180 ltr:rotate-0 md:inline-flex hidden"
            onClick={onToggle}
        />
    );
}
