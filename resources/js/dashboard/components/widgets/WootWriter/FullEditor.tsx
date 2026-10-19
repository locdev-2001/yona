import { useEffect, useRef } from 'react';
import {
    ArticleMarkdownSerializer,
    ArticleMarkdownTransformer,
    EditorState,
    EditorView,
    Selection,
    buildEditor,
    fullSchema,
    imageResizeView,
} from '@ext/prosemirror-schema';
import type { Node as ProseMirrorNode } from 'prosemirror-model';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { uploadFile } from 'dashboard/helper/uploadHelper';

// Port từ dashboard/components/widgets/WootWriter/FullEditor.vue — trình soạn
// bài viết help center (ProseMirror + markdown bài viết).
// Chưa port: menu lệnh `/` (SlashCommandMenu) và ô nhúng video (VideoEmbedInput).
const MAXIMUM_FILE_UPLOAD_SIZE = 4; // MB
const MENUBAR_OFFSET = 10;
const DEFAULT_MENUBAR_WIDTH = 480;

interface FullEditorProps {
    value: string;
    placeholder?: string;
    enabledMenuOptions?: string[];
    autofocus?: boolean;
    className?: string;
    onChange: (value: string) => void;
}

function createEditorState(content: string, placeholder: string, enabledMenuOptions: string[], onImageUpload: () => void) {
    return EditorState.create({
        doc: new ArticleMarkdownTransformer(fullSchema).parse(content) as ProseMirrorNode,
        plugins: buildEditor({
            schema: fullSchema,
            placeholder,
            methods: { onImageUpload },
            plugins: [],
            enabledMenuOptions,
        }),
    });
}

export default function FullEditor({
    value,
    placeholder = '',
    enabledMenuOptions = [],
    autofocus = true,
    className = '',
    onChange,
}: FullEditorProps) {
    const editorRootRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const isTextSelectedRef = useRef(false);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const serializedContent = () =>
        viewRef.current ? ArticleMarkdownSerializer.serialize(viewRef.current.state.doc) : '';

    const focusEditorInputField = () => {
        const view = viewRef.current;
        if (!view) return;

        const { tr } = view.state;
        view.dispatch(tr.setSelection(Selection.atEnd(tr.doc)));
        view.focus();
    };

    // Thanh công cụ chỉ hiện khi có vùng chọn — đặt vị trí theo toạ độ vùng chọn.
    const setMenubarPosition = (state: EditorState) => {
        const view = viewRef.current;
        const editor = editorRef.current;
        if (!view || !editor || !state.selection) return;

        const { from, to } = state.selection;
        const { left: editorLeft, top: editorTop } = editor.getBoundingClientRect();
        const menubar = editor.querySelector('.ProseMirror-menubar');
        const menubarWidth = menubar ? menubar.scrollWidth : DEFAULT_MENUBAR_WIDTH;

        const { bottom: endBottom, right: endRight } = view.coordsAtPos(to);
        const { left: startLeft } = view.coordsAtPos(from);

        const top = endBottom - editorTop + MENUBAR_OFFSET;
        const left = Math.max(
            0,
            Math.min((startLeft + endRight) / 2 - editorLeft, editor.offsetWidth - menubarWidth),
        );

        editor.style.setProperty('--selection-top', `${top}px`);
        editor.style.setProperty('--selection-left', `${left}px`);
    };

    const checkSelection = (state: EditorState) => {
        const selection = state.selection as EditorState['selection'] & { node?: unknown };
        const hasSelection = !selection.empty && !selection.node;
        if (hasSelection === isTextSelectedRef.current) return;

        isTextSelectedRef.current = hasSelection;
        editorRef.current?.classList.toggle('has-selection', hasSelection);
        if (hasSelection) setMenubarPosition(state);
    };

    const insertImage = (fileUrl: string) => {
        const view = viewRef.current;
        if (!view) return;

        const { from } = view.state.selection;
        const node = view.state.schema.nodes.image.create({ src: fileUrl });
        const paragraphNode = view.state.schema.node('paragraph');
        if (!node) return;

        view.dispatch(view.state.tr.replaceSelectionWith(paragraphNode).insert(from + 1, node).scrollIntoView());
        focusEditorInputField();
    };

    const uploadImageToStorage = async (file: File) => {
        try {
            const { fileUrl } = await uploadFile(file);
            if (fileUrl) insertImage(fileUrl);
        } catch {
            useAlert(t('HELP_CENTER.ARTICLE_EDITOR.IMAGE_UPLOAD.ERROR'));
        }
    };

    useEffect(() => {
        if (!editorRef.current) return undefined;

        const state = createEditorState(value || '', placeholder, enabledMenuOptions, () =>
            fileInputRef.current?.click(),
        );

        const view = new EditorView(editorRef.current, {
            state,
            nodeViews: { image: imageResizeView as never },
            dispatchTransaction: transaction => {
                const nextState = view.state.apply(transaction);
                view.updateState(nextState);
                if (transaction.docChanged) onChangeRef.current(ArticleMarkdownSerializer.serialize(nextState.doc));
                checkSelection(nextState);
            },
            handleDOMEvents: {
                blur: () => {
                    isTextSelectedRef.current = false;
                    editorRef.current?.classList.remove('has-selection');

                    return false;
                },
            },
        });
        viewRef.current = view;

        if (autofocus) focusEditorInputField();

        return () => {
            view.destroy();
            viewRef.current = null;
        };
        // Trình soạn dựng một lần; đồng bộ nội dung ở effect bên dưới.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Nội dung đến từ ngoài (đổi bài, huỷ nháp) — nạp lại state.
    useEffect(() => {
        const view = viewRef.current;
        if (!view || (value || '') === serializedContent()) return;

        view.updateState(
            createEditorState(value || '', placeholder, enabledMenuOptions, () => fileInputRef.current?.click()),
        );
        focusEditorInputField();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size / (1024 * 1024) <= MAXIMUM_FILE_UPLOAD_SIZE) {
            uploadImageToStorage(file);
        } else {
            useAlert(t('HELP_CENTER.ARTICLE_EDITOR.IMAGE_UPLOAD.ERROR_FILE_SIZE', { size: MAXIMUM_FILE_UPLOAD_SIZE }));
        }

        event.target.value = '';
    };

    return (
        <div className={className} ref={editorRootRef}>
            <div className="editor-root editor--article relative">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/gif, image/webp"
                    hidden
                    onChange={onFileChange}
                />
                <div ref={editorRef} />
            </div>
        </div>
    );
}
