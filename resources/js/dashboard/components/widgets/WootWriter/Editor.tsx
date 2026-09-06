import { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
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
import { suggestionsPlugin, triggerCharacters } from '@chatwoot/prosemirror-schema/src/mentions/plugin';
import type { Node as ProseMirrorNode, Schema } from 'prosemirror-model';
import type { Plugin } from 'prosemirror-state';
import { createTypingIndicator } from '@chatwoot/utils';

import CannedResponse from 'dashboard/components/widgets/conversation/CannedResponse';
import type { CaretPosition } from './CaretAnchoredPicker';
import TagAgents from './TagAgents';
import type { MentionRecord } from './mentionHelpers';
import { FORMATTING, stripUnsupportedFormatting } from 'dashboard/helper/editorHelper';
import { isEditorHotKeyEnabled, type UISettings } from 'dashboard/composables/useUISettings';

// Port từ dashboard/components/widgets/WootWriter/Editor.vue — giữ nguyên
// engine @chatwoot/prosemirror-schema (quyết định plan: KHÔNG viết lại editor).
// B10 thêm nhánh gợi ý `/` (canned response), B11 thêm nhánh `@` (nhắc tên).
// Vẫn bỏ: variables {{ }} (D1), macros # (D3), emoji gõ ':' , upload ảnh inline
// (B9), copilot + công cụ Captain (EE).

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
    enableSuggestions?: boolean;
    enableCannedResponses?: boolean;
    onChange: (value: string) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    onSend?: () => void;
    onTypingOn?: () => void;
    onTypingOff?: () => void;
    onToggleCannedMenu?: (isOpen: boolean) => void;
    onToggleUserMention?: (isOpen: boolean) => void;
}

interface SuggestionRange {
    from: number;
    to: number;
}

interface SuggestionArgs {
    view: EditorView;
    range: SuggestionRange;
    text?: string;
}

// insertAtCursor của helper/editorHelper.js — giữ nguyên mẹo bóc paragraph để
// nội dung chèn nằm cùng dòng thay vì xuống dòng mới.
function insertAtCursor(view: EditorView, node: ProseMirrorNode, from: number, to?: number): void {
    const isWrappedInParagraph =
        node.type.name === 'doc' && node.childCount === 1 && node.firstChild?.type.name === 'paragraph';
    const content = isWrappedInParagraph ? node.firstChild!.content : node;

    const tr = to
        ? view.state.tr.replaceWith(from, to, content).insertText(' ')
        : view.state.tr.insert(from, content);

    view.updateState(view.state.apply(tr));
    view.focus();
}

const TYPING_INDICATOR_IDLE_TIME = 4000;

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
    'Context::NoToolbar': [],
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
        enableSuggestions = true,
        enableCannedResponses = true,
        onChange,
        onFocus,
        onBlur,
        onSend,
        onTypingOn,
        onTypingOff,
        onToggleCannedMenu,
        onToggleUserMention,
    },
    ref,
) {
    const editorHostRef = useRef<HTMLDivElement>(null);
    const editorRootRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const schemaRef = useRef<Schema | null>(null);

    const [showCannedMenu, setShowCannedMenu] = useState(false);
    const [cannedSearchKey, setCannedSearchKey] = useState('');
    const [showUserMentions, setShowUserMentions] = useState(false);
    const [mentionSearchKey, setMentionSearchKey] = useState('');
    const [suggestionRange, setSuggestionRange] = useState<SuggestionRange | null>(null);

    // Callback mới nhất — tránh phải dựng lại EditorView theo mỗi render.
    const callbacksRef = useRef({ onChange, onFocus, onBlur, onSend, onTypingOn, onTypingOff, disabled, uiSettings });
    callbacksRef.current = { onChange, onFocus, onBlur, onSend, onTypingOn, onTypingOff, disabled, uiSettings };

    // Plugin gợi ý được dựng lại mỗi lần createState chạy nên phải đọc cờ qua ref.
    const suggestionFlagsRef = useRef({ isPrivate, enableCannedResponses });
    suggestionFlagsRef.current = { isPrivate, enableCannedResponses };

    // keyup → typingOn (một lần) rồi tự typingOff sau 4s không gõ; blur → typingOff ngay.
    const typingIndicatorRef = useRef(
        createTypingIndicator(
            () => callbacksRef.current.onTypingOn?.(),
            () => callbacksRef.current.onTypingOff?.(),
            TYPING_INDICATOR_IDLE_TIME,
        ),
    );

    const contentFromEditor = (): string =>
        viewRef.current ? MessageMarkdownSerializer.serialize(viewRef.current.state.doc) : '';

    // createSuggestionPlugin của Editor.vue — một khuôn cho mọi ký tự kích hoạt.
    const createSuggestionPlugin = ({
        trigger,
        setShowMenu,
        setSearchTerm,
        isAllowed,
    }: {
        trigger: string;
        setShowMenu: (isOpen: boolean) => void;
        setSearchTerm: (term: string) => void;
        isAllowed: () => boolean;
    }): Plugin =>
        suggestionsPlugin({
            matcher: triggerCharacters(trigger, 0),
            suggestionClass: '',
            onEnter: (args: SuggestionArgs) => {
                if (!isAllowed()) return false;
                viewRef.current = args.view;
                setSuggestionRange(args.range);
                setSearchTerm(args.text || '');
                setShowMenu(true);
                return false;
            },
            onChange: (args: SuggestionArgs) => {
                viewRef.current = args.view;
                setSuggestionRange(args.range);
                setSearchTerm(args.text || '');
                return false;
            },
            onExit: () => {
                setSearchTerm('');
                setShowMenu(false);
                return false;
            },
            onKeyDown: () => false,
        }) as Plugin;

    const buildSuggestionPlugins = (): Plugin[] => {
        if (!enableSuggestions) return [];

        return [
            // Gốc còn một plugin `@` nữa cho công cụ Captain (EE, không port); nhánh
            // nhắc tên của nó luôn được phép vì `enableCaptainTools` bằng false.
            createSuggestionPlugin({
                trigger: '@',
                setShowMenu: setShowUserMentions,
                setSearchTerm: setMentionSearchKey,
                isAllowed: () => true,
            }),
            createSuggestionPlugin({
                trigger: '/',
                setShowMenu: setShowCannedMenu,
                setSearchTerm: setCannedSearchKey,
                isAllowed: () => {
                    const flags = suggestionFlagsRef.current;
                    return !flags.isPrivate && flags.enableCannedResponses;
                },
            }),
        ];
    };

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
                plugins: buildSuggestionPlugins(),
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
                keyup: () => {
                    if (!callbacksRef.current.disabled) typingIndicatorRef.current.start();
                    return false;
                },
                focus: () => {
                    if (!callbacksRef.current.disabled) callbacksRef.current.onFocus?.();
                    return false;
                },
                blur: () => {
                    if (callbacksRef.current.disabled) return false;
                    typingIndicatorRef.current.stop();
                    callbacksRef.current.onBlur?.();
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
            typingIndicatorRef.current.stop();
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

    const shouldShowCannedResponses = enableCannedResponses && showCannedMenu && !isPrivate;
    // shouldShowUserMentions gốc: chỉ hiện khi đang soạn ghi chú riêng.
    const shouldShowUserMentions = showUserMentions && isPrivate;

    useEffect(() => {
        onToggleCannedMenu?.(shouldShowCannedResponses);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldShowCannedResponses]);

    useEffect(() => {
        onToggleUserMention?.(shouldShowUserMentions);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldShowUserMentions]);

    // Neo popup vào ký tự kích hoạt: ô soạn thảo có thể cao hơn dòng đang gõ nhiều.
    const caretPosition = useMemo<CaretPosition | null>(() => {
        const view = viewRef.current;
        const root = editorRootRef.current;
        if (!view || !suggestionRange || !root) return null;

        const from = Math.min(suggestionRange.from, view.state.doc.content.size);
        const { top, bottom } = view.coordsAtPos(from);
        return { top: top - root.getBoundingClientRect().top, height: bottom - top };
    }, [suggestionRange]);

    // Popup tự giữ focus; đóng lại thì trả focus về editor. Gợi ý vẫn còn hiệu lực
    // trong tài liệu nên chỉ mở lại khi gõ ký tự kích hoạt lần nữa.
    const dismissPicker = (setShowMenu: (isOpen: boolean) => void) => () => {
        setShowMenu(false);
        viewRef.current?.focus();
    };

    const dismissCannedResponses = dismissPicker(setShowCannedMenu);
    const dismissUserMentions = dismissPicker(setShowUserMentions);

    // Xóa ký tự kích hoạt → plugin tự đóng popup qua onExit.
    const removeSuggestionTrigger = () => {
        const view = viewRef.current;
        if (!view || !suggestionRange) return;
        const end = Math.min(suggestionRange.to, view.state.doc.content.size);
        view.dispatch(view.state.tr.delete(suggestionRange.from, end));
        view.focus();
    };

    // insertSpecialContent('cannedResponse', …) + nodeCreators.cannedResponse.
    const insertCannedResponse = (content: string) => {
        const view = viewRef.current;
        if (!view || !suggestionRange) return;

        const schema = view.state.schema;
        const node = new MessageMarkdownTransformer(schema).parse(stripUnsupportedFormatting(content, schema));
        const from = node.textContent === content ? suggestionRange.from : suggestionRange.from - 1;

        insertAtCursor(view, node, from, suggestionRange.to);
        callbacksRef.current.onChange(contentFromEditor());
    };

    // insertSpecialContent('mention', …) + nodeCreators.mention — node `mention` do
    // MessageMarkdownSerializer đổi thành `[@Tên](mention://user/{id}/{Tên})`, đúng
    // cú pháp messages/mention_service.rb bóc ra.
    const insertMention = (record: MentionRecord) => {
        const view = viewRef.current;
        if (!view || !suggestionRange) return;

        const node = view.state.schema.nodes.mention.create({
            userId: record.id,
            userFullName: record.displayName,
            mentionType: record.type,
        });

        insertAtCursor(view, node, suggestionRange.from, suggestionRange.to);
        callbacksRef.current.onChange(contentFromEditor());
    };

    return (
        <div
            ref={editorRootRef}
            className={`relative w-full ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''} ${className}`}
        >
            <div ref={editorHostRef} />
            {shouldShowUserMentions ? (
                <TagAgents
                    caretPosition={caretPosition}
                    searchKey={mentionSearchKey}
                    onSelectAgent={insertMention}
                    onClose={dismissUserMentions}
                    onRemoveTrigger={removeSuggestionTrigger}
                />
            ) : null}
            {shouldShowCannedResponses ? (
                <CannedResponse
                    caretPosition={caretPosition}
                    searchKey={cannedSearchKey}
                    schema={schemaRef.current}
                    onReplace={insertCannedResponse}
                    onClose={dismissCannedResponses}
                    onRemoveTrigger={removeSuggestionTrigger}
                />
            ) : null}
        </div>
    );
});

export default Editor;
