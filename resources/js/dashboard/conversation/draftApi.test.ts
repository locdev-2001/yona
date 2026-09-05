import { beforeEach, describe, expect, it } from 'vitest';

import { draftKey, getDraft, removeDraft, setDraft } from './draftApi';

describe('draftKey', () => {
    it('theo đúng khuôn draft-{conversationId}-{replyMode} của ReplyBox.vue', () => {
        expect(draftKey(4, 'reply')).toBe('draft-4-reply');
        expect(draftKey(4, 'note')).toBe('draft-4-note');
    });
});

describe('lưu / khôi phục / xóa nháp', () => {
    beforeEach(() => {
        removeDraft(draftKey(4, 'reply'));
        removeDraft(draftKey(4, 'note'));
    });

    it('trả chuỗi rỗng khi chưa có nháp', () => {
        expect(getDraft(draftKey(4, 'reply'))).toBe('');
    });

    it('lưu rồi đọc lại đúng nội dung', () => {
        setDraft(draftKey(4, 'reply'), 'đang soạn dở');
        expect(getDraft(draftKey(4, 'reply'))).toBe('đang soạn dở');
    });

    it('mỗi chế độ soạn giữ nháp riêng', () => {
        setDraft(draftKey(4, 'reply'), 'trả lời');
        setDraft(draftKey(4, 'note'), 'ghi chú');

        expect(getDraft(draftKey(4, 'reply'))).toBe('trả lời');
        expect(getDraft(draftKey(4, 'note'))).toBe('ghi chú');
    });

    it('ghi xuống localStorage dưới khóa draftMessages', () => {
        setDraft(draftKey(4, 'reply'), 'còn đây sau khi tải lại');

        const stored = JSON.parse(window.localStorage.getItem('draftMessages') || '{}');
        expect(stored['draft-4-reply']).toBe('còn đây sau khi tải lại');
    });

    it('xóa nháp thì đọc lại rỗng', () => {
        setDraft(draftKey(4, 'reply'), 'sắp gửi');
        removeDraft(draftKey(4, 'reply'));

        expect(getDraft(draftKey(4, 'reply'))).toBe('');
        expect(JSON.parse(window.localStorage.getItem('draftMessages') || '{}')['draft-4-reply']).toBeUndefined();
    });
});
