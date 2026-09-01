import MarkdownIt from 'markdown-it';
// @ts-expect-error thư viện không có type definitions
import mila from 'markdown-it-link-attributes';
import type { Options } from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';
import type StateCore from 'markdown-it/lib/rules_core/state_core.mjs';
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs';

// Port từ shared/helpers/MessageFormatter.js + markdownIt/link.js —
// render markdown tin nhắn giống hệt oracle (mention node, link _blank, ảnh resize).

// Xử lý [@mention](mention://user/1/Pranav)
const USER_MENTIONS_REGEX = /mention:\/\/(user|team)\/(\d+)\/(.+)/gm;

function buildMentionTokens() {
    return (state: StateInline, silent: boolean): boolean => {
        let href = '';
        const max = state.posMax;

        if (state.src.charCodeAt(state.pos) !== 0x5b /* [ */) {
            return false;
        }

        const labelStart = state.pos + 1;
        const labelEnd = state.md.helpers.parseLinkLabel(state, state.pos, true);

        if (labelEnd < 0) {
            return false;
        }

        const label = state.src.slice(labelStart, labelEnd);
        let pos = labelEnd + 1;

        if (pos < max && state.src.charCodeAt(pos) === 0x28 /* ( */) {
            pos += 1;
            const res = state.md.helpers.parseLinkDestination(state.src, pos, state.posMax);
            if (res.ok) {
                href = state.md.normalizeLink(res.str);
                if (state.md.validateLink(href)) {
                    pos = res.pos;
                } else {
                    href = '';
                }
            }
            pos += 1;
        }

        if (!href.match(new RegExp(USER_MENTIONS_REGEX))) {
            return false;
        }

        if (!silent) {
            state.pos = labelStart;
            state.posMax = labelEnd;

            const token = state.push('mention', '', 0);
            token.content = label;
        }

        state.pos = pos;
        state.posMax = max;

        return true;
    };
}

function mentionPlugin(md: MarkdownIt): void {
    md.renderer.rules.mention = (tokens: Token[], idx: number) =>
        `<span class="prosemirror-mention-node">${tokens[idx].content}</span>`;
    md.inline.ruler.before('link', 'mention', buildMentionTokens());
}

function setImageSizing(inlineToken: Token): void {
    const imgSrc = inlineToken.attrGet('src');
    if (!imgSrc) return;
    const url = new URL(imgSrc, window.location.origin);
    const width = url.searchParams.get('cw_image_width');
    if (width) {
        inlineToken.attrSet('style', `width: ${width}; max-width: 100%; height: auto;`);
        return;
    }
    const height = url.searchParams.get('cw_image_height');
    if (height) inlineToken.attrSet('style', `height: ${height};`);
}

function imgResizeManager(md: MarkdownIt): void {
    md.core.ruler.after('inline', 'add-image-sizing', (state: StateCore) => {
        state.tokens.forEach((blockToken) => {
            if (blockToken.type === 'inline' && blockToken.children) {
                blockToken.children.forEach((inlineToken) => {
                    if (inlineToken.type === 'image') {
                        setImageSizing(inlineToken);
                    }
                });
            }
        });
        return true;
    });
}

function createMarkdownInstance(linkify = true): MarkdownIt {
    return MarkdownIt({
        html: false,
        xhtmlOut: true,
        breaks: true,
        langPrefix: 'language-',
        linkify,
        typographer: true,
        quotes: '“”‘’',
        maxNesting: 20,
    } as Options)
        .disable(['lheading'])
        .use(mentionPlugin)
        .use(imgResizeManager)
        .use(mila, {
            attrs: {
                class: 'link',
                rel: 'noreferrer noopener nofollow',
                target: '_blank',
            },
        });
}

// Marker nội bộ của bảng Help Center — không bao giờ được lộ ra text.
const COLWIDTHS_MARKER_REGEX = /^[ \t>]*<!--cw-colwidths:[\d,]+-->[ \t]*\r?\n?/gm;

export default class MessageFormatter {
    private readonly message: string;

    private readonly md: MarkdownIt;

    constructor(message: string | null | undefined, linkify = true) {
        this.message = (message || '').replace(COLWIDTHS_MARKER_REGEX, '');
        this.md = createMarkdownInstance(linkify);
    }

    get formattedMessage(): string {
        return this.md.render(this.message);
    }

    get plainText(): string {
        const strippedOutHtml = new DOMParser().parseFromString(this.formattedMessage, 'text/html');
        return strippedOutHtml.body.textContent || '';
    }
}

// Tương đương getPlainText của useMessageFormatter.
export function getPlainText(message: string | null | undefined): string {
    return new MessageFormatter(message).plainText;
}
