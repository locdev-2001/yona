import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import Avatar from './Avatar';
import type { ChannelPlatform } from 'shared/constants/channelPlatform';
import type { MessageAttachment } from 'dashboard/components-next/message/helpers/attachments';
import { t } from '../../../i18n';

vi.mock('dashboard/components/widgets/conversation/components/GalleryView', () => ({
    default: ({ attachment, onClose }: { attachment: MessageAttachment; onClose: () => void }) => (
        <div data-testid="gallery" data-src={attachment.data_url} data-name={String(attachment.sender?.name)}>
            <button type="button" onClick={onClose}>
                close
            </button>
        </div>
    ),
}));

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

describe('bấm avatar có ảnh để xem ảnh lớn', () => {
    const previewLabel = (name: string) => t('GALLERY_VIEW.VIEW_AVATAR', { name });

    // Trình xem nạp lười: lần import đầu phải biên dịch cả cây module, máy tải
    // nặng thì vượt thời gian chờ của findBy. Nạp sẵn ở đây (thời gian chờ của
    // hook) để lazy() trong test chỉ còn lấy module đã có.
    beforeAll(async () => {
        await import('./AvatarPreview');
    });

    it('avatar có ảnh là nút mở trình xem với đúng ảnh và tên', async () => {
        render(<Avatar name="Trang" src="/trang.png" previewable />);
        const trigger = screen.getByRole('button', { name: previewLabel('Trang') });

        expect(trigger.getAttribute('tabindex')).toBe('0');
        expect(trigger.className).toContain('cursor-zoom-in');

        fireEvent.click(trigger);
        const gallery = await screen.findByTestId('gallery');

        expect(gallery.getAttribute('data-src')).toBe('/trang.png');
        expect(gallery.getAttribute('data-name')).toBe('Trang');
    });

    it('bấm trong trình xem không lan lên phần tử cha của avatar', async () => {
        const onParentClick = vi.fn();
        render(
            <div onClick={onParentClick}>
                <Avatar name="Trang" src="/trang.png" previewable />
            </div>,
        );

        fireEvent.click(screen.getByRole('button', { name: previewLabel('Trang') }));
        fireEvent.click(await screen.findByText('close'));

        expect(onParentClick).not.toHaveBeenCalled();
        expect(screen.queryByTestId('gallery')).toBeNull();
    });

    it('Enter trên avatar mở trình xem', async () => {
        render(<Avatar name="Trang" src="/trang.png" previewable />);

        fireEvent.keyDown(screen.getByRole('button', { name: previewLabel('Trang') }), { key: 'Enter' });

        expect(await screen.findByTestId('gallery')).not.toBeNull();
    });

    it('avatar chữ viết tắt không bấm được', () => {
        const { container } = render(<Avatar name="Trang" previewable />);
        const avatar = container.querySelector('[role="img"]') as HTMLElement;

        fireEvent.click(avatar);

        expect(screen.queryByRole('button')).toBeNull();
        expect(avatar.getAttribute('tabindex')).toBeNull();
        expect(screen.queryByTestId('gallery')).toBeNull();
    });

    it('ảnh tải lỗi thì avatar thôi là nút', () => {
        const { container } = render(<Avatar name="Trang" src="/hong.png" previewable />);

        fireEvent.error(container.querySelector('img') as HTMLImageElement);

        expect(screen.queryByRole('button')).toBeNull();
    });

    it('không bật previewable thì avatar có ảnh vẫn chỉ là ảnh', () => {
        render(<Avatar name="Trang" src="/trang.png" />);

        expect(screen.queryByRole('button')).toBeNull();
        expect(screen.getByRole('img', { name: 'Trang' })).not.toBeNull();
    });
});
