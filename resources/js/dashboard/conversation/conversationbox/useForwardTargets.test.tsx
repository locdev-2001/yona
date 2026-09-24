import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from 'dashboard/helper/apiClient';

import { fetchForwardTargets } from '../forwardApi';
import type { ForwardTarget, ForwardTargetsResponse } from '../forwardApi';
import { FORWARD_SEARCH_DEBOUNCE_MS, useForwardTargets } from './useForwardTargets';

vi.mock('../forwardApi', () => ({ fetchForwardTargets: vi.fn() }));

const fetchTargetsMock = vi.mocked(fetchForwardTargets);

function target(id: number, name: string): ForwardTarget {
    return {
        id,
        status: 'open',
        last_activity_at: 1756707112,
        inbox: { id: 3, name: 'Zalo Shop', channel_type: 'Channel::Zalo' },
        contact: { id: id + 100, name },
        forwardable: true,
        code: null,
        reason: null,
        missing_capabilities: [],
    };
}

function respond(targets: ForwardTarget[], maxTargets = 10): ForwardTargetsResponse {
    return { max_targets: maxTargets, payload: targets };
}

const renderTargets = (query: string) =>
    renderHook((props: { query: string }) => useForwardTargets({ accountId: 1, conversationId: 4, messageId: 9, ...props }), {
        initialProps: { query },
    });

async function flushDebounce() {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(FORWARD_SEARCH_DEBOUNCE_MS);
    });
}

describe('useForwardTargets', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        fetchTargetsMock.mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('gõ nhanh ba ký tự chỉ tạo một request sau khi ngừng gõ', async () => {
        fetchTargetsMock.mockResolvedValue(respond([target(45, 'Chị Lan')], 7));
        const { result, rerender } = renderTargets('');

        rerender({ query: 'L' });
        rerender({ query: 'La' });
        rerender({ query: 'Lan' });
        await flushDebounce();

        expect(fetchTargetsMock).toHaveBeenCalledTimes(1);
        expect(fetchTargetsMock).toHaveBeenCalledWith(1, 4, 9, 'Lan');
        expect(result.current.status).toBe('ready');
        expect(result.current.targets.map(item => item.id)).toEqual([45]);
        expect(result.current.maxTargets).toBe(7);
    });

    it('bỏ response đến muộn của từ khoá cũ', async () => {
        let resolveOld: (value: ForwardTargetsResponse) => void = () => undefined;
        fetchTargetsMock
            .mockImplementationOnce(() => new Promise(resolve => (resolveOld = resolve)))
            .mockResolvedValueOnce(respond([target(46, 'Anh Bình')]));
        const { result, rerender } = renderTargets('Lan');

        await flushDebounce();
        rerender({ query: 'Bình' });
        await flushDebounce();
        await act(async () => resolveOld(respond([target(45, 'Chị Lan')])));

        expect(result.current.targets.map(item => item.id)).toEqual([46]);
    });

    it('422 → blocked kèm câu của máy chủ', async () => {
        fetchTargetsMock.mockRejectedValue(
            new ApiError(422, { error: 'Loại tin này chưa chuyển tiếp được.' }),
        );
        const { result } = renderTargets('');

        await flushDebounce();

        expect(result.current.status).toBe('blocked');
        expect(result.current.error).toBe('Loại tin này chưa chuyển tiếp được.');
    });

    it('lỗi mạng → error; gọi reload thì tải lại', async () => {
        fetchTargetsMock.mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce(respond([target(45, 'Chị Lan')]));
        const { result } = renderTargets('');

        await flushDebounce();
        expect(result.current.status).toBe('error');

        act(() => result.current.reload());
        await flushDebounce();

        expect(fetchTargetsMock).toHaveBeenCalledTimes(2);
        expect(result.current.status).toBe('ready');
        expect(result.current.targets).toHaveLength(1);
    });
});
