import { useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import { router, usePage } from '@inertiajs/react';

import { postForm, putJson } from 'dashboard/helper/apiClient';
import type { SharedPageProps } from '../../../types';
import { findWallpaperPreset } from './presets';

// `users.ui_settings.chat_wallpaper` — máy chủ kiểm và dọn ảnh ở App\Services\Users\ChatWallpaperService.
// Máy chủ gộp ui_settings theo khoá cấp một, nên mỗi lần lưu gửi trọn đối tượng này.
export const CHAT_WALLPAPER_UI_SETTINGS_KEY = 'chat_wallpaper';
export const WALLPAPER_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const WALLPAPER_UPLOAD_ACCEPT = 'image/jpeg,image/png,image/webp';

export type Wallpaper = { kind: 'preset'; key: string } | { kind: 'image'; url: string };
export type WallpaperScope = 'conversation' | 'all';

export interface ChatWallpaperSettings {
    default: Wallpaper | null;
    conversations: Record<string, Wallpaper>;
}

const EMPTY_SETTINGS: ChatWallpaperSettings = { default: null, conversations: {} };

// Lớp phủ dùng màu nền canvas (đổi theo chế độ sáng/tối) để chữ ngày và tin hệ thống đọc được trên ảnh.
const IMAGE_SCRIM = 'linear-gradient(rgb(var(--surface-canvas) / 0.55), rgb(var(--surface-canvas) / 0.55))';

function isWallpaper(value: unknown): value is Wallpaper {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Record<string, unknown>;
    if (candidate.kind === 'preset') return typeof candidate.key === 'string' && findWallpaperPreset(candidate.key) !== undefined;
    return candidate.kind === 'image' && typeof candidate.url === 'string';
}

export function chatWallpaperSettingsOf(uiSettings: Record<string, unknown> | null | undefined): ChatWallpaperSettings {
    const stored = uiSettings?.[CHAT_WALLPAPER_UI_SETTINGS_KEY] as Partial<ChatWallpaperSettings> | null | undefined;
    if (!stored || typeof stored !== 'object') return EMPTY_SETTINGS;

    // Đối tượng rỗng đi qua PHP thành mảng `[]`.
    const storedConversations = stored.conversations && !Array.isArray(stored.conversations) ? stored.conversations : {};
    const conversations = Object.fromEntries(Object.entries(storedConversations).filter(([, wallpaper]) => isWallpaper(wallpaper)));

    return { default: isWallpaper(stored.default) ? stored.default : null, conversations };
}

export function wallpaperForScope(settings: ChatWallpaperSettings, scope: WallpaperScope, conversationId: number): Wallpaper | null {
    return scope === 'all' ? settings.default : settings.conversations[String(conversationId)] ?? null;
}

export function effectiveWallpaper(settings: ChatWallpaperSettings, conversationId: number): Wallpaper | null {
    return settings.conversations[String(conversationId)] ?? settings.default;
}

export function withWallpaper(
    settings: ChatWallpaperSettings,
    scope: WallpaperScope,
    conversationId: number,
    wallpaper: Wallpaper | null,
): ChatWallpaperSettings {
    if (scope === 'all') return { ...settings, default: wallpaper };

    const { [String(conversationId)]: _removed, ...otherConversations } = settings.conversations;
    return { ...settings, conversations: wallpaper ? { ...otherConversations, [String(conversationId)]: wallpaper } : otherConversations };
}

export function wallpaperStyle(wallpaper: Wallpaper | null): CSSProperties | undefined {
    if (!wallpaper) return undefined;
    if (wallpaper.kind === 'preset') return findWallpaperPreset(wallpaper.key)?.style;

    return {
        backgroundColor: 'rgb(var(--surface-canvas))',
        backgroundImage: `${IMAGE_SCRIM}, url("${encodeURI(wallpaper.url)}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
    };
}

// Bản đang lưu dở: bấm là thấy nền mới ngay, không chờ nạp lại `auth`.
let pendingSettings: ChatWallpaperSettings | null = null;
const listeners = new Set<() => void>();

function setPendingSettings(settings: ChatWallpaperSettings | null): void {
    pendingSettings = settings;
    listeners.forEach(listener => listener());
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export async function saveChatWallpaperSettings(settings: ChatWallpaperSettings): Promise<void> {
    setPendingSettings(settings);
    try {
        await putJson('/api/v1/profile', { ui_settings: { [CHAT_WALLPAPER_UI_SETTINGS_KEY]: settings } });
    } catch (error) {
        setPendingSettings(null);
        throw error;
    }
    router.reload({ only: ['auth'], onFinish: () => setPendingSettings(null) });
}

export async function uploadWallpaperImage(file: File): Promise<string> {
    const form = new FormData();
    form.append('image', file);
    const { url } = await postForm<{ url: string }>('/api/v1/profile/chat_wallpaper', form);
    return url;
}

export function useChatWallpaperSettings(): ChatWallpaperSettings {
    const { auth } = usePage<SharedPageProps>().props;
    const pending = useSyncExternalStore(subscribe, () => pendingSettings);

    return pending ?? chatWallpaperSettingsOf(auth?.user?.ui_settings);
}
