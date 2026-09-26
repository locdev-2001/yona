import { t } from '../../../../../i18n';
import { WIDGET_BUILDER_SECTIONS } from '../types';
import type { WidgetBuilderSectionId } from '../types';

const SECTION_LABEL_KEYS: Record<WidgetBuilderSectionId, string> = {
    appearance: 'WIDGET_BUILDER.NAV.APPEARANCE',
    home: 'WIDGET_BUILDER.NAV.HOME',
    channels: 'WIDGET_BUILDER.NAV.CHANNELS',
    capture: 'WIDGET_BUILDER.NAV.CAPTURE',
    invite: 'WIDGET_BUILDER.NAV.INVITE',
    ai: 'WIDGET_BUILDER.NAV.AI',
    embed: 'WIDGET_BUILDER.NAV.EMBED',
};

interface BuilderNavProps {
    activeSection: WidgetBuilderSectionId;
    onSelect: (section: WidgetBuilderSectionId) => void;
    orientation?: 'vertical' | 'horizontal';
    className?: string;
}

// Nav trái là neo cuộn tới đúng thẻ ở cột giữa (không phải tab thay nội dung):
// mọi thẻ luôn nằm sẵn trong DOM nên bản nháp không bao giờ mất khi đổi mục.
export default function BuilderNav({ activeSection, onSelect, orientation = 'vertical', className = '' }: BuilderNavProps) {
    const isVertical = orientation === 'vertical';

    return (
        <nav
            aria-label={t('WIDGET_BUILDER.NAV.ARIA_LABEL')}
            className={`flex gap-0.5 ${isVertical ? 'flex-col w-56' : 'overflow-x-auto'} ${className}`}
        >
            {WIDGET_BUILDER_SECTIONS.map(section => {
                const isActive = section === activeSection;

                return (
                    <button
                        key={section}
                        type="button"
                        aria-current={isActive ? 'true' : undefined}
                        className={`rounded-lg px-3 py-2 text-body-main text-start whitespace-nowrap transition-colors ${
                            isActive
                                ? 'bg-n-solid-3 text-n-slate-12 font-medium'
                                : 'text-n-slate-11 hover:bg-n-alpha-1 hover:text-n-slate-12'
                        }`}
                        onClick={() => onSelect(section)}
                    >
                        {t(SECTION_LABEL_KEYS[section])}
                    </button>
                );
            })}
        </nav>
    );
}
