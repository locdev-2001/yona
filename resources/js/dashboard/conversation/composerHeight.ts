import type { UISettings } from 'dashboard/composables/useUISettings';

// Lệnh founder 08/09/2026: ô soạn tin mặc định phải NHỎ GỌN như Zalo/Messenger —
// vừa một dòng, tự giãn theo nội dung tới một trần hợp lý, và kéo được cao hơn
// khi cần. Chiều cao đã kéo được nhớ ở `ui_settings` (cùng chỗ với bề rộng thanh
// điều hướng và lựa chọn panel phải) nên tải lại trang vẫn giữ.
//
// Chatwoot gốc (ResizableEditorWrapper.vue) neo cứng DEFAULT_HEIGHT = 120px và
// MIN_HEIGHT = 80px, không tự giãn theo nội dung, không nhớ chiều cao đã kéo —
// ở 390px ô soạn chiếm gần nửa màn hình. Lệch có chủ đích, ghi ux-deviations.md.
//
// Module này là logic THUẦN (không DOM, không React) để nút ⤢, thanh kéo, đo nội
// dung và khôi phục từ `ui_settings` cùng đi qua một công thức duy nhất.

/** Sàn tuyệt đối — đủ cho đúng một dòng chữ. */
export const COMPOSER_MIN_HEIGHT = 32;

/** Trần khi ô soạn TỰ giãn theo nội dung; kéo tay vẫn vượt được trần này. */
export const COMPOSER_AUTO_GROW_MAX_HEIGHT = 200;

/** Chiều cao tối thiểu chừa lại cho vùng tin nhắn (giữ nguyên của gốc). */
export const COMPOSER_MIN_MESSAGES_HEIGHT = 200;

/** Nút ⤢ đưa ô soạn lên nửa khung (giữ nguyên EXPAND_RATIO của gốc). */
export const COMPOSER_EXPAND_RATIO = 0.5;

/** Khoá trong `ui_settings` nhớ chiều cao người dùng đã kéo. 0 = chưa ghim. */
export const COMPOSER_HEIGHT_KEY = 'reply_box_height';

export interface ComposerSizeBounds {
    min: number;
    max: number;
    expanded: number;
    autoGrowMax: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function composerSizeBounds(containerHeight: number, surroundingHeight: number): ComposerSizeBounds {
    const max =
        containerHeight > 0
            ? Math.max(COMPOSER_MIN_HEIGHT, containerHeight - COMPOSER_MIN_MESSAGES_HEIGHT - surroundingHeight)
            : COMPOSER_AUTO_GROW_MAX_HEIGHT;

    return {
        min: COMPOSER_MIN_HEIGHT,
        max,
        expanded: clamp(
            Math.floor(containerHeight * COMPOSER_EXPAND_RATIO - surroundingHeight / 2),
            COMPOSER_MIN_HEIGHT,
            max,
        ),
        autoGrowMax: Math.min(COMPOSER_AUTO_GROW_MAX_HEIGHT, max),
    };
}

/** Chiều cao đã ghim của người dùng, hoặc null nếu chưa từng kéo. */
export function readStoredComposerHeight(uiSettings: UISettings): number | null {
    const stored = uiSettings[COMPOSER_HEIGHT_KEY];
    if (typeof stored !== 'number' || !Number.isFinite(stored) || stored <= 0) return null;

    return stored;
}

/**
 * Chiều cao thực tế của ô soạn: nội dung chỉ được XIN cao thêm (tới trần tự
 * giãn), còn chiều cao người dùng ghim bằng thanh kéo luôn thắng và không bị nội
 * dung ngắn kéo tụt xuống.
 */
export function resolveComposerHeight({
    pinnedHeight,
    contentHeight,
    bounds,
}: {
    pinnedHeight: number | null;
    contentHeight: number;
    bounds: ComposerSizeBounds;
}): number {
    const grown = clamp(contentHeight, 0, bounds.autoGrowMax);

    return clamp(Math.max(pinnedHeight ?? 0, grown), bounds.min, bounds.max);
}
