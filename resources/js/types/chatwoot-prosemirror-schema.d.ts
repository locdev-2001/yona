// Khai báo type tối thiểu cho @chatwoot/prosemirror-schema (package không có d.ts).
declare module '@chatwoot/prosemirror-schema' {
    import type { Node, Schema } from 'prosemirror-model';
    import type { Plugin } from 'prosemirror-state';

    export { EditorState, Selection } from 'prosemirror-state';
    export { EditorView } from 'prosemirror-view';

    export const messageSchema: Schema;
    export function buildMessageSchema(marks: string[], nodes: string[]): Schema;
    export function buildEditor(options: {
        schema: Schema;
        placeholder?: string;
        methods?: Record<string, unknown>;
        plugins?: Plugin[];
        enabledMenuOptions?: string[];
    }): Plugin[];

    export class MessageMarkdownTransformer {
        constructor(schema: Schema);

        parse(content: string): Node;
    }

    export const MessageMarkdownSerializer: {
        serialize(doc: Node): string;
    };

    export const imageResizeView: unknown;
}

declare module '@chatwoot/utils' {
    export function formatNumber(value: number): string;
    export function trimContent(content: string, maxLength?: number, ellipsis?: boolean): string;
    export function createTypingIndicator(
        onStart: () => void,
        onStop: () => void,
        idleTime: number,
    ): { start: () => void; stop: () => void };
}
