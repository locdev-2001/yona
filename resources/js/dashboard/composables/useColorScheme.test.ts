import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { putJson, reload } = vi.hoisted(() => ({ putJson: vi.fn(), reload: vi.fn() }));
vi.mock('dashboard/helper/apiClient', () => ({ putJson }));
vi.mock('@inertiajs/react', () => ({ router: { reload }, usePage: vi.fn() }));

import { applyColorScheme, normalizeColorScheme, saveColorScheme } from './useColorScheme';

beforeEach(() => {
    putJson.mockReset();
    reload.mockReset();
});

const root = () => document.documentElement;

afterEach(() => applyColorScheme('light'));

describe('normalizeColorScheme', () => {
    it('giá trị lạ hoặc chưa chọn thì về Sáng', () => {
        expect(normalizeColorScheme(undefined)).toBe('light');
        expect(normalizeColorScheme('sepia')).toBe('light');
        expect(normalizeColorScheme('dark')).toBe('dark');
    });
});

describe('applyColorScheme', () => {
    it('Tối gắn class dark và color-scheme dark; Sáng gỡ ra', () => {
        applyColorScheme('dark');
        expect(root().classList.contains('dark')).toBe(true);
        expect(root().style.colorScheme).toBe('dark');

        applyColorScheme('light');
        expect(root().classList.contains('dark')).toBe(false);
        expect(root().style.colorScheme).toBe('light');
    });
});

describe('saveColorScheme', () => {
    it('đổi trên màn hình, lưu vào ui_settings rồi nạp lại auth', async () => {
        putJson.mockResolvedValue({});

        await saveColorScheme('dark', 'light');

        expect(root().classList.contains('dark')).toBe(true);
        expect(putJson).toHaveBeenCalledWith('/api/v1/profile', { ui_settings: { color_scheme: 'dark' } });
        expect(reload).toHaveBeenCalledWith({ only: ['auth'] });
    });

    it('lưu hỏng thì trả về chế độ cũ', async () => {
        putJson.mockRejectedValue(new Error('500'));

        await expect(saveColorScheme('dark', 'light')).rejects.toThrow();

        expect(root().classList.contains('dark')).toBe(false);
        expect(reload).not.toHaveBeenCalled();
    });
});
