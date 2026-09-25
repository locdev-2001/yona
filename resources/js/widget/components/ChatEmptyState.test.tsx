import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import ChatEmptyState from './ChatEmptyState';
import { widgetStore } from '../store/widgetStore';
import type { ChannelConfig, WidgetContact } from '../types';

const useChannel = (overrides: Partial<ChannelConfig> = {}) =>
    widgetStore.setChannelConfig(
        { websiteName: 'Yona', welcomeTitle: '', welcomeTagline: '', ...overrides } as unknown as ChannelConfig,
        {},
        {} as WidgetContact,
    );

const sticker = { id: 'cat-1', image_url: '/stickers/cat-1.png', pack_id: null, label: 'Mèo' };

beforeEach(() => {
    widgetStore.setAppConfig({ welcomeTitle: '', welcomeDescription: '' });
    widgetStore.setMessagingPolicy({ recallWindowSeconds: 0, stickers: [] });
    useChannel();
});

describe('màn trống', () => {
    it('chưa cấu hình gì thì dùng câu mặc định, không hứa gửi sticker khi hộp thư chưa có kho sticker', () => {
        render(<ChatEmptyState />);

        expect(screen.getByRole('heading').textContent).toBe('Hi there!');
        expect(screen.getByTestId('chat-empty-state').textContent).toContain(
            'Send Yona a message about anything. You can attach photos or files.',
        );
        expect(screen.getByTestId('chat-empty-state').textContent).not.toMatch(/sticker/i);
    });

    it('hộp thư có kho sticker thì câu mặc định nhắc tới sticker', () => {
        widgetStore.setMessagingPolicy({ recallWindowSeconds: 0, stickers: [sticker] });

        render(<ChatEmptyState />);

        expect(screen.getByTestId('chat-empty-state').textContent).toContain('photos, files or stickers');
    });

    it('Tiêu đề chào mừng và lời giới thiệu của hộp thư thay câu mặc định', () => {
        useChannel({ welcomeTitle: 'Shop Hoa Mai xin chào', welcomeTagline: 'Hỏi gì cũng được nhé' });

        render(<ChatEmptyState />);

        expect(screen.getByRole('heading').textContent).toBe('Shop Hoa Mai xin chào');
        expect(screen.getByTestId('chat-empty-state').textContent).toContain('Hỏi gì cũng được nhé');
    });

    it('trang nhúng đặt welcomeTitle qua SDK thì thắng cấu hình hộp thư', () => {
        useChannel({ welcomeTitle: 'Của hộp thư' });
        widgetStore.setAppConfig({ welcomeTitle: 'Của trang nhúng' });

        render(<ChatEmptyState />);

        expect(screen.getByRole('heading').textContent).toBe('Của trang nhúng');
    });
});
