import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, getText, postJson } from './apiClient';

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

function setXsrfCookie(token: string) {
    document.cookie = `XSRF-TOKEN=${encodeURIComponent(token)}; path=/`;
}

const sentXsrfTokens = (url: string) =>
    fetchMock.mock.calls
        .filter(([input]) => String(input) === url)
        .map(([, init]) => (init?.headers as Record<string, string>)['X-XSRF-TOKEN']);

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    setXsrfCookie('old');
});

afterEach(() => vi.unstubAllGlobals());

describe('apiClient gặp token CSRF hết hạn (419)', () => {
    it('gửi lại bằng token mới mà máy chủ vừa cấp khi hỏi phiên', async () => {
        let replyCount = 0;
        fetchMock.mockImplementation(async input => {
            if (String(input) === '/api/v1/profile') {
                setXsrfCookie('new');
                return new Response('{}', { status: 200 });
            }
            replyCount += 1;
            return replyCount === 1
                ? new Response('', { status: 419 })
                : new Response(JSON.stringify({ id: 7 }), { status: 200 });
        });

        const saved = await postJson<{ id: number }>('/api/v1/accounts/1/labels', { title: 'vip' });

        expect(saved).toEqual({ id: 7 });
        expect(sentXsrfTokens('/api/v1/accounts/1/labels')).toEqual(['old', 'new']);
    });

    it('getText cũng được phục hồi như request JSON', async () => {
        let replyCount = 0;
        fetchMock.mockImplementation(async input => {
            if (String(input) === '/api/v1/profile') {
                setXsrfCookie('new');
                return new Response('{}', { status: 200 });
            }
            replyCount += 1;
            return replyCount === 1 ? new Response('', { status: 419 }) : new Response('a,b', { status: 200 });
        });

        await expect(getText('/api/v2/accounts/1/reports/agents.csv')).resolves.toBe('a,b');
        expect(sentXsrfTokens('/api/v2/accounts/1/reports/agents.csv')).toEqual(['old', 'new']);
    });

    it('lỗi không liên quan phiên vẫn ném ApiError như cũ', async () => {
        fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: 'invalid' }), { status: 422 }));

        await expect(postJson('/api/v1/accounts/1/labels', {})).rejects.toBeInstanceOf(ApiError);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
