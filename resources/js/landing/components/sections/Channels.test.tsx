import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { LandingStrings } from '../../config';
import { Channels, LIVE_CHANNELS } from './Channels';

const STRINGS: LandingStrings['channels'] = {
    eyebrow: 'Khách nhắn ở đâu, Yona nhận ở đó',
    coming_soon: 'Sắp có: :channels.',
    note: 'Thêm kênh là thêm driver, không phải xây lại hệ thống.',
};

describe('dải kênh trang chủ', () => {
    it('không đặt kênh sắp có vào lưới kênh đang chạy', () => {
        render(<Channels strings={STRINGS} />);

        const grid = screen.getAllByRole('listitem').map(item => item.textContent);

        expect(grid).toEqual(LIVE_CHANNELS.map(({ label }) => label));
        expect(grid).not.toContain('Messenger');
        expect(grid).not.toContain('TikTok');
        expect(screen.getByText(/Sắp có: Messenger, Instagram\./)).toBeInTheDocument();
    });
});
