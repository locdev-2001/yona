// Khai báo type tối thiểu cho @ext/prosemirror-schema (package không có d.ts).
declare module '@ext/prosemirror-schema' {
    import type { Node, Schema } from 'prosemirror-model';
    import type { Plugin } from 'prosemirror-state';

    export { EditorState, Selection } from 'prosemirror-state';
    export { EditorView } from 'prosemirror-view';

    export const messageSchema: Schema;
    export const fullSchema: Schema;
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

    export class ArticleMarkdownTransformer {
        constructor(schema: Schema);

        parse(content: string): Node;
    }

    export const ArticleMarkdownSerializer: {
        serialize(doc: Node): string;
    };

    export const imageResizeView: unknown;
}

declare module '@ext/utils' {
    export function formatNumber(value: number): string;
    export function sanitizeTextForRender(text: string | null | undefined): string;
    export function getRecipients(
        lastEmail: Record<string, unknown> | null | undefined,
        conversationContact: string,
        inboxEmail: string,
        forwardToEmail: string,
    ): { to: string[]; cc: string[]; bcc: string[] };
    export function formatTime(timeInSeconds: number): string;
    export function trimContent(content: string, maxLength?: number, ellipsis?: boolean): string;
    export function createTypingIndicator(
        onStart: () => void,
        onStop: () => void,
        idleTime: number,
    ): { start: () => void; stop: () => void };
    export function downloadFile(options: { url: string; type: string; extension?: string | null }): Promise<void>;
    export function getFileInfo(url: string): { name: string; type: string; base: string };
    export function debounce<T extends (...args: never[]) => void>(
        func: T,
        wait: number,
        immediate?: boolean,
        maxWait?: number,
    ): (...args: Parameters<T>) => void;
    export function calculateCenterOffset(
        mouseX: number,
        mouseY: number,
        rect: DOMRect,
    ): { relativeX: number; relativeY: number };
    export function applyRotationTransform(
        relativeX: number,
        relativeY: number,
        angle: number,
    ): { rotatedX: number; rotatedY: number };
    export function normalizeToPercentage(
        rotatedX: number,
        rotatedY: number,
        width: number,
        height: number,
    ): { x: number; y: number };
}
