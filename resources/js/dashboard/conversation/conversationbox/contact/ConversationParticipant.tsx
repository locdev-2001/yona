import { useCallback, useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import NextButton from 'dashboard/components-next/button/Button';
import ThumbnailGroup from 'dashboard/components-next/avatar/ThumbnailGroup';
import MultiselectDropdownItems from 'shared/components/ui/MultiselectDropdownItems';
import type { MultiselectOption } from 'shared/components/ui/MultiselectDropdownItems';
import Spinner from 'shared/components/Spinner';
import { useAgentsList } from 'dashboard/composables/useAgentsList';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';

import { t } from '../../../../i18n';
import type { DashboardPageProps } from '../../../types';
import { useConversation } from '../../ConversationContext';
import { fetchParticipants, updateParticipants } from '../../panelApi';
import type { AgentMeta } from '../../types';
import {
    isParticipating,
    remainingParticipantCount,
    thumbnailParticipants,
    toggleParticipant,
} from './participantSelection';

// Port từ routes/dashboard/conversation/ConversationParticipant.vue.
// Store `conversationWatchers` thay bằng state cục bộ + panelApi (GET/PATCH
// participants). Tooltip v-tooltip.left của nút bánh răng dùng `title` như các
// nút khác của yona.
export default function ConversationParticipant() {
    const { auth } = usePage<DashboardPageProps>().props;
    const { accountId, conversationId } = useConversation();
    const { agentsList } = useAgentsList(false);

    const [participants, setParticipants] = useState<AgentMeta[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [showDropDown, setShowDropDown] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const loadParticipants = useCallback(() => {
        setIsFetching(true);
        return fetchParticipants(accountId, conversationId)
            .then(payload => setParticipants(payload))
            .catch(() => undefined)
            .finally(() => setIsFetching(false));
    }, [accountId, conversationId]);

    useEffect(() => {
        void loadParticipants();
    }, [loadParticipants]);

    useEffect(() => {
        if (!showDropDown) return undefined;
        const handleClickAway = (event: globalThis.MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) setShowDropDown(false);
        };
        document.addEventListener('mousedown', handleClickAway);

        return () => document.removeEventListener('mousedown', handleClickAway);
    }, [showDropDown]);

    const applyParticipants = (nextParticipants: AgentMeta[]) => {
        setParticipants(nextParticipants);
        updateParticipants(
            accountId,
            conversationId,
            nextParticipants.map(participant => participant.id),
        )
            .then(() => useAlert(t('CONVERSATION_PARTICIPANTS.API.SUCCESS_MESSAGE')))
            .catch(error =>
                useAlert(parseApiErrorMessage(error) ?? t('CONVERSATION_PARTICIPANTS.API.ERROR_MESSAGE')),
            )
            .finally(() => void loadParticipants());
    };

    const currentUserId = auth.user?.id ?? 0;
    const thumbnailList = thumbnailParticipants(participants);
    const moreAgentCount = remainingParticipantCount(participants);
    const moreThumbnailsText =
        moreAgentCount > 1
            ? t('CONVERSATION_PARTICIPANTS.REMANING_PARTICIPANTS_TEXT', { count: moreAgentCount })
            : t('CONVERSATION_PARTICIPANTS.REMANING_PARTICIPANT_TEXT', { count: 1 });
    const totalWatchersText =
        participants.length > 1
            ? t('CONVERSATION_PARTICIPANTS.TOTAL_PARTICIPANTS_TEXT', { count: participants.length })
            : t('CONVERSATION_PARTICIPANTS.TOTAL_PARTICIPANT_TEXT', { count: 1 });

    return (
        <div ref={containerRef} className="relative">
            <div className="flex justify-between">
                <div className="flex justify-between w-full mb-1">
                    <div>
                        {participants.length ? (
                            <p className="m-0 text-sm total-watchers">
                                {isFetching ? <Spinner size="tiny" /> : null} {totalWatchersText}
                            </p>
                        ) : (
                            <p className="m-0 text-sm text-n-slate-10">
                                {t('CONVERSATION_PARTICIPANTS.NO_PARTICIPANTS_TEXT')}
                            </p>
                        )}
                    </div>
                    <NextButton
                        slate
                        ghost
                        sm
                        icon="i-lucide-settings"
                        className="relative -top-1"
                        title={t('CONVERSATION_PARTICIPANTS.ADD_PARTICIPANTS')}
                        onClick={() => setShowDropDown(true)}
                    />
                </div>
            </div>
            <div className="flex items-center justify-between">
                <ThumbnailGroup
                    moreThumbnailsText={moreThumbnailsText}
                    showMoreThumbnailsCount={moreAgentCount > 0}
                    usersList={thumbnailList}
                />
                {isParticipating(participants, currentUserId) ? (
                    <p className="m-0 text-sm text-n-slate-10">
                        {t('CONVERSATION_PARTICIPANTS.YOU_ARE_WATCHING')}
                    </p>
                ) : (
                    <NextButton
                        link
                        xs
                        icon="i-lucide-arrow-right"
                        className="!gap-1"
                        label={t('CONVERSATION_PARTICIPANTS.WATCH_CONVERSATION')}
                        onClick={() =>
                            applyParticipants([
                                ...participants,
                                {
                                    id: currentUserId,
                                    name: auth.user?.name ?? '',
                                    email: auth.user?.email,
                                    thumbnail: auth.user?.avatar_url,
                                },
                            ])
                        }
                    />
                )}
            </div>
            <div
                className={[
                    'border rounded-lg shadow-lg bg-n-alpha-3 absolute backdrop-blur-[100px] border-n-strong dark:border-n-strong p-2 z-[9999] box-border top-8 w-full',
                    showDropDown ? 'block visible' : 'hidden invisible',
                ].join(' ')}
            >
                <div className="flex items-center justify-between mb-1">
                    <h4 className="m-0 overflow-hidden text-sm whitespace-nowrap text-ellipsis text-n-slate-12">
                        {t('CONVERSATION_PARTICIPANTS.ADD_PARTICIPANTS')}
                    </h4>
                    <NextButton ghost slate xs icon="i-lucide-x" onClick={() => setShowDropDown(false)} />
                </div>
                <MultiselectDropdownItems
                    options={agentsList as MultiselectOption[]}
                    selectedItems={participants as MultiselectOption[]}
                    hasThumbnail
                    onSelect={option =>
                        applyParticipants(toggleParticipant(participants, option as unknown as AgentMeta))
                    }
                />
            </div>
        </div>
    );
}
