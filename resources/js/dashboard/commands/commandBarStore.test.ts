import { afterEach, describe, expect, it } from 'vitest';
import { router } from '@inertiajs/react';

import { t } from '../../i18n';
import { buildGoToActions } from './useGoToCommandHotKeys';
import { NAVIGATION_ICONS } from 'dashboard/helper/commandbar/icons';
import { buildMenuItems } from 'dashboard/components-next/sidebar/menuItems';
import { filterMenuByRole } from 'dashboard/components-next/sidebar/permissions';
import type { AccountRole, SidebarMenuChild } from 'dashboard/components-next/sidebar/provider';
import { KEYS, SHORTCUT_KEYS } from './shortcutKeys';
import { clearCommandBarActions, getCommandBarActions, setCommandBarActions } from './commandBarStore';
import type { CommandBarAction } from 'dashboard/helper/commandbar/actions';

const action = (id: string): CommandBarAction => ({ id, title: id, section: 'S' });

afterEach(() => {
    clearCommandBarActions('a');
    clearCommandBarActions('b');
});

describe('commandBarStore', () => {
    it('gộp action theo thứ tự đăng ký của từng nguồn', () => {
        setCommandBarActions('a', [action('a1')]);
        setCommandBarActions('b', [action('b1'), action('b2')]);

        expect(getCommandBarActions().map(item => item.id)).toEqual(['a1', 'b1', 'b2']);
    });

    it('đăng ký lại cùng nguồn thì thay thế, không nhân đôi', () => {
        setCommandBarActions('a', [action('a1')]);
        setCommandBarActions('a', [action('a2')]);

        expect(getCommandBarActions().map(item => item.id)).toEqual(['a2']);
    });

    it('clear gỡ đúng nguồn đó', () => {
        setCommandBarActions('a', [action('a1')]);
        setCommandBarActions('b', [action('b1')]);
        clearCommandBarActions('a');

        expect(getCommandBarActions().map(item => item.id)).toEqual(['b1']);
    });
});

function sidebarDestinationUrls(role: AccountRole, features: Record<string, boolean> = {}): string[] {
    const collect = (items: SidebarMenuChild[]): string[] =>
        items.flatMap(item => [...(item.to ? [item.to] : []), ...collect(item.children ?? [])]);
    return collect(filterMenuByRole(buildMenuItems(2), role, features));
}

function visitedUrl(item: CommandBarAction): string {
    const visits: string[] = [];
    const originalVisit = router.visit;
    router.visit = ((url: string) => visits.push(url)) as typeof router.visit;
    item.handler?.();
    router.visit = originalVisit;
    return visits[0];
}

// Icon của nhóm chỉ để gập/mở (không có đường dẫn) nên không cần SVG cho command bar.
const GROUP_ONLY_ICONS = ['i-lucide-folder', 'i-lucide-users', 'i-lucide-mailbox', 'i-lucide-tag', 'i-lucide-group'];

describe('buildGoToActions', () => {
    it.each<AccountRole>(['administrator', 'agent'])('mọi mục điều hướng sidebar (%s) đều tìm được bằng Ctrl+K', role => {
        const commandUrls = buildGoToActions(2, role).map(visitedUrl);

        expect(commandUrls).toEqual(expect.arrayContaining(sidebarDestinationUrls(role)));
    });

    it('tìm được Kho sticker và Chuyển khoản', () => {
        const titles = buildGoToActions(2, 'administrator').map(item => item.title);

        expect(titles).toEqual(expect.arrayContaining([t('STICKER_LIBRARY.MENU'), t('SIDEBAR.PAYMENT_ACCOUNTS')]));
    });

    it('agent không thấy đích chỉ dành cho quản trị viên', () => {
        const commandUrls = buildGoToActions(2, 'agent').map(visitedUrl);

        expect(commandUrls).toContain('/app/accounts/2/settings/canned-response/list');
        expect(commandUrls).not.toContain('/app/accounts/2/settings/agents/list');
        expect(commandUrls).not.toContain('/app/accounts/2/settings/custom-stickers');
    });

    it('mục theo cờ tính năng chỉ có khi account bật cờ, giống sidebar', () => {
        const withoutFlag = buildGoToActions(2, 'administrator').map(visitedUrl);
        const withFlag = buildGoToActions(2, 'administrator', { whatsapp_campaign: true }).map(visitedUrl);

        expect(withoutFlag).not.toContain('/app/accounts/2/campaigns/whatsapp');
        expect(withFlag).toContain('/app/accounts/2/campaigns/whatsapp');
    });

    it('mục con không tên riêng vẫn tìm được theo tên nhóm cha', () => {
        const overview = buildGoToActions(2, 'administrator').find(
            item => visitedUrl(item) === '/app/accounts/2/reports/overview',
        );

        expect(overview?.keywords).toContain(t('SIDEBAR.REPORTS'));
    });

    it('mọi icon của mục sidebar có SVG tương ứng cho command bar', () => {
        const collectIcons = (items: SidebarMenuChild[]): string[] =>
            items.flatMap(item => [
                ...(typeof item.icon === 'string' ? [item.icon] : []),
                ...collectIcons(item.children ?? []),
            ]);
        const missing = collectIcons(buildMenuItems(2)).filter(icon => !NAVIGATION_ICONS[icon]);

        expect(missing.filter(icon => !GROUP_ONLY_ICONS.includes(icon))).toEqual([]);
    });

    it('mỗi action có id duy nhất, icon SVG và handler', () => {
        const actions = buildGoToActions(2, 'administrator');

        expect(new Set(actions.map(item => item.id)).size).toBe(actions.length);
        actions.forEach(item => {
            expect(item.icon, item.title).toMatch(/^<svg/);
            expect(typeof item.handler).toBe('function');
        });
    });
});

describe('SHORTCUT_KEYS', () => {
    it('ánh xạ 14 phím tắt, id duy nhất', () => {
        expect(SHORTCUT_KEYS).toHaveLength(14);
        expect(new Set(SHORTCUT_KEYS.map(shortcut => shortcut.id)).size).toBe(14);
    });

    it('mỗi mục có keySet tinykeys và displayKeys để hiển thị', () => {
        SHORTCUT_KEYS.forEach(shortcut => {
            expect(shortcut.keySet.length).toBeGreaterThan(0);
            expect(shortcut.displayKeys.length).toBeGreaterThan(0);
        });
    });

    it('phím mở/đóng hội thoại dùng Alt+J / Alt+K quanh dấu gạch chéo', () => {
        const openConversation = SHORTCUT_KEYS.find(shortcut => shortcut.label === 'OPEN_CONVERSATION')!;

        expect(openConversation.keySet).toEqual(['Alt+KeyJ', 'Alt+KeyK']);
        expect(openConversation.displayKeys).toEqual([KEYS.ALT, 'J', KEYS.SLASH, KEYS.ALT, 'K']);
    });

    it('resolve-and-next dùng $mod+Alt+E', () => {
        const resolveAndNext = SHORTCUT_KEYS.find(shortcut => shortcut.label === 'RESOLVE_AND_NEXT')!;
        expect(resolveAndNext.keySet).toEqual(['$mod+Alt+KeyE']);
    });
});
