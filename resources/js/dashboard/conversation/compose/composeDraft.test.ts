import { describe, expect, it } from 'vitest';

import { defaultMemo } from '../composer/SendCardMenu/cardPayloads';
import {
    EMPTY_COMPOSE_DRAFT,
    canComposeIn,
    detectNewRecipient,
    draftBlocker,
    optionsForNewRecipient,
    resolveTarget,
} from './composeDraft';
import type { ChannelOption, ComposeDraft, ComposeInbox } from './composeDraft';

const EMAIL: ComposeInbox = {
    id: 16,
    name: 'shop@yona.vn',
    channel_type: 'Channel::Email',
    capabilities: ['conversation_outbound_start', 'profile_email'],
};
const ZALO: ComposeInbox = { id: 3, name: 'Zalo shop', channel_type: 'Channel::Zalo', capabilities: ['outbound_sticker'] };
const option = (inbox: ComposeInbox, available = true): ChannelOption => ({ inbox, source_id: 'x', available, reason: null });

describe('ô Đến nhận ra địa chỉ để tạo liên hệ mới', () => {
    it.each([
        ['Khach@Example.com', { address: 'khach@example.com', addressType: 'email' }],
        ['0901 234 567', { address: '0901234567', addressType: 'phone' }],
        ['+84 (90) 123-4567', { address: '+84901234567', addressType: 'phone' }],
    ])('%s', (query, expected) => {
        expect(detectNewRecipient(query)).toEqual({ kind: 'new', ...expected });
    });

    it.each(['Lan', 'khach@', '12345', 'a b@c'])('không coi %s là địa chỉ', query => {
        expect(detectNewRecipient(query)).toBeNull();
    });
});

describe('kênh cho địa chỉ mới', () => {
    it('email mới chỉ đi qua hộp mở hội thoại chủ động được và biết email của khách', () => {
        const options = optionsForNewRecipient([EMAIL, ZALO], { kind: 'new', address: 'a@b.vn', addressType: 'email' });

        expect(options).toEqual([{ inbox: EMAIL, source_id: 'a@b.vn', available: true, reason: null }]);
    });

    it('số điện thoại mới không mượn hộp chỉ biết email', () => {
        expect(optionsForNewRecipient([EMAIL, ZALO], { kind: 'new', address: '0901234567', addressType: 'phone' })).toEqual([]);
    });

    it('hộp mất kết nối hiện mờ kèm lý do', () => {
        const [only] = optionsForNewRecipient([{ ...EMAIL, reauthorization_required: true }], {
            kind: 'new',
            address: 'a@b.vn',
            addressType: 'email',
        });

        expect(only).toMatchObject({ available: false, reason: 'reauthorization_required' });
    });
});

describe('chọn kênh', () => {
    it('chỉ một kênh gửi được thì tự chọn, kể cả khi có kênh mờ bên cạnh', () => {
        expect(resolveTarget([option(EMAIL), option(ZALO, false)], null)?.inbox.id).toBe(EMAIL.id);
    });

    it('nhiều kênh gửi được thì để người dùng chọn', () => {
        expect(resolveTarget([option(EMAIL), option(ZALO)], null)).toBeNull();
    });

    it('giữ kênh đang chọn khi danh sách nạp lại', () => {
        expect(resolveTarget([option(EMAIL), option(ZALO)], option(ZALO))?.inbox.id).toBe(ZALO.id);
    });
});

describe('khi nào bản nháp gửi được', () => {
    const ready: ComposeDraft = {
        ...EMPTY_COMPOSE_DRAFT,
        recipient: { kind: 'new', address: 'a@b.vn', addressType: 'email' },
        target: option(EMAIL),
        subject: 'Báo giá',
        emailCheck: { status: 'deliverable' },
    };

    it('đủ người nhận, kênh, chủ đề thì gửi được', () => {
        expect(draftBlocker(ready)).toBeNull();
        expect(canComposeIn(ready)).toBe(true);
    });

    it('email không nhận thư thì chặn cả ô soạn', () => {
        const draft = { ...ready, emailCheck: { status: 'undeliverable' as const, reason: 'domain_not_found' } };
        expect(draftBlocker(draft)).toBe('COMPOSE_NEW_CONVERSATION.DRAFT.ERRORS.EMAIL_UNDELIVERABLE');
        expect(canComposeIn(draft)).toBe(false);
    });

    it('thiếu chủ đề thư vẫn soạn được, chỉ chặn lúc gửi', () => {
        const draft = { ...ready, subject: '  ' };
        expect(draftBlocker(draft)).toBe('COMPOSE_NEW_CONVERSATION.DRAFT.ERRORS.SUBJECT_REQUIRED');
        expect(canComposeIn(draft)).toBe(true);
    });

    it('kênh mờ hoặc đang gửi thì khoá ô soạn', () => {
        expect(canComposeIn({ ...ready, target: option(EMAIL, false) })).toBe(false);
        expect(canComposeIn({ ...ready, isSending: true })).toBe(false);
    });
});

describe('nội dung chuyển khoản mặc định', () => {
    it('bản nháp chưa có mã hội thoại thì bỏ trống chỗ mã', () => {
        const account = { memo_template: 'DH {ma_hoi_thoai} shop' } as Parameters<typeof defaultMemo>[0];
        expect(defaultMemo(account, null)).toBe('DH shop');
        expect(defaultMemo(account, 42)).toBe('DH 42 shop');
    });
});
