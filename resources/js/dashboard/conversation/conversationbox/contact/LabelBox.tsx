import { useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import Label from 'dashboard/components/ui/Label';
import NextButton from 'dashboard/components-next/button/Button';
import LabelDropdown from 'shared/components/ui/label/LabelDropdown';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';
import { fetchLabels, useLabelsList } from 'dashboard/composables/useLabelsList';
import { activeLabels, titlesAfterAdd, titlesAfterRemove } from 'dashboard/conversation/labelHelpers';
import { updateConversationLabels } from 'dashboard/conversation/labelApi';
import { t } from '../../../../i18n';
import type { DashboardPageProps } from '../../../types';
import { useConversation } from '../../ConversationContext';

// Port từ routes/dashboard/conversation/labels/LabelBox.vue +
// composables/useConversationLabels.js + shared/components/ui/dropdown/AddLabel.vue.
// Store `conversationLabels` của gốc chỉ mirror `conversation.labels` (được seed
// từ payload danh sách và cập nhật lại ở mỗi `updateConversation`) → ở đây đọc
// thẳng hội thoại đang chọn, chỉ giữ bản lạc quan cục bộ trong lúc POST.
export default function LabelBox() {
    const { currentAccount, currentAccountUser } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const { selectedConversation } = useConversation();
    const conversationId = selectedConversation?.id ?? 0;
    const savedOnServer = selectedConversation?.labels ?? [];

    const accountLabels = useLabelsList(accountId);
    const [savedLabels, setSavedLabels] = useState<string[]>(savedOnServer);
    const [showSearchDropdownLabel, setShowSearchDropdownLabel] = useState(false);
    const labelWrapRef = useRef<HTMLDivElement>(null);

    const serverLabelKey = savedOnServer.join(',');
    useEffect(() => {
        setSavedLabels(savedOnServer.slice());
        // Chỉ đồng bộ lại khi hội thoại hoặc danh sách nhãn trên máy chủ đổi.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId, serverLabelKey]);

    const closeDropdownLabel = () => setShowSearchDropdownLabel(false);
    const toggleLabels = () => setShowSearchDropdownLabel(current => !current);

    useKeyboardEvents({
        KeyL: {
            action: event => {
                event.preventDefault();
                toggleLabels();
            },
        },
        Escape: {
            action: () => {
                if (showSearchDropdownLabel) closeDropdownLabel();
            },
            allowOnFocusedInput: true,
        },
    });

    useEffect(() => {
        const onClickAway = (event: MouseEvent) => {
            if (!labelWrapRef.current?.contains(event.target as Node)) closeDropdownLabel();
        };
        document.addEventListener('click', onClickAway);
        return () => document.removeEventListener('click', onClickAway);
    }, []);

    const onUpdateLabels = (nextLabels: string[]) => {
        const previousLabels = savedLabels;
        setSavedLabels(nextLabels);

        updateConversationLabels(accountId, conversationId, nextLabels)
            .then(setSavedLabels)
            .catch(() => setSavedLabels(previousLabels));
    };

    const conversationLabels = activeLabels(accountLabels, savedLabels);
    const addLabelToConversation = (title: string) => onUpdateLabels(titlesAfterAdd(conversationLabels, title));
    const removeLabelFromConversation = (title: string) =>
        onUpdateLabels(titlesAfterRemove(conversationLabels, title));

    return (
        <div className="sidebar-labels-wrap mb-0">
            <div className="w-full contact-conversation--list">
                <div ref={labelWrapRef} className="label-wrap flex flex-wrap relative leading-6">
                    <NextButton
                        faded
                        xs
                        icon="i-lucide-plus"
                        className="mb-0.5 ltr:mr-0.5 rtl:ml-0.5 !rounded-[4px]"
                        label={t('CONTACT_PANEL.LABELS.CONVERSATION.ADD_BUTTON')}
                        onClick={toggleLabels}
                    />
                    {conversationLabels.map(label => (
                        <Label
                            key={label.id}
                            title={label.title}
                            description={label.description ?? ''}
                            showClose
                            color={label.color}
                            variant="smooth"
                            className="max-w-[calc(100%-0.5rem)]"
                            onRemove={removeLabelFromConversation}
                        />
                    ))}
                    <div
                        className={`${
                            showSearchDropdownLabel ? 'block visible' : 'hidden invisible'
                        } border rounded-lg bg-n-alpha-3 top-6 backdrop-blur-[100px] absolute w-full shadow-lg border-n-strong dark:border-n-strong p-2 box-border z-[9999]`}
                    >
                        {showSearchDropdownLabel ? (
                            <LabelDropdown
                                accountId={accountId}
                                accountLabels={accountLabels}
                                selectedLabels={savedLabels}
                                allowCreation={currentAccountUser.role === 'administrator'}
                                onAdd={label => addLabelToConversation(label.title)}
                                onRemove={removeLabelFromConversation}
                                onLabelCreated={() => fetchLabels(accountId, { force: true })}
                            />
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
