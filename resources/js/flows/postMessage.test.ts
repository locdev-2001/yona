import { afterEach, describe, expect, it, vi } from 'vitest';

import { isEmbedded, notifyClose, notifySubmitted } from './postMessage';

// Hợp đồng cố định với Sheet của widget: `yona-flow:submitted`/`yona-flow:close`
// gửi tới CHÍNH origin của trang (Sheet luôn mở từ cùng domain Yona), và chỉ khi
// trang thật sự chạy trong iframe — mở trực tiếp (link Zalo/SMS) thì không có gì để báo.
const embedInIframe = () => {
    Object.defineProperty(window, 'top', { value: {}, configurable: true });
};

const restoreTop = () => {
    Object.defineProperty(window, 'top', { value: window.self, configurable: true });
};

afterEach(() => {
    restoreTop();
    vi.restoreAllMocks();
});

describe('postMessage với widget', () => {
    it('không gửi gì khi mở trực tiếp (không trong iframe)', () => {
        const postMessage = vi.spyOn(window.parent, 'postMessage');

        expect(isEmbedded()).toBe(false);

        notifySubmitted(42);
        notifyClose();

        expect(postMessage).not.toHaveBeenCalled();
    });

    it('gửi yona-flow:submitted kèm message_id tới đúng origin khi trong iframe', () => {
        embedInIframe();
        const postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});

        expect(isEmbedded()).toBe(true);

        notifySubmitted(42);

        expect(postMessage).toHaveBeenCalledWith({ type: 'yona-flow:submitted', message_id: 42 }, window.location.origin);
    });

    it('gửi yona-flow:close không kèm message_id khi trong iframe', () => {
        embedInIframe();
        const postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});

        notifyClose();

        expect(postMessage).toHaveBeenCalledWith({ type: 'yona-flow:close' }, window.location.origin);
    });
});
