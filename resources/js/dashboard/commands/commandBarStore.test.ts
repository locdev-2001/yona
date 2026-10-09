import { afterEach, describe, expect, it, vi } from 'vitest';
import { router } from '@inertiajs/react';

import { t } from '../../i18n';
import { buildGoToActions } from './useGoToCommandHotKeys';
import { buildLanguageActions } from './useLanguageCommandHotKeys';
import { buildColorSchemeActions } from './useColorSchemeCommandHotKeys';
import { colorSchemeOptions } from 'dashboard/composables/useColorScheme';
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

    it('không còn lệnh trỏ trang Cài đặt tài khoản đã gỡ', () => {
        const commandUrls = buildGoToActions(2, 'administrator').map(visitedUrl);

        expect(commandUrls).not.toContain('/app/accounts/2/settings/general');
    });

    it('agent không thấy đích chỉ dành cho quản trị viên', () => {
        const commandUrls = buildGoToActions(2, 'agent').map(visitedUrl);

        expect(commandUrls).toContain('/app/accounts/2/settings/canned-response/list');
        expect(commandUrls).not.toContain('/app/accounts/2/settings/agents/list');
        expect(commandUrls).toContain('/app/accounts/2/settings/custom-stickers');
    });

    it('chế độ tinh gọn vẫn ẩn chiến dịch dù account bật cờ', () => {
        const withoutFlag = buildGoToActions(2, 'administrator').map(visitedUrl);
        const withFlag = buildGoToActions(2, 'administrator', { whatsapp_campaign: true }).map(visitedUrl);

        expect(withoutFlag).not.toContain('/app/accounts/2/campaigns/whatsapp');
        expect(withFlag).not.toContain('/app/accounts/2/campaigns/whatsapp');
    });

    it('mục con không tên riêng vẫn tìm được theo tên nhóm cha', () => {
        const overview = buildGoToActions(2, 'administrator').find(
            item => visitedUrl(item) === '/app/accounts/2/reports/overview',
        );

        expect(overview?.title).toBe(t('SIDEBAR.REPORTS'));
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

describe('buildLanguageActions', () => {
    const locales = [
        { name: 'English', iso_639_1_code: 'en' },
        { name: 'Tiếng Việt', iso_639_1_code: 'vi' },
    ];

    it('gõ "Ngôn ngữ" tìm được lệnh đổi ngôn ngữ, mở ra nhánh con theo từng ngôn ngữ', () => {
        const [parent, ...children] = buildLanguageActions(locales, vi.fn());

        expect(parent.title).toBe(t('COMMAND_BAR.COMMANDS.CHANGE_LANGUAGE'));
        expect(parent.keywords).toContain(t('SIDEBAR_ITEMS.LANGUAGE'));
        expect(parent.icon).toMatch(/^<svg/);
        expect(children.map(child => child.title)).toEqual([t('SIDEBAR_ITEMS.LANGUAGE_ACCOUNT_DEFAULT'), 'English', 'Tiếng Việt']);
        expect(parent.children).toEqual(children.map(child => child.id));
        children.forEach(child => expect(child.parent).toBe(parent.id));
    });

    it('chọn một ngôn ngữ thì lưu ngôn ngữ riêng, "Theo tài khoản" lưu rỗng', () => {
        const changeLocale = vi.fn().mockResolvedValue(undefined);
        const [, accountDefault, , vietnamese] = buildLanguageActions(locales, changeLocale);

        vietnamese.handler?.();
        accountDefault.handler?.();

        expect(changeLocale.mock.calls).toEqual([['vi'], ['']]);
    });
});

describe('buildColorSchemeActions', () => {
    it('gõ "Giao diện" hoặc "dark mode" tìm được lệnh, mở ra Sáng / Tối', () => {
        const [parent, ...children] = buildColorSchemeActions(colorSchemeOptions(), vi.fn());

        expect(parent.title).toBe(t('COMMAND_BAR.COMMANDS.CHANGE_APPEARANCE'));
        expect(parent.keywords).toContain(t('SIDEBAR_ITEMS.APPEARANCE'));
        expect(parent.keywords).toContain('dark mode');
        expect(children.map(child => child.title)).toEqual(colorSchemeOptions().map(option => option.label));
        expect(parent.children).toEqual(children.map(child => child.id));
        children.forEach(child => expect(child.parent).toBe(parent.id));
    });

    it('chọn một chế độ thì lưu đúng chế độ đó', () => {
        const changeColorScheme = vi.fn().mockResolvedValue(undefined);
        const [, light, dark] = buildColorSchemeActions(colorSchemeOptions(), changeColorScheme);

        dark.handler?.();
        light.handler?.();

        expect(changeColorScheme.mock.calls).toEqual([['dark'], ['light']]);
    });
});
