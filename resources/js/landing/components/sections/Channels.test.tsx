import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ChannelItem from 'dashboard/components/widgets/ChannelItem';
import { t } from '../../../i18n';
import { locales } from '../../../i18n/generated';
import type { LandingStrings } from '../../config';
import { Channels, LIVE_CHANNELS, UPCOMING_CHANNELS } from './Channels';

const STRINGS: LandingStrings['channels'] = {
    eyebrow: 'Khách nhắn ở đâu, Yona nhận ở đó',
    coming_soon: 'Sắp có: :channels.',
    note: 'Thêm kênh là thêm driver, không phải xây lại hệ thống.',
};

type WizardState = 'live' | 'coming_soon' | 'unavailable';

// Mọi kênh mà bước tạo hộp thư biết tên, lấy từ chính bản dịch của bước đó thay
// vì chép tay một danh sách thứ ba có thể lệch với cả hai bên.
function knownChannelKeys(): string[] {
    const inboxMgmt = locales.vi.INBOX_MGMT as { ADD: { AUTH: { CHANNEL: Record<string, unknown> } } };

    return Object.keys(inboxMgmt.ADD.AUTH.CHANNEL).map(key => key.toLowerCase());
}

// Hỏi thẳng thẻ kênh của bước tạo hộp thư: bấm được là đang chạy, có nhãn
// "Sắp có" là sắp có. Không đọc hằng số bên trong nó, vì thứ người dùng thấy
// mới là thứ trang công khai phải khớp.
function wizardState(key: string): WizardState {
    const { unmount } = render(
        <ChannelItem channel={{ key, title: key, description: '', icon: 'i-woot-api' }} onChannelItemClick={() => {}} />,
    );
    const button = screen.getByRole('button');
    const state: WizardState = !button.hasAttribute('disabled')
        ? 'live'
        : screen.queryByText(t('CHANNEL_SELECTOR.COMING_SOON'), { exact: false })
          ? 'coming_soon'
          : 'unavailable';
    unmount();

    return state;
}

describe('dải kênh trang chủ', () => {
    it('bày đúng những kênh người dùng tạo được ngay ở bước tạo hộp thư', () => {
        const liveInWizard = knownChannelKeys().filter(key => wizardState(key) === 'live');

        expect(LIVE_CHANNELS.map(({ key }) => key).sort()).toEqual(liveInWizard.sort());
    });

    it('chỉ gọi là sắp có những kênh bước tạo hộp thư cũng đang để sắp có', () => {
        for (const { key } of UPCOMING_CHANNELS) {
            expect(wizardState(key), key).toBe('coming_soon');
        }
    });

    it('không đặt kênh sắp có vào lưới kênh đang chạy', () => {
        render(<Channels strings={STRINGS} />);

        const grid = screen.getAllByRole('listitem').map(item => item.textContent);

        expect(grid).toEqual(LIVE_CHANNELS.map(({ label }) => label));
        expect(grid).not.toContain('Messenger');
        expect(grid).not.toContain('TikTok');
        expect(screen.getByText(/Sắp có: Messenger, Instagram\./)).toBeInTheDocument();
    });
});
