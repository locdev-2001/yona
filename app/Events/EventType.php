<?php

namespace App\Events;

// Port từ refs/chatwoot/lib/events/types.rb — giá trị là tên event Chatwoot
// (quyết định #6), cũng là `broadcastAs()` client Echo nhận. Bỏ CAPTAIN_* và
// COPILOT_* (enterprise).
enum EventType: string
{
    case ACCOUNT_CREATED = 'account.created';
    case ACCOUNT_CACHE_INVALIDATED = 'account.cache_invalidated';

    case CAMPAIGN_TRIGGERED = 'campaign.triggered';

    case WEBWIDGET_TRIGGERED = 'webwidget.triggered';

    case CONVERSATION_CREATED = 'conversation.created';
    case CONVERSATION_UPDATED = 'conversation.updated';
    case CONVERSATION_DELETED = 'conversation.deleted';
    case CONVERSATION_READ = 'conversation.read';
    case CONVERSATION_BOT_HANDOFF = 'conversation.bot_handoff';
    case CONVERSATION_OPENED = 'conversation.opened';
    case CONVERSATION_RESOLVED = 'conversation.resolved';
    case CONVERSATION_STATUS_CHANGED = 'conversation.status_changed';
    case CONVERSATION_CONTACT_CHANGED = 'conversation.contact_changed';
    case CONVERSATION_UNREAD_COUNT_CHANGED = 'conversation.unread_count_changed';
    case ASSIGNEE_CHANGED = 'assignee.changed';
    case TEAM_CHANGED = 'team.changed';
    case CONVERSATION_TYPING_ON = 'conversation.typing_on';
    case CONVERSATION_TYPING_OFF = 'conversation.typing_off';
    case CONVERSATION_MENTIONED = 'conversation.mentioned';

    case MESSAGE_CREATED = 'message.created';
    case FIRST_REPLY_CREATED = 'first.reply.created';
    case REPLY_CREATED = 'reply.created';
    case MESSAGE_UPDATED = 'message.updated';

    case CONTACT_CREATED = 'contact.created';
    case CONTACT_UPDATED = 'contact.updated';
    case CONTACT_MERGED = 'contact.merged';
    case CONTACT_DELETED = 'contact.deleted';

    case INBOX_CREATED = 'inbox.created';
    case INBOX_UPDATED = 'inbox.updated';

    case NOTIFICATION_CREATED = 'notification.created';
    case NOTIFICATION_DELETED = 'notification.deleted';
    case NOTIFICATION_UPDATED = 'notification.updated';

    case AGENT_ADDED = 'agent.added';
    case AGENT_REMOVED = 'agent.removed';

    // Không nằm trong types.rb: RoomChannel#broadcast_presence bắn chuỗi thô
    // 'presence.update' — đưa vào enum để có định danh (§0.6).
    case PRESENCE_UPDATE = 'presence.update';

    // Tên method listener: 'message.created' → 'message_created' (Events::Base#method_name).
    public function methodName(): string
    {
        return str_replace('.', '_', $this->value);
    }
}
