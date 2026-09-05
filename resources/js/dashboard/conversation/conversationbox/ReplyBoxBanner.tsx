import { usePage } from '@inertiajs/react';

import { useAlert } from 'dashboard/composables/useAlert';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';
import Banner from './Banner';

// Port từ widgets/conversation/ReplyBoxBanner.vue. Nhánh bot handoff chưa port
// (AgentBot thuộc nhóm D) — chỉ dựng nhánh tự nhận hội thoại như bản gốc.
export default function ReplyBoxBanner({
    message,
    isOnPrivateNote,
}: {
    message: string;
    isOnPrivateNote: boolean;
}) {
    const { selectedConversation, assignAgent } = useConversation();
    const { auth } = usePage<DashboardPageProps>().props;
    const currentUser = auth.user!;

    if (!selectedConversation) return null;

    const assignee = selectedConversation.meta.assignee;
    const isUserTyping = message !== '' && !isOnPrivateNote;
    const needsAssignment = !assignee || assignee.id !== currentUser.id;

    if (!isUserTyping || !needsAssignment) return null;

    const onClickSelfAssign = async () => {
        try {
            await assignAgent(
                { id: currentUser.id, name: currentUser.name, thumbnail: currentUser.avatar_url ?? '' },
                'User',
            );
            useAlert(t('CONVERSATION.CHANGE_AGENT'));
        } catch {
            useAlert(t('CONVERSATION.CHANGE_AGENT_FAILED'));
        }
    };

    return (
        <Banner
            colorScheme="secondary"
            className="mx-2 mb-2 rounded-lg !py-2"
            bannerMessage={t('CONVERSATION.NOT_ASSIGNED_TO_YOU')}
            hasActionButton
            actionButtonVariant="ghost"
            actionButtonLabel={t('CONVERSATION.ASSIGN_TO_ME')}
            onPrimaryAction={onClickSelfAssign}
        />
    );
}
