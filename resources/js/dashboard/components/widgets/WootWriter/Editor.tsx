import { useEffect, useImperativeHandle, useRef } from 'react';
import { forwardRef } from 'react';
import {
    EditorState,
    EditorView,
    MessageMarkdownSerializer,
    MessageMarkdownTransformer,
    Selection,
    buildEditor,
    buildMessageSchema,
} from '@chatwoot/prosemirror-schema';
import type { Schema } from 'prosemirror-model';

import { FORMATTING, stripUnsupportedFormatting } from 'dashboard/helper/editorHelper';
import { isEditorHotKeyEnabled, type UISettings } from 'dashboard/composables/useUISettings';

// Port từ dashboard/components/widgets/WootWriter/Editor.vue — giữ nguyên
// engine @chatwoot/prosemirror-schema (quyết định plan: KHÔNG viết lại editor).
// Bỏ ở B3: mention @ (B11), canned response / (B10), variables (D1),
// macros (D3), emoji gõ ':' (B10), upload ảnh inline (B9), copilot (EE).

export interface EditorHandle {
    focusEditorInputField: (position?: 'start' | 'end') => void;
    insertText: (text: string) => void;
}

interface EditorProps {
    value: string;
    editorId: string;
    placeholder: string;
    disabled?: boolean;
    isPrivate?: boolean;
    channelType?: string;
    uiSettings: UISettings;
    className?: string;
    onChange: (value: string) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    onSend?: () => void;
}

const PRIVATE_NOTE_FORMATTING = 'Context::PrivateNote';
const DEFAULT_FORMATTING = 'Context::Default';

function schemaConfigFor(isPrivate: boolean, channelType?: string): { key: string; marks: string[]; nodes: string[] } {
    const key = isPrivate ? PRIVATE_NOTE_FORMATTING : channelType && FORMATTING[channelType] ? channelType : DEFAULT_FORMATTING;
    const formatting = FORMATTING[key];
    return { key, marks: formatting.marks, nodes: formatting.nodes };
}

// Menu theo FORMATTING của constants/editor.js (đã lọc copilot).
const MENU_BY_KEY: Record<string, string[]> = {
    'Channel::Api': ['strong', 'em', 'undo', 'redo'],
    'Context::PrivateNote': ['strong', 'em', 'code', 'link', 'strike', 'bulletList', 'orderedList', 'undo', 'redo'],
    'Context::Default': ['strong', 'em', 'code', 'link', 'strike', 'bulletList', 'orderedList', 'undo', 'redo'],
};

function hasPressedEnterAndNotCmdOrShift(event: KeyboardEvent): boolean {
    return event.key === 'Enter' && !event.metaKey && !event.ctrlKey && !event.shiftKey;
}

function hasPressedCommandAndEnter(event: KeyboardEvent): boolean {
    return (event.metaKey || event.ctrlKey) && event.key === 'Enter';
}

const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
    {
        value,
        editorId,
        placeholder,
        disabled = false,
        isPrivate = false,
        channelType,
        uiSettings,
        className = '',
        onChange,
        onFocus,
        onBlur,
        onSend,
    },
    ref,
) {
    const editorHostRef = useRef<HTMLDivElement>(null);
    const editorRootRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const schemaRef = useRef<Schema | null>(null);

    // Callback mới nhất — tránh phải dựng lại EditorView theo mỗi render.
    const callbacksRef = useRef({ onChange, onFocus, onBlur, onSend, disabled, uiSettings });
    callbacksRef.current = { onChange, onFocus, onBlur, onSend, disabled, uiSettings };

    const contentFromEditor = (): string =>
        viewRef.current ? MessageMarkdownSerializer.serialize(viewRef.current.state.doc) : '';

    const createState = (content: string): EditorState => {
        const config = schemaConfigFor(isPrivate, channelType);
        const schema = buildMessageSchema(config.marks, config.nodes);
        schemaRef.current = schema;
        const sanitized = stripUnsupportedFormatting(content, schema);

        return EditorState.create({
            doc: new MessageMarkdownTransformer(schema).parse(sanitized),
            plugins: buildEditor({
                schema,
                placeholder,
                methods: {},
                plugins: [],
                enabledMenuOptions: MENU_BY_KEY[config.key] ?? MENU_BY_KEY[DEFAULT_FORMATTING],
            }),
        });
    };

    const focusEditorInputField = (position: 'start' | 'end' = 'end') => {
        const view = viewRef.current;
        if (!view) return;
        const selection = position === 'end' ? Selection.atEnd(view.state.doc) : Selection.atStart(view.state.doc);
        view.dispatch(view.state.tr.setSelection(selection));
        view.focus();
    };

    useImperativeHandle(ref, () => ({
        focusEditorInputField,
        insertText: (text: string) => {
            const view = viewRef.current;
            if (!view || !text) return;
            const node = view.state.schema.text(text);
            view.dispatch(view.state.tr.replaceSelectionWith(node, false));
            view.focus();
            callbacksRef.current.onChange(contentFromEditor());
        },
    }));

    // Dựng EditorView; dựng lại khi đổi ngữ cảnh (conversation/chế độ note ↔ reply).
    useEffect(() => {
        if (!editorHostRef.current) return undefined;

        const view = new EditorView(editorHostRef.current, {
            state: createState(value),
            editable: () => !callbacksRef.current.disabled,
            attributes: { class: 'resizable-editor-body' },
            dispatchTransaction: (tx) => {
                const newState = view.state.apply(tx);
                view.updateState(newState);
                if (tx.docChanged) {
                    callbacksRef.current.onChange(MessageMarkdownSerializer.serialize(newState.doc));
                }
            },
            handleDOMEvents: {
                focus: () => {
                    if (!callbacksRef.current.disabled) callbacksRef.current.onFocus?.();
                    return false;
                },
                blur: () => {
                    if (!callbacksRef.current.disabled) callbacksRef.current.onBlur?.();
                    return false;
                },
                keydown: (view_, event) => {
                    if (callbacksRef.current.disabled) return false;
                    const settings = callbacksRef.current.uiSettings;
                    // Enter gửi tin / Cmd+Enter gửi tin theo editor_message_key.
                    if (isEditorHotKeyEnabled(settings, 'enter') && hasPressedEnterAndNotCmdOrShift(event)) {
                        event.preventDefault();
                        callbacksRef.current.onSend?.();
                        return true;
                    }
                    if (isEditorHotKeyEnabled(settings, 'cmd_enter') && hasPressedCommandAndEnter(event)) {
                        event.preventDefault();
                        callbacksRef.current.onSend?.();
                        return true;
                    }
                    return false;
                },
            },
        });

        viewRef.current = view;

        return () => {
            viewRef.current = null;
            view.destroy();
        };
        // Chỉ dựng lại theo ngữ cảnh, không theo value/callback.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editorId, isPrivate, channelType, placeholder]);

    // Đồng bộ value từ ngoài vào (clear sau khi gửi, gắn/gỡ chữ ký).
    useEffect(() => {
        const view = viewRef.current;
        if (!view) return;
        if (value !== contentFromEditor()) {
            view.updateState(createState(value));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    useEffect(() => {
        viewRef.current?.setProps({});
    }, [disabled]);

    return (
        <div
            ref={editorRootRef}
            className={`relative w-full ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''} ${className}`}
        >
            <div ref={editorHostRef} />
        </div>
    );
});

export default Editor;
