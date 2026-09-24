import { describe, expect, it } from 'vitest';

import { summarizeForwardResults } from './forwardResultSummary';

describe('summarizeForwardResults', () => {
    it('tất cả thành công; một đích thì kèm mã hội thoại để mở', () => {
        expect(summarizeForwardResults([{ conversation_id: 45, ok: true }])).toEqual({
            kind: 'success',
            okCount: 1,
            total: 1,
            firstError: null,
            singleTargetId: 45,
        });
        expect(
            summarizeForwardResults([
                { conversation_id: 45, ok: true },
                { conversation_id: 46, ok: true },
            ]).singleTargetId,
        ).toBeNull();
    });

    it('một phần thành công: lấy lỗi đầu tiên', () => {
        expect(
            summarizeForwardResults([
                { conversation_id: 45, ok: true },
                { conversation_id: 46, ok: false, code: 'capability_not_supported', error: 'Hộp thư SMS không gửi được ảnh.' },
                { conversation_id: 47, ok: false, code: 'target_not_found', error: 'Không tìm thấy' },
            ]),
        ).toEqual({ kind: 'partial', okCount: 1, total: 3, firstError: 'Hộp thư SMS không gửi được ảnh.', singleTargetId: null });
    });

    it('tất cả hỏng', () => {
        expect(summarizeForwardResults([{ conversation_id: 46, ok: false, error: 'Lỗi' }])).toEqual({
            kind: 'failed',
            okCount: 0,
            total: 1,
            firstError: 'Lỗi',
            singleTargetId: null,
        });
    });

    it('mảng rỗng coi như chưa chuyển tiếp được', () => {
        expect(summarizeForwardResults([])).toEqual({
            kind: 'failed',
            okCount: 0,
            total: 0,
            firstError: null,
            singleTargetId: null,
        });
    });
});
