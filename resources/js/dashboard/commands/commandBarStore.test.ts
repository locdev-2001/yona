import { afterEach, describe, expect, it } from 'vitest';

import { GO_TO_COMMANDS, buildGoToActions } from './useGoToCommandHotKeys';
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

describe('buildGoToActions', () => {
    it('quản trị viên thấy đủ danh sách, đúng thứ tự gốc', () => {
        const actions = buildGoToActions(2, true);
        expect(actions).toHaveLength(GO_TO_COMMANDS.length);
        expect(actions.map(item => item.id)).toEqual(GO_TO_COMMANDS.map(command => command.id));
    });

    it('agent chỉ thấy các đích không giới hạn quản trị', () => {
        const actions = buildGoToActions(2, false);
        const expected = GO_TO_COMMANDS.filter(command => !command.adminOnly).map(command => command.id);

        expect(actions.map(item => item.id)).toEqual(expected);
        expect(actions.map(item => item.id)).toContain('open_canned_response_settings');
        expect(actions.map(item => item.id)).not.toContain('open_agent_settings');
    });

    it('mỗi action có icon + handler', () => {
        buildGoToActions(2, true).forEach(item => {
            expect(item.icon).toBeTruthy();
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
