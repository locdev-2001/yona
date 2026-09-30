import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setLocale, t } from '../../../i18n';
import { DEFAULT_AGENT_ALERT_PREFERENCE } from 'dashboard/alertSound/preference';
import { ALERT_TONES } from 'shared/alertSound/alertTones';
import AlertSoundPreferences from './AlertSoundPreferences';

const audioSources: string[] = [];
const play = vi.fn();

beforeEach(() => {
    setLocale('vi');
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
});

afterEach(() => vi.unstubAllGlobals());

describe('AlertSoundPreferences', () => {
    it('liệt kê đủ các âm dùng chung và đổi âm thì báo tuỳ chọn mới', () => {
        const onChange = vi.fn();
        render(<AlertSoundPreferences value={DEFAULT_AGENT_ALERT_PREFERENCE} onChange={onChange} />);

        const toneSelect = screen.getByLabelText(t('ALERT_SOUND.TONE_LABEL'), { selector: 'select' }) as HTMLSelectElement;
        expect(Array.from(toneSelect.options).map(option => option.value)).toEqual([...ALERT_TONES]);

        fireEvent.change(toneSelect, { target: { value: 'bell' } });
        expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_AGENT_ALERT_PREFERENCE, tone: 'bell' });
    });

    it('nút nghe thử phát đúng âm đang chọn', () => {
        render(<AlertSoundPreferences value={{ ...DEFAULT_AGENT_ALERT_PREFERENCE, tone: 'magic' }} onChange={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: t('ALERT_SOUND.PREVIEW') }));

        expect(audioSources).toEqual(['/audio/alerts/magic.mp3']);
        expect(play).toHaveBeenCalledTimes(1);
    });

    it('chọn "chỉ hội thoại giao cho tôi" và "chỉ khi không mở tab"', () => {
        const onChange = vi.fn();
        render(<AlertSoundPreferences value={DEFAULT_AGENT_ALERT_PREFERENCE} onChange={onChange} />);

        fireEvent.change(screen.getByLabelText(t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.SOUND.SCOPE')), {
            target: { value: 'assigned' },
        });
        expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_AGENT_ALERT_PREFERENCE, scope: 'assigned' });

        fireEvent.click(screen.getByRole('switch', { name: t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.SOUND.ONLY_WHEN_HIDDEN') }));
        expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_AGENT_ALERT_PREFERENCE, only_when_hidden: true });
    });

    it('tắt âm báo thì ẩn các lựa chọn chi tiết', () => {
        const onChange = vi.fn();
        const { rerender } = render(<AlertSoundPreferences value={DEFAULT_AGENT_ALERT_PREFERENCE} onChange={onChange} />);

        fireEvent.click(screen.getByRole('switch', { name: t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.SOUND.TITLE') }));
        expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_AGENT_ALERT_PREFERENCE, enabled: false });

        rerender(<AlertSoundPreferences value={{ ...DEFAULT_AGENT_ALERT_PREFERENCE, enabled: false }} onChange={onChange} />);
        expect(screen.queryByRole('button', { name: t('ALERT_SOUND.PREVIEW') })).toBeNull();
    });
});
