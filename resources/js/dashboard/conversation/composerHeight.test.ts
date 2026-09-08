import { describe, expect, it } from 'vitest';

import {
    COMPOSER_AUTO_GROW_MAX_HEIGHT,
    COMPOSER_HEIGHT_KEY,
    COMPOSER_MIN_HEIGHT,
    composerSizeBounds,
    readStoredComposerHeight,
    resolveComposerHeight,
} from './composerHeight';

const BOUNDS = composerSizeBounds(800, 100);

describe('giới hạn chiều cao ô soạn', () => {
    it('chừa đủ chỗ cho vùng tin nhắn và phần bao quanh ô soạn', () => {
        expect(BOUNDS.min).toBe(COMPOSER_MIN_HEIGHT);
        expect(BOUNDS.max).toBe(800 - 200 - 100);
        expect(BOUNDS.autoGrowMax).toBe(COMPOSER_AUTO_GROW_MAX_HEIGHT);
    });

    it('khung quá thấp thì trần tụt theo, không bao giờ dưới sàn một dòng', () => {
        const tight = composerSizeBounds(220, 100);
        expect(tight.max).toBe(COMPOSER_MIN_HEIGHT);
        expect(tight.autoGrowMax).toBe(COMPOSER_MIN_HEIGHT);
    });

    it('chưa đo được khung thì tạm lấy trần tự giãn', () => {
        expect(composerSizeBounds(0, 0).max).toBe(COMPOSER_AUTO_GROW_MAX_HEIGHT);
    });
});

describe('chiều cao mặc định và tự giãn', () => {
    it('chưa gõ gì thì gọn đúng một dòng', () => {
        expect(resolveComposerHeight({ pinnedHeight: null, contentHeight: 0, bounds: BOUNDS })).toBe(
            COMPOSER_MIN_HEIGHT,
        );
    });

    it('giãn theo nội dung khi gõ nhiều dòng', () => {
        expect(resolveComposerHeight({ pinnedHeight: null, contentHeight: 96, bounds: BOUNDS })).toBe(96);
    });

    it('tự giãn dừng ở trần, không nuốt hết khung chat', () => {
        expect(resolveComposerHeight({ pinnedHeight: null, contentHeight: 5000, bounds: BOUNDS })).toBe(
            COMPOSER_AUTO_GROW_MAX_HEIGHT,
        );
    });

    it('xoá hết chữ thì co lại về một dòng', () => {
        const grown = resolveComposerHeight({ pinnedHeight: null, contentHeight: 140, bounds: BOUNDS });
        const emptied = resolveComposerHeight({ pinnedHeight: null, contentHeight: 0, bounds: BOUNDS });
        expect(grown).toBe(140);
        expect(emptied).toBe(COMPOSER_MIN_HEIGHT);
    });
});

describe('chiều cao người dùng kéo', () => {
    it('kéo cao hơn trần tự giãn vẫn được giữ', () => {
        expect(resolveComposerHeight({ pinnedHeight: 380, contentHeight: 0, bounds: BOUNDS })).toBe(380);
    });

    it('không vượt quá trần của khung', () => {
        expect(resolveComposerHeight({ pinnedHeight: 5000, contentHeight: 0, bounds: BOUNDS })).toBe(BOUNDS.max);
    });

    it('nội dung dài hơn chiều cao đã ghim thì vẫn xin giãn thêm', () => {
        expect(resolveComposerHeight({ pinnedHeight: 60, contentHeight: 150, bounds: BOUNDS })).toBe(150);
    });
});

describe('nhớ chiều cao trong ui_settings', () => {
    it('đọc lại đúng con số đã ghi', () => {
        expect(readStoredComposerHeight({ [COMPOSER_HEIGHT_KEY]: 260 })).toBe(260);
    });

    it('chưa từng kéo, hoặc đã reset về 0, thì coi như chưa ghim', () => {
        expect(readStoredComposerHeight({})).toBeNull();
        expect(readStoredComposerHeight({ [COMPOSER_HEIGHT_KEY]: 0 })).toBeNull();
        expect(readStoredComposerHeight({ [COMPOSER_HEIGHT_KEY]: -10 })).toBeNull();
        expect(readStoredComposerHeight({ [COMPOSER_HEIGHT_KEY]: '260' })).toBeNull();
    });

    it('vòng đời đầy đủ: mặc định → kéo → ghi → tải lại vẫn cao như cũ', () => {
        const drag = 300;
        const uiSettings = { [COMPOSER_HEIGHT_KEY]: drag };
        const afterReload = resolveComposerHeight({
            pinnedHeight: readStoredComposerHeight(uiSettings),
            contentHeight: 0,
            bounds: BOUNDS,
        });
        expect(afterReload).toBe(drag);
    });
});
