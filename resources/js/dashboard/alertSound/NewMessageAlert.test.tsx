import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { emitter } from 'shared/helpers/emitter';
import { MESSAGE_TYPES } from 'dashboard/conversation/constants';
import { CLAIM_SETTLE_MS } from './alertTabLock';
import { MIN_ALERT_INTERVAL_MS } from './shouldPlayAlert';

const { pageProps } = vi.hoisted(() => ({ pageProps: { current: {} as Record<string, unknown> } }));
vi.mock('@inertiajs/react', () => ({ usePage: () => ({ props: pageProps.current }) }));

import NewMessageAlert from './NewMessageAlert';

const ME = 7;
const audioSources: string[] = [];
const play = vi.fn();

const incoming = (id: number, extra: Record<string, unknown> = {}) => ({
    id,
    message_type: MESSAGE_TYPES.INCOMING,
    private: false,
    conversation: { assignee_id: ME },
    ...extra,
});

const deliver = async (payload: Record<string, unknown>) => {
    await act(async () => {
        emitter.emit('message.created', payload);
        await vi.advanceTimersByTimeAsync(CLAIM_SETTLE_MS + 1);
    });
};

beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    audioSources.length = 0;
    play.mockReset().mockResolvedValue(undefined);
    vi.stubGlobal(
        'Audio',
        vi.fn(function (this: { play: typeof play; currentTime: number }, source: string) {
            audioSources.push(source);
            this.play = play;
            this.currentTime = 0;
        }),
    );
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    pageProps.current = { auth: { user: { id: ME, ui_settings: { notification_sound: { enabled: true, tone: 'ping', scope: 'all', only_when_hidden: false } } } } };
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('NewMessageAlert', () => {
    it('tin khách tới sau tương tác đầu tiên thì kêu đúng âm đã chọn, tin dồn trong khoảng giãn cách chỉ kêu một lần', async () => {
        render(<NewMessageAlert />);
        document.dispatchEvent(new Event('pointerdown'));

        await deliver(incoming(1));
        await deliver(incoming(2));

        expect(audioSources.at(-1)).toBe('/audio/alerts/ping.mp3');
        expect(play).toHaveBeenCalledTimes(1);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(MIN_ALERT_INTERVAL_MS);
        });
        await deliver(incoming(3));
        expect(play).toHaveBeenCalledTimes(2);
    });

    it('ghi chú nội bộ và tin mình gửi không kêu', async () => {
        render(<NewMessageAlert />);
        document.dispatchEvent(new Event('pointerdown'));

        await deliver(incoming(11, { private: true }));
        await deliver(incoming(12, { message_type: MESSAGE_TYPES.OUTGOING }));

        expect(play).not.toHaveBeenCalled();
    });
});
