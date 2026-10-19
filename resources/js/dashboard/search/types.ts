import type { MessageAttachment } from 'dashboard/components-next/message/helpers/attachments';
import type { SearchRecordKind } from './store';

// Kiểu bản ghi trả về từ /api/v1/accounts/{id}/search* (đã camelize ở api.ts).
export interface SearchContact {
    id: number;
    name: string;
    email: string | null;
    phoneNumber: string | null;
    identifier: string | null;
    additionalAttributes: Record<string, unknown> | null;
    lastActivityAt: number | null;
    thumbnail?: string;
}

export interface SearchInbox {
    id: number;
    channelId: number;
    name: string;
    channelType: string;
}

export interface SearchAgent {
    id: number;
    availableName: string;
    email: string;
    name: string;
    role: string;
}

export interface SearchConversation {
    id: number;
    accountId: number;
    createdAt: number;
    message: Record<string, unknown>;
    contact: SearchContact | Record<string, never>;
    inbox: SearchInbox | Record<string, never>;
    agent: SearchAgent | Record<string, never>;
    additionalAttributes?: Record<string, unknown> | null;
    // Tên thành viên nhóm khớp từ khoá; null khi hội thoại ra vì lý do khác.
    matchedMemberName?: string | null;
}

export interface SearchMessage {
    id: number;
    content: string | null;
    inboxId: number;
    conversationId: number;
    private: boolean;
    createdAt: number;
    contentType?: string;
    contentAttributes?: Record<string, unknown> | null;
    sender?: { name?: string } | null;
    attachments?: MessageAttachment[];
}

// Một tệp khớp từ khoá, kèm tin chứa nó.
export interface SearchFile {
    id: number;
    messageId: number;
    fileType: string;
    extension?: string | null;
    contentType?: string | null;
    dataUrl: string | null;
    thumbUrl?: string;
    fileSize?: number | null;
    fallbackTitle?: string | null;
    fileName: string | null;
    createdAt: number | null;
    message: SearchMessage;
}

export interface SearchArticle {
    id: number;
    title: string;
    locale: string;
    content: string | null;
    description?: string | null;
    slug: string;
    portalSlug: string;
    accountId: number;
    categoryName: string | null;
    status: string;
    updatedAt: number;
}

export type SearchTab = 'all' | SearchRecordKind;

export interface SearchDateRange {
    type: string | null;
    from: number | null;
    to: number | null;
}

export interface SearchFilterState {
    from: string | null;
    in: number | null;
    dateRange: SearchDateRange;
}
