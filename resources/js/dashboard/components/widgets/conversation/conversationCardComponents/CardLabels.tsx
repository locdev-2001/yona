import { useCallback, useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import Label from 'dashboard/components/ui/Label';
import FluentIcon from 'shared/components/FluentIcon/FluentIcon';
import { useLabelsList } from 'dashboard/composables/useLabelsList';
import { activeLabels as resolveActiveLabels } from 'dashboard/conversation/labelHelpers';
import { t } from '../../../../../i18n';
import type { DashboardPageProps } from '../../../../types';

// Port từ widgets/conversation/conversationCardComponents/CardLabels.vue.
// Directive `v-resize` thay bằng ResizeObserver; slot `before` (SLACardLabel) là
// EE nên không port ⇒ beforeSlot luôn 0 như nhánh không có slot của bản gốc.
interface CardLabelsProps {
    conversationLabels: string[];
    className?: string;
}

const LABEL_GAP = 8;

export default function CardLabels({ conversationLabels, className = '' }: CardLabelsProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountLabels = useLabelsList(currentAccount.id);
    const activeLabels = resolveActiveLabels(accountLabels, conversationLabels);

    const [showAllLabels, setShowAllLabels] = useState(false);
    const [showExpandLabelButton, setShowExpandLabelButton] = useState(false);
    const [labelPosition, setLabelPosition] = useState(-1);
    const labelContainerRef = useRef<HTMLDivElement>(null);

    const computeVisibleLabelPosition = useCallback(() => {
        const container = labelContainerRef.current;
        if (!container) return;

        const labels = Array.from(container.querySelectorAll<HTMLElement>('.label'));
        let labelOffset = 0;
        let lastVisibleIndex = -1;
        let hasHiddenLabel = false;

        labels.forEach((label, index) => {
            labelOffset += label.offsetWidth + LABEL_GAP;

            if (labelOffset < container.clientWidth) {
                lastVisibleIndex = index;
            } else {
                hasHiddenLabel = labels.length > 1;
            }
        });

        setShowExpandLabelButton(hasHiddenLabel);
        if (lastVisibleIndex !== -1) setLabelPosition(lastVisibleIndex);
    }, []);

    useEffect(() => {
        computeVisibleLabelPosition();
    }, [computeVisibleLabelPosition, activeLabels.length, showAllLabels]);

    useEffect(() => {
        const container = labelContainerRef.current;
        if (!container) return undefined;

        const observer = new ResizeObserver(() => computeVisibleLabelPosition());
        observer.observe(container);
        return () => observer.disconnect();
    }, [computeVisibleLabelPosition]);

    return (
        <div ref={labelContainerRef} className={className}>
            {activeLabels.length ? (
                <div
                    className={`flex items-end flex-shrink min-w-0 gap-y-1 ${
                        showAllLabels ? 'h-auto overflow-visible flex-row flex-wrap' : ''
                    }`.trim()}
                >
                    {activeLabels.map((label, index) => (
                        <Label
                            key={label.id}
                            title={label.title}
                            description={label.description ?? ''}
                            color={label.color}
                            variant="smooth"
                            small
                            className={`!mb-0 max-w-[calc(100%-0.5rem)] ${
                                !showAllLabels && index > labelPosition ? 'invisible absolute' : ''
                            }`.trim()}
                        />
                    ))}
                    {showExpandLabelButton ? (
                        <button
                            type="button"
                            title={
                                showAllLabels
                                    ? t('CONVERSATION.CARD.HIDE_LABELS')
                                    : t('CONVERSATION.CARD.SHOW_LABELS')
                            }
                            className="h-5 py-0 px-1 flex-shrink-0 mr-6 ml-0 rtl:ml-6 rtl:mr-0 rtl:rotate-180 text-n-slate-11 border-n-strong dark:border-n-strong"
                            onClick={event => {
                                event.stopPropagation();
                                setShowAllLabels(current => !current);
                            }}
                        >
                            <FluentIcon icon={showAllLabels ? 'chevron-left' : 'chevron-right'} size={12} />
                        </button>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
