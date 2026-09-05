// Khai báo type cho đường dẫn sâu @chatwoot/prosemirror-schema/src/mentions/plugin
// (package không có d.ts; Editor.vue gốc cũng import thẳng file nguồn này).
declare module '@chatwoot/prosemirror-schema/src/mentions/plugin' {
    import type { Plugin } from 'prosemirror-state';
    import type { EditorView } from 'prosemirror-view';
    import type { ResolvedPos } from 'prosemirror-model';

    interface SuggestionMatch {
        range: { from: number; to: number };
        text: string;
    }

    interface SuggestionArgs {
        view: EditorView;
        range: { from: number; to: number };
        text?: string;
    }

    export function triggerCharacters(char: string, minChars?: number): ($position: ResolvedPos) => SuggestionMatch | null;

    export function suggestionsPlugin(options: {
        matcher: ($position: ResolvedPos) => SuggestionMatch | null;
        suggestionClass?: string;
        onEnter?: (args: SuggestionArgs) => boolean;
        onChange?: (args: SuggestionArgs) => boolean;
        onExit?: (args: SuggestionArgs) => boolean;
        onKeyDown?: (args: { view: EditorView; event: KeyboardEvent }) => boolean;
    }): Plugin;
}
