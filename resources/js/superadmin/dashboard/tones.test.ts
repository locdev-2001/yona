import { describe, expect, it } from 'vitest';

import { AVATAR_CLASSES, avatarClassOf } from '@admin/lib/format';
import { MEANING_TONE, TONE_BADGE, TONE_CHIP, problemTone } from '@admin/views/dashboards/tones';

import { WIDGET_BADGE } from './widgetTones';

describe('màu theo nghĩa của console', () => {
    it('chỉ số vấn đề bằng 0 là trung tính, lớn hơn 0 mới mang màu trạng thái', () => {
        expect(problemTone(0)).toBe('neutral');
        expect(problemTone(0, 'failing')).toBe('neutral');
        expect(problemTone(3)).toBe(MEANING_TONE.problem);
        expect(problemTone(1, 'failing')).toBe(MEANING_TONE.failing);
    });

    it('mọi ô biểu tượng đều nền nhạt: không có ô tô đặc', () => {
        for (const classes of [...Object.values(TONE_CHIP), ...Object.values(TONE_BADGE)]) {
            expect(classes).not.toMatch(/bg-(navy|primary-600|primary-700|success|warning|danger)(\s|$)/);
        }
    });

    it('tiêu đề ô không mang màu trạng thái cố định', () => {
        const statusTones = new Set([MEANING_TONE.healthy, MEANING_TONE.problem, MEANING_TONE.failing]);
        for (const badge of Object.values(WIDGET_BADGE)) {
            expect(statusTones.has(badge.tone as never)).toBe(false);
        }
    });
});

describe('avatarClassOf', () => {
    it('cùng tên luôn cùng màu, không phân biệt hoa thường và khoảng trắng hai đầu', () => {
        expect(avatarClassOf('Shop Mẹ Bắp')).toBe(avatarClassOf('  shop mẹ bắp '));
        expect(AVATAR_CLASSES).toContain(avatarClassOf('Shop Mẹ Bắp'));
    });

    it('tên trống vẫn có màu', () => {
        expect(AVATAR_CLASSES).toContain(avatarClassOf(null));
    });
});
