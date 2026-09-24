import { beforeEach, describe, expect, it } from 'vitest';

import { getAuthToken, restoreAuthToken, setAuthToken, setWebsiteToken } from './client';

const WEBSITE_TOKEN = 'website-token';
const storedSession = () => JSON.parse(window.localStorage.getItem(`widget_session:${WEBSITE_TOKEN}`) ?? '{}');

beforeEach(() => {
    window.localStorage.clear();
    setWebsiteToken(WEBSITE_TOKEN);
    restoreAuthToken({ tokenFromUrl: '', resetId: 'reset-before-each-test' });
});

describe('lưu token phiên khách trong iframe widget', () => {
    it('token mới từ server được lưu theo website_token', () => {
        setAuthToken('token-from-config');

        expect(getAuthToken()).toBe('token-from-config');
        expect(storedSession().authToken).toBe('token-from-config');
    });

    it('token SDK gắn vào URL (cookie trang chủ) được ưu tiên hơn token đã lưu', () => {
        setAuthToken('stored-token');

        restoreAuthToken({ tokenFromUrl: 'cookie-token', resetId: '' });

        expect(getAuthToken()).toBe('cookie-token');
    });

    it('URL không mang token thì dùng token widget đã lưu', () => {
        setAuthToken('stored-token');

        restoreAuthToken({ tokenFromUrl: '', resetId: '' });

        expect(getAuthToken()).toBe('stored-token');
    });

    it('hộp thư khác không đọc được token của hộp thư này', () => {
        setAuthToken('stored-token');
        setWebsiteToken('another-website-token');

        restoreAuthToken({ tokenFromUrl: '', resetId: '' });

        expect(getAuthToken()).toBe('');
    });

    it('trình duyệt chặn bộ nhớ của iframe thì vẫn chạy bằng token trong bộ nhớ', () => {
        const storageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')!;
        Object.defineProperty(window, 'localStorage', {
            configurable: true,
            get: () => {
                throw new DOMException('blocked', 'SecurityError');
            },
        });

        try {
            expect(() => setAuthToken('token-from-config')).not.toThrow();
            expect(getAuthToken()).toBe('token-from-config');
            expect(() => restoreAuthToken({ tokenFromUrl: '', resetId: '' })).not.toThrow();
        } finally {
            Object.defineProperty(window, 'localStorage', storageDescriptor);
        }
    });
});

describe('cờ phiên mới từ SDK', () => {
    it('quên token đã lưu và token trong bộ nhớ', () => {
        setAuthToken('stored-token');

        restoreAuthToken({ tokenFromUrl: '', resetId: 'reset-1' });

        expect(getAuthToken()).toBe('');
        expect(storedSession().authToken).toBeUndefined();
    });

    it('mỗi mã cờ chỉ xoá một lần: iframe nạp lại cùng URL giữ phiên khách mới', () => {
        restoreAuthToken({ tokenFromUrl: '', resetId: 'reset-1' });
        setAuthToken('new-visitor-token');

        restoreAuthToken({ tokenFromUrl: '', resetId: 'reset-1' });

        expect(getAuthToken()).toBe('new-visitor-token');
    });
});
