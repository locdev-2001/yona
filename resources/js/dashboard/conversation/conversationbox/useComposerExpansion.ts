import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';

import { isActiveElementTypeable } from 'dashboard/composables/useKeyboardEvents';
import { filesFromDataTransfer } from 'shared/helpers/FileHelper';

// Ô soạn mở hội thoại ở dạng thu gọn (chỉ dòng nhập tin) để chừa chỗ đọc tin;
// focus vào thì bung đủ tab, người nhận, thanh công cụ. Bấm ra ngoài khi không
// còn gì dở (nháp, tệp, tin đang trả lời, ghi âm) thì thu lại.
//
// "Bên trong" được xét theo cây React, không theo DOM: popover/dialog của thanh
// công cụ dựng qua portal ra `document.body`, nhưng sự kiện React vẫn nổi qua
// portal về ô soạn. Ô soạn ghi lại đúng sự kiện bấm của mình, listener ở
// `document` chạy sau (React gắn listener ở gốc ứng dụng, nằm dưới `document`)
// và bỏ qua đúng sự kiện đó. So theo sự kiện chứ không theo cờ: cú bấm làm ô
// soạn bung ra xảy ra khi listener chưa gắn, cờ còn sót sẽ nuốt cú bấm ra ngoài kế tiếp.

const DIALOG_SELECTOR = '[role="dialog"], dialog[open], ninja-keys[opened]';

export function useComposerExpansion({ canCollapse, resetKey }: { canCollapse: boolean; resetKey: unknown }) {
    const [isExpandedByUser, setIsExpandedByUser] = useState(false);
    const lastPointerInsideComposerRef = useRef<Event | null>(null);
    const canCollapseRef = useRef(canCollapse);
    canCollapseRef.current = canCollapse;

    useEffect(() => setIsExpandedByUser(false), [resetKey]);

    useEffect(() => {
        if (!isExpandedByUser) return undefined;

        const onDocumentPointerDown = (event: PointerEvent) => {
            if (event === lastPointerInsideComposerRef.current) return;
            if (canCollapseRef.current) setIsExpandedByUser(false);
        };
        document.addEventListener('pointerdown', onDocumentPointerDown);
        return () => document.removeEventListener('pointerdown', onDocumentPointerDown);
    }, [isExpandedByUser]);

    const expand = useCallback(() => setIsExpandedByUser(true), []);
    const markPointerInsideComposer = useCallback((event: ReactPointerEvent) => {
        lastPointerInsideComposerRef.current = event.nativeEvent;
    }, []);

    return { isExpanded: isExpandedByUser || !canCollapse, expand, markPointerInsideComposer };
}

/** Phím gõ ra một ký tự, không kèm phím bổ trợ của phím tắt. */
function isPrintableKey(event: KeyboardEvent): boolean {
    return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && !event.isComposing;
}

const TYPEABLE_SELECTOR = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], ninja-keys';

/** Không ô nhập nào đang giữ con trỏ và không có hộp thoại nào đang mở. */
function isComposerTargetFree(): boolean {
    const activeElement = document.activeElement;
    if (activeElement?.closest(TYPEABLE_SELECTOR) || document.querySelector(DIALOG_SELECTOR)) return false;

    return true;
}

function isTypingTargetFree(event: KeyboardEvent): boolean {
    if (isActiveElementTypeable(event) || !isComposerTargetFree()) return false;

    const activeElement = document.activeElement;
    const isNothingFocused = !activeElement || activeElement === document.body;
    // Space trên nút/link đang focus là bấm nút đó, không phải gõ chữ.
    return event.key !== ' ' || isNothingFocused;
}

interface ComposerEditorHandle {
    focusEditorInputField: () => void;
    insertText: (text: string) => void;
}

/**
 * Đang không ở ô nhập nào mà gõ chữ thì chuyển ký tự đó vào ô soạn — nhân viên
 * đọc xong là gõ trả lời luôn, không phải với chuột bấm vào ô.
 */
export function useTypeToFocusComposer(editorRef: RefObject<ComposerEditorHandle | null>, enabled: boolean): void {
    useEffect(() => {
        if (!enabled) return undefined;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented || !isPrintableKey(event) || !isTypingTargetFree(event)) return;
            const editor = editorRef.current;
            if (!editor) return;

            event.preventDefault();
            editor.focusEditorInputField();
            editor.insertText(event.key);
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [editorRef, enabled]);
}

/** Chuyển nguyên sự kiện dán vào ô soạn để ô soạn tự xử như khi được dán trực tiếp (chữ có định dạng, ảnh, tệp). */
function forwardPasteToFocusedEditor(clipboardData: DataTransfer): boolean {
    const editorElement = document.activeElement;
    if (!editorElement || typeof ClipboardEvent !== 'function') return false;

    const forwarded = new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true });
    // Trình duyệt không cho dựng sự kiện dán mang dữ liệu thì để nơi gọi tự chèn.
    if (forwarded.clipboardData !== clipboardData) return false;

    editorElement.dispatchEvent(forwarded);
    return forwarded.defaultPrevented;
}

/**
 * Đang không ở ô nhập nào mà dán (Ctrl+V) thì dán vào ô soạn: chữ chèn vào ô,
 * ảnh/tệp đi đúng luồng đính kèm của ô soạn. Ô tìm kiếm, form, hộp thoại vẫn
 * nhận dán của chính chúng.
 */
export function usePasteToComposer(
    editorRef: RefObject<ComposerEditorHandle | null>,
    enabled: boolean,
    onAttachFiles: (files: File[]) => void,
): void {
    const onAttachFilesRef = useRef(onAttachFiles);
    onAttachFilesRef.current = onAttachFiles;

    useEffect(() => {
        if (!enabled) return undefined;

        const onPaste = (event: ClipboardEvent) => {
            const clipboardData = event.clipboardData;
            const editor = editorRef.current;
            if (event.defaultPrevented || !clipboardData || !editor || !isComposerTargetFree()) return;

            const files = filesFromDataTransfer(clipboardData);
            const text = clipboardData.getData('text/plain');
            if (files.length === 0 && !text) return;

            event.preventDefault();
            editor.focusEditorInputField();
            if (forwardPasteToFocusedEditor(clipboardData)) return;

            if (files.length > 0) {
                onAttachFilesRef.current(files);
            } else {
                editor.insertText(text);
            }
        };
        document.addEventListener('paste', onPaste);
        return () => document.removeEventListener('paste', onPaste);
    }, [editorRef, enabled]);
}
