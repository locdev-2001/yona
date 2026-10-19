// Shape payload của API: _conversation partial + _message + push_event_data.

export interface ContactMeta {
    id: number;
    name: string | null;
    email?: string | null;
    phone_number?: string | null;
    identifier?: string | null;
    thumbnail?: string;
    availability_status?: string;
    blocked?: boolean;
    additional_attributes?: Record<string, unknown>;
    custom_attributes?: Record<string, unknown>;
    type?: string;
}

export interface AgentMeta {
    id: number;
    name: string;
    email?: string | null;
    available_name?: string;
    availability_status?: string;
    thumbnail?: string;
    avatar_url?: string;
    type?: string;
}

export interface TeamMeta {
    id: number;
    name: string;
    description?: string | null;
    allow_auto_assign?: boolean;
    icon?: string;
    icon_color?: string;
    account_id?: number;
    is_member?: boolean;
}

export interface MessageSender {
    id: number;
    name: string | null;
    type: 'user' | 'contact' | 'agent_bot' | 'captain_assistant';
    thumbnail?: string;
    available_name?: string;
    availability_status?: string;
    avatar_url?: string;
    email?: string | null;
}

export interface MessageSourceLink {
    url: string;
    platform: string;
}

export interface ConversationMessage {
    id: number;
    content: string | null;
    inbox_id?: number | null;
    conversation_id: number;
    message_type: number;
    content_type: string;
    status: string | null;
    content_attributes: Record<string, unknown>;
    /** Dòng xem trước máy chủ dựng cho tin có cấu trúc; null với tin thường. */
    preview_text?: string | null;
    created_at: number;
    /** Giờ gửi trên nền tảng (unix giây); thứ tự và giờ hiển thị theo đây. Payload cũ có thể thiếu. */
    platform_sent_at?: number;
    private: boolean;
    source_id: string | null;
    /** Đường mở tin tại nền tảng gốc (thư trong Gmail…); vắng khi kênh không khai. */
    source_link?: MessageSourceLink | null;
    // additional_attributes.senderName/senderAvatarUrl: tin từ tích hợp ngoài
    // (Slack…) không có sender nhưng vẫn có tên người gửi.
    additional_attributes?: { senderName?: string; senderAvatarUrl?: string } & Record<string, unknown>;
    sender?: MessageSender;
    sender_type?: string | null;
    sender_id?: number | null;
    echo_id?: string;
    attachments?: Array<Record<string, unknown>>;
}

export interface ConversationMeta {
    // Người bên kia của hội thoại 1-1 (với nhóm: tên và ảnh của nhóm).
    sender: ContactMeta & { username?: string | null };
}

// Tab của danh sách: hội thoại đang trò chuyện, hoặc tin chờ từ người lạ.
export type ChatListTab = 'all' | 'requests';

// Tình trạng của chính người xem trong hội thoại.
export type ChatMemberStatus = 'active' | 'pending';

export type GroupRole = 'owner' | 'admin' | 'member';

// Việc người xem được làm trong nhóm, máy chủ tính theo vai trò (GroupPolicy).
export interface GroupAbilities {
    edit_info: boolean;
    add_members: boolean;
    manage_invite_link: boolean;
    change_roles: boolean;
    remove_members: boolean;
    dissolve: boolean;
}

export interface GroupMemberPerson {
    id: number;
    name: string;
    username: string | null;
    thumbnail: string;
    role: GroupRole;
}

export interface Conversation {
    id: number;
    uuid: string;
    kind: 'direct' | 'group';
    title: string | null;
    description?: string | null;
    meta: ConversationMeta;
    member_count: number;
    my_role: GroupRole | null;
    abilities: GroupAbilities | null;
    member_status: ChatMemberStatus;
    can_reply: boolean;
    blocked_by_me: boolean;
    // Lần hoạt động cuối của người bên kia (1-1), null khi họ ẩn.
    counterpart_last_seen_at?: number | null;
    muted: boolean;
    pinned?: boolean;
    unread_count: number;
    last_read_message_id: number | null;
    // Tin tới id này người kia đã xem (hội thoại 1-1).
    counterpart_last_read_message_id: number | null;
    last_non_activity_message: ConversationMessage | null;
    last_activity_at: number;
    timestamp: number;
    created_at: number;
}

export interface ConversationListMeta {
    request_count: number;
    has_more: boolean;
}
