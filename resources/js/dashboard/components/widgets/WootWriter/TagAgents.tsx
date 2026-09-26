import { useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import EmojiIcon from 'dashboard/components-next/emoji-icon-picker/EmojiIcon';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';
import { useTeamsList } from 'dashboard/conversation/conversationbox/contact/useTeamsList';
import { useMentionableAgents } from 'dashboard/conversation/mentionApi';
import { t } from '../../../../i18n';
import type { AvailabilityStatus, DashboardPageProps } from '../../../types';
import CaretAnchoredPicker from './CaretAnchoredPicker';
import type { CaretPosition, PickerCloseReason } from './CaretAnchoredPicker';
import { buildMentionItems, countMentionItems } from './mentionHelpers';
import type { MentionFilter, MentionPickerItem, MentionRecord } from './mentionHelpers';

// Port từ dashboard/components/widgets/conversation/TagAgents.vue.
// Đặt cạnh picker trong WootWriter/ theo ranh giới file của B11 (bản gốc để ở
// widgets/conversation/) — xem note B11.

interface TagAgentsProps {
    caretPosition: CaretPosition | null;
    searchKey: string;
    onSelectAgent: (record: MentionRecord) => void;
    onClose: (reason: PickerCloseReason) => void;
    onRemoveTrigger: () => void;
}

export default function TagAgents({
    caretPosition,
    searchKey,
    onSelectAgent,
    onClose,
    onRemoveTrigger,
}: TagAgentsProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const agents = useMentionableAgents(accountId);
    const teams = useTeamsList(accountId);

    const [searchQuery, setSearchQuery] = useState(searchKey);
    const [activeFilter, setActiveFilter] = useState<MentionFilter>('all');

    const agentsGroupLabel = t('CONVERSATION.MENTION.AGENTS');
    const teamsGroupLabel = t('CONVERSATION.MENTION.TEAMS');

    const items = useMemo(
        () =>
            buildMentionItems({
                agents,
                teams,
                searchKey: searchQuery,
                filter: activeFilter,
                agentsGroupLabel,
                teamsGroupLabel,
            }),
        [agents, teams, searchQuery, activeFilter, agentsGroupLabel, teamsGroupLabel],
    );

    const counts = useMemo(() => countMentionItems(agents, teams, searchQuery), [agents, teams, searchQuery]);

    const tabs: { label: string; value: MentionFilter; count?: number }[] = [
        { label: t('CONVERSATION.PICKER.MENTION.FILTER.ALL'), value: 'all' },
        { label: agentsGroupLabel, value: 'agents', count: counts.agents },
        { label: teamsGroupLabel, value: 'teams', count: counts.teams },
    ];

    // Mũi tên thuộc về con trỏ ngay khi có từ khoá để di chuyển trong đó.
    const navigateFilters = (event: KeyboardEvent) => {
        if (searchQuery) return;

        const step = event.key === 'ArrowRight' ? 1 : -1;
        const index = tabs.findIndex(tab => tab.value === activeFilter);
        const next = tabs[index + step];
        if (!next) return;

        event.preventDefault();
        setActiveFilter(next.value);
    };

    useKeyboardEvents({
        ArrowLeft: { action: navigateFilters, allowOnFocusedInput: true },
        ArrowRight: { action: navigateFilters, allowOnFocusedInput: true },
    });

    const availabilityLabel = (status: string | undefined): string => {
        const labels: Record<string, string> = {
            online: t('PROFILE_SETTINGS.FORM.AVAILABILITY.STATUS.ONLINE'),
            busy: t('PROFILE_SETTINGS.FORM.AVAILABILITY.STATUS.BUSY'),
            offline: t('PROFILE_SETTINGS.FORM.AVAILABILITY.STATUS.OFFLINE'),
        };
        return status ? (labels[status] ?? '') : '';
    };

    // Bản gốc dùng cùng cặp EmojiIcon/Avatar cho slot `leading` (24px, không chấm
    // trạng thái) và khối xem trước (40px, có chấm trạng thái).
    const renderRecordIcon = (item: MentionPickerItem, size: number, iconClass: string, showStatus: boolean) => {
        const record = item.record;
        return record.type === 'team' && 'icon' in record && record.icon ? (
            <EmojiIcon value={record.icon} color={record.icon_color} className={iconClass} />
        ) : (
            <Avatar
                src={'thumbnail' in record ? record.thumbnail : undefined}
                name={item.label}
                size={size}
                status={
                    showStatus && 'availability_status' in record
                        ? ((record.availability_status as AvailabilityStatus | undefined) ?? null)
                        : null
                }
                roundedFull
                className="flex-shrink-0"
            />
        );
    };

    return (
        <CaretAnchoredPicker<MentionPickerItem>
            caretPosition={caretPosition}
            items={items}
            search={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t('CONVERSATION.PICKER.MENTION.SEARCH_PLACEHOLDER')}
            emptyLabel={t('COMBOBOX.EMPTY_STATE')}
            onSelect={item => onSelectAgent(item.record)}
            onClose={onClose}
            onRemoveTrigger={onRemoveTrigger}
            renderFilters={() => (
                <div role="tablist" className="flex items-center min-w-0 gap-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.value}
                            type="button"
                            role="tab"
                            aria-selected={activeFilter === tab.value}
                            className={`flex items-center min-w-0 gap-1 px-2 py-1 text-xs font-medium transition-colors rounded-md ${
                                activeFilter === tab.value
                                    ? 'bg-n-alpha-1 text-n-slate-12'
                                    : 'text-n-slate-11 hover:bg-n-alpha-1'
                            }`}
                            onClick={() => setActiveFilter(tab.value)}
                        >
                            <span className="truncate">{tab.label}</span>
                            {tab.count !== undefined ? (
                                <span className="text-n-slate-10">{tab.count}</span>
                            ) : null}
                        </button>
                    ))}
                </div>
            )}
            renderLeading={item => renderRecordIcon(item, 24, 'flex-shrink-0 text-xl size-6', false)}
            renderPreview={item =>
                item ? (
                    <div className="flex flex-col gap-3 px-4 py-3">
                        <div className="flex items-start gap-3">
                            {renderRecordIcon(item, 40, 'flex-shrink-0 text-3xl size-10', true)}
                            <div className="flex flex-col min-w-0 gap-0.5">
                                <span className="text-sm font-medium truncate text-n-slate-12">{item.label}</span>
                                {item.subtitle ? (
                                    <span className="text-xs break-words text-n-slate-11">{item.subtitle}</span>
                                ) : null}
                            </div>
                        </div>
                        {item.record.type === 'user' ? (
                            <div className="flex flex-col gap-2 text-xs">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-n-slate-10">
                                        {t('CONVERSATION.PICKER.MENTION.AVAILABILITY')}
                                    </span>
                                    <span className="capitalize text-n-slate-12">
                                        {availabilityLabel(
                                            'availability_status' in item.record
                                                ? item.record.availability_status
                                                : undefined,
                                        )}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-n-slate-10">
                                        {t('CONVERSATION.PICKER.MENTION.ROLE')}
                                    </span>
                                    <span className="capitalize text-n-slate-12">
                                        {'role' in item.record ? item.record.role : ''}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 text-xs">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-n-slate-10">
                                        {t('CONVERSATION.PICKER.MENTION.AUTO_ASSIGN')}
                                    </span>
                                    <span className="text-n-slate-12">
                                        {'allow_auto_assign' in item.record && item.record.allow_auto_assign
                                            ? t('CONVERSATION.PICKER.MENTION.ENABLED')
                                            : t('CONVERSATION.PICKER.MENTION.DISABLED')}
                                    </span>
                                </div>
                                {'is_member' in item.record && item.record.is_member ? (
                                    <div className="text-n-slate-11">
                                        {t('CONVERSATION.PICKER.MENTION.YOU_ARE_A_MEMBER')}
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </div>
                ) : null
            }
        />
    );
}
