import type { ReactElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import Avatar from './Avatar';
import type { ChannelPlatform } from 'shared/constants/channelPlatform';
import { generatedAvatarUri } from 'shared/avatar/generatedAvatarUri';
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

const ZALO: ChannelPlatform = { key: 'zalo', name: 'Zalo', logo_url: '/brand-assets/platforms/zalo.webp' };

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

    it('avatar hình khối phóng to ra bản SVG lớn cùng hình', async () => {
        render(<Avatar name="Trang" seed="contact:1" previewable />);

        fireEvent.click(screen.getByRole('button', { name: previewLabel('Trang') }));
        const gallery = await screen.findByTestId('gallery');

        expect(gallery.getAttribute('data-src')).toBe(generatedAvatarUri('contact:1', 480));
    });

    it('ảnh tải lỗi thì phóng to avatar hình khối thay cho ảnh hỏng', async () => {
        const { container } = render(<Avatar name="Trang" seed="contact:1" src="/hong.png" previewable />);

        fireEvent.error(container.querySelector('img') as HTMLImageElement);
        fireEvent.click(screen.getByRole('button', { name: previewLabel('Trang') }));

        expect((await screen.findByTestId('gallery')).getAttribute('data-src')).toMatch(/^data:image\/svg\+xml/);
    });

    it('icon người vô danh không bấm được', () => {
        render(<Avatar name="  " previewable />);

        expect(screen.queryByRole('button')).toBeNull();
    });

    it('không bật previewable thì avatar có ảnh vẫn chỉ là ảnh', () => {
        render(<Avatar name="Trang" src="/trang.png" />);

        expect(screen.queryByRole('button')).toBeNull();
        expect(screen.getByRole('img', { name: 'Trang' })).not.toBeNull();
    });
});

describe('avatar hình khối khi không có ảnh', () => {
    const generatedOf = (container: HTMLElement) => container.querySelector('[data-generated-avatar]') as HTMLElement | null;

    // Định danh dựng hình: cùng định danh là cùng hình dạng, màu và biểu cảm.
    const generatedIdentity = (element: ReactElement) =>
        generatedOf(render(element).container)?.getAttribute('data-generated-avatar');

    it('không có ảnh thì vẽ avatar hình khối, không còn chữ cái đầu', () => {
        const { container } = render(<Avatar name="Trang Lê" seed="contact:1" size={32} />);
        const generated = generatedOf(container);

        expect(generated?.querySelector('svg')).not.toBeNull();
        expect(generated?.getAttribute('aria-label')).toBe('Trang Lê');
        expect(container.textContent).toBe('');
    });

    it.each([
        ['cùng seed khác tên', { name: 'Trang', seed: 'contact:1' }, { name: 'Trang Lê (đã đổi tên)', seed: 'contact:1' }],
        ['không có seed thì theo tên', { name: 'Trang' }, { name: 'Trang' }],
    ])('%s ra cùng một hình', (_label, first, second) => {
        expect(generatedIdentity(<Avatar {...first} />)).toBe(generatedIdentity(<Avatar {...second} />));
    });

    it.each([
        ['khác seed', { name: 'Trang', seed: 'contact:1' }, { name: 'Trang', seed: 'contact:2' }],
        ['cùng id khác loại chủ thể', { name: 'Trang', seed: 'contact:1' }, { name: 'Trang', seed: 'user:1' }],
    ])('%s ra hình khác nhau', (_label, first, second) => {
        expect(generatedIdentity(<Avatar {...first} />)).not.toBe(generatedIdentity(<Avatar {...second} />));
    });

    it('ảnh tải lỗi thì rơi về avatar hình khối của đúng seed', () => {
        const { container } = render(<Avatar name="Trang" seed="contact:1" src="/hong.png" />);

        fireEvent.error(container.querySelector('img') as HTMLImageElement);

        expect(generatedOf(container)?.getAttribute('data-generated-avatar')).toBe('contact:1');
    });

    it.each([false, true])('chớp, liếc chỉ chạy khi nơi chứa bật animated=%s', animated => {
        const { container } = render(<Avatar name="Trang" seed="contact:1" animated={animated} />);

        expect(generatedOf(container)?.querySelector('.mo-always') !== null).toBe(animated);
    });

    it('có ảnh hợp lệ thì không vẽ avatar hình khối', () => {
        const { container } = render(<Avatar name="Trang" seed="contact:1" src="/trang.png" />);

        expect(generatedOf(container)).toBeNull();
    });

    it('icon riêng được ưu tiên hơn avatar hình khối', () => {
        const { container } = render(<Avatar name="Portal" seed="contact:1" iconName="i-lucide-building-2" />);

        expect(generatedOf(container)).toBeNull();
        expect(container.querySelector('.i-lucide-building-2')).not.toBeNull();
    });

    it('không tên, không seed, không ảnh thì là icon người vô danh', () => {
        const { container } = render(<Avatar name="  " />);

        expect(generatedOf(container)).toBeNull();
        expect(container.querySelector('.i-lucide-user')).not.toBeNull();
    });
});
