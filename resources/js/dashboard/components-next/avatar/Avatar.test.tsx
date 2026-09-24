import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Avatar from './Avatar';
import type { ChannelPlatform } from 'shared/constants/channelPlatform';

const ZALO: ChannelPlatform = { key: 'zalo', name: 'Zalo', logo_url: '/brand-assets/platforms/zalo.svg' };

const badgeOf = (container: HTMLElement) => container.querySelector('[data-testid="avatar-platform-badge"]');

describe('avatar kèm badge nền tảng', () => {
    it('không truyền platform thì không có badge', () => {
        const { container } = render(<Avatar name="Trang" src="/trang.png" size={32} />);

        expect(badgeOf(container)).toBeNull();
    });

    it('có platform thì badge vẽ logo nền tảng', () => {
        const { container } = render(<Avatar name="Trang" src="/trang.png" size={32} platform={ZALO} />);
        const logo = badgeOf(container)?.querySelector('img');

        expect(logo?.getAttribute('src')).toBe(ZALO.logo_url);
        expect(logo?.getAttribute('alt')).toBe('Zalo');
        expect(badgeOf(container)?.getAttribute('title')).toBe('Zalo');
    });

    it('cỡ badge theo cỡ avatar, kẹp trong khoảng đọc được', () => {
        const sizeAt = (size: number) =>
            (badgeOf(render(<Avatar name="A" size={size} platform={ZALO} />).container) as HTMLElement).style.width;

        expect(sizeAt(24)).toBe('12px');
        expect(sizeAt(32)).toBe('14px');
        expect(sizeAt(40)).toBe('18px');
        expect(sizeAt(96)).toBe('20px');
    });

    it('avatar quá nhỏ thì bỏ badge', () => {
        const { container } = render(<Avatar name="Trang" size={16} platform={ZALO} />);

        expect(badgeOf(container)).toBeNull();
    });

    it('có cả trạng thái và badge thì chấm trạng thái lên góc trên', () => {
        const { container } = render(<Avatar name="Trang" size={32} status="online" platform={ZALO} />);
        const statusDot = container.querySelector('.bg-n-teal-10') as HTMLElement;

        expect(badgeOf(container)).not.toBeNull();
        expect(statusDot.style.top).toBe('0px');
    });

    it('không có badge thì chấm trạng thái giữ góc dưới như cũ', () => {
        const { container } = render(<Avatar name="Trang" size={32} status="online" />);
        const statusDot = container.querySelector('.bg-n-teal-10') as HTMLElement;

        expect(statusDot.style.top).not.toBe('0px');
    });

    it('ảnh avatar vẫn là ảnh đầu tiên trong DOM', () => {
        const { container } = render(<Avatar name="Trang" src="/trang.png" size={32} platform={ZALO} />);

        expect(container.querySelector('img')?.getAttribute('src')).toBe('/trang.png');
    });

    it('logo tải lỗi thì hiện icon dự phòng thay vì ô vỡ', () => {
        const { container } = render(<Avatar name="Trang" size={32} platform={ZALO} />);
        const logo = badgeOf(container)?.querySelector('img') as HTMLImageElement;

        fireEvent.error(logo);

        expect(badgeOf(container)?.querySelector('img')).toBeNull();
        expect(badgeOf(container)?.querySelector('.i-lucide-message-circle')).not.toBeNull();
    });
});
