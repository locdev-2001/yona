import { isProductFeatureVisible } from 'shared/helpers/productVisibility';
import { usePage } from '@inertiajs/react';

import { useAlert } from 'dashboard/composables/useAlert';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';
import { AGENT_BOT_ASSIGNEE_TYPE, STATUS_TYPE } from '../constants';
import Banner from './Banner';

// Port từ widgets/conversation/ReplyBoxBanner.vue.
export default function ReplyBoxBanner({
    message,
    isOnPrivateNote,
}: {
    message: string;
    isOnPrivateNote: boolean;
}) {
    const { selectedConversation, assignAgent, toggleStatus } = useConversation();
    const { auth } = usePage<DashboardPageProps>().props;
    const currentUser = auth.user!;

    if (!selectedConversation || !isProductFeatureVisible('conversationAssignment')) return null;

    const assignee = selectedConversation.meta.assignee;
    const isUserTyping = message !== '' && !isOnPrivateNote;
    const needsAssignment = !assignee || assignee.id !== currentUser.id;
    const isBotHandoff =
        selectedConversation.status === STATUS_TYPE.PENDING &&
        selectedConversation.meta.assignee_type === AGENT_BOT_ASSIGNEE_TYPE;

    const selfAssign = () =>
        assignAgent({ id: currentUser.id, name: currentUser.name, thumbnail: currentUser.avatar_url ?? '' }, 'User');

    const onClickSelfAssign = async () => {
        try {
            await selfAssign();
            useAlert(t('CONVERSATION.CHANGE_AGENT'));
        } catch {
            useAlert(t('CONVERSATION.CHANGE_AGENT_FAILED'));
        }
    };

    const onClickBotHandoff = async () => {
        try {
            await toggleStatus({ status: 'open' });
            await selfAssign();
            useAlert(t('CONVERSATION.BOT_HANDOFF_SUCCESS'));
        } catch {
            useAlert(t('CONVERSATION.BOT_HANDOFF_ERROR'));
        }
    };

    if (isBotHandoff) {
        return (
            <Banner
                colorScheme="secondary"
                className="mx-2 mb-2 rounded-lg !py-2"
                bannerMessage={t('CONVERSATION.BOT_HANDOFF_MESSAGE', {
                    assigneeName: assignee?.name || t('CONVERSATION.BOT_HANDOFF_FALLBACK_ASSIGNEE'),
                })}
                hasActionButton
                actionButtonVariant="ghost"
                actionButtonLabel={t('CONVERSATION.BOT_HANDOFF_ACTION')}
                onPrimaryAction={onClickBotHandoff}
            />
        );
    }

    if (!isUserTyping || !needsAssignment) return null;

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
