// Port từ store/modules/draftMessages.js + shared/helpers/localStorage.js.
// Bản dashboard của Chatwoot v4.17.1 giữ bản nháp trong localStorage (khóa
// `draftMessages`), KHÔNG gọi `…/conversations/{id}/draft_messages` — endpoint
// đó dành cho client khác. Bản port giữ đúng nguồn đó để hành vi trùng oracle.

const DRAFT_MESSAGES_STORE = 'draftMessages';

type DraftRecords = Record<string, string>;

function readStore(): DraftRecords {
    try {
        const raw = window.localStorage.getItem(DRAFT_MESSAGES_STORE);
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : null;
        return parsed && typeof parsed === 'object' ? (parsed as DraftRecords) : {};
    } catch {
        return {};
    }
}

let records: DraftRecords = readStore();

function writeStore(): void {
    try {
        window.localStorage.setItem(DRAFT_MESSAGES_STORE, JSON.stringify(records));
        window.localStorage.setItem(`${DRAFT_MESSAGES_STORE}:ts`, Date.now().toString());
    } catch {
        /* quota/private mode — bỏ qua như LocalStorage.set gốc */
    }
}

// editorStateId / getDraftKey của ReplyBox.vue.
export function draftKey(conversationId: number, replyMode: string): string {
    return `draft-${conversationId}-${replyMode}`;
}

export function getDraft(key: string): string {
    return records[key] || '';
}

export function setDraft(key: string, message: string): void {
    records = { ...records, [key]: message };
    writeStore();
}

export function removeDraft(key: string): void {
    if (!(key in records)) return;
    const { [key]: _removed, ...rest } = records;
    records = rest;
    writeStore();
}
