import type { ResolvedPos } from 'prosemirror-model';

import type { GroupMember } from 'dashboard/conversation/groupMembersApi';
import { searchByRelevance } from 'shared/helpers/searchFold';

// Nhắc tên THÀNH VIÊN NHÓM trên kênh (khác nhắc tên nhân viên ở Lưu ý riêng).
// Editor chèn node mention loại `member`, serializer ghi thành
// `[@Tên](mention://member/<external_id>/<encodeURIComponent(Tên)>)`. Trước khi
// gửi, link đó đổi về chữ `@Tên` + một mục `content_attributes.mentions` — nội
// dung tới khách là chữ thường, tag thật đi bằng siêu dữ liệu.

/** Không có `_` để serializer markdown không chèn `\` vào URI. */
export const MEMBER_MENTION_TYPE = 'member';

export const GROUP_MEMBER_RESULT_LIMIT = 50;

/** `external_id` trung tính của mục nhắc cả nhóm — trùng `OutboundMentionsBuilder::EVERYONE`. */
export const EVERYONE_MENTION_ID = 'all';

/** Chữ chèn vào tin là `@All`, đúng chữ Zalo dùng cho nhắc cả nhóm. */
export const EVERYONE_MENTION_NAME = 'All';

export function isEveryoneMention(member: GroupMember): boolean {
    return member.external_id === EVERYONE_MENTION_ID;
}

/**
 * Mục nhắc cả nhóm đứng đầu bảng khi từ khoá khớp nhãn của kênh (mặc định `All`, Messenger
 * `mọi người`) hoặc một tên gọi bản địa (vd. "Tất cả").
 */
export function withEveryoneMention(
    members: GroupMember[],
    searchKey: string,
    aliases: string[],
    label: string = EVERYONE_MENTION_NAME,
): GroupMember[] {
    const matchesSearch = searchByRelevance([label, EVERYONE_MENTION_NAME, ...aliases], searchKey, alias => alias).length > 0;

    return matchesSearch ? [{ external_id: EVERYONE_MENTION_ID, name: label }, ...members] : members;
}

/** Vị trí theo chỉ số chuỗi JavaScript (UTF-16) — máy chủ neo lại theo nội dung cuối. */
export interface OutgoingMention {
    external_id: string;
    name: string;
    offset: number;
    length: number;
}

const MEMBER_MENTION_OPENER = /\[@((?:\\.|[^\\\]])*)\]\(mention:\/\/member\/((?:\\.|[^\\/\s)])+)\//g;
// Dự phòng khi phần tên mã hoá không khớp đúng tên trên nhãn: lấy tới `)` đầu tiên.
const LOOSE_URI_TAIL = /(?:\\.|[^\\\s)])*\)/y;

function unescapeMarkdown(text: string): string {
    return text.replace(/\\(.)/g, '$1');
}

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Tên mã hoá có thể chứa `(`/`)` (encodeURIComponent không mã hoá chúng) và bị
// serializer chèn `\` trước `*`, `_`, `~`… — so khớp đúng từng ký tự của tên.
function uriTailLength(markdown: string, from: number, name: string): number | null {
    const expected = new RegExp(
        `${Array.from(encodeURIComponent(name), char => `\\\\?${escapeRegExp(char)}`).join('')}\\)`,
        'y',
    );
    expected.lastIndex = from;
    const exact = expected.exec(markdown);
    if (exact) return exact[0].length;

    LOOSE_URI_TAIL.lastIndex = from;
    const loose = LOOSE_URI_TAIL.exec(markdown);
    return loose ? loose[0].length : null;
}

export function extractMemberMentions(markdown: string): { content: string; mentions: OutgoingMention[] } {
    const mentions: OutgoingMention[] = [];
    let content = '';
    let cursor = 0;

    const opener = new RegExp(MEMBER_MENTION_OPENER.source, 'g');
    for (let match = opener.exec(markdown); match; match = opener.exec(markdown)) {
        const name = unescapeMarkdown(match[1]);
        const externalId = unescapeMarkdown(match[2]);
        const tailLength = uriTailLength(markdown, opener.lastIndex, name);
        if (!name.trim() || !externalId || tailLength === null) continue;

        content += markdown.slice(cursor, match.index);
        const needle = `@${name}`;
        mentions.push({ external_id: externalId, name, offset: content.length, length: needle.length });
        content += needle;
        cursor = opener.lastIndex + tailLength;
        opener.lastIndex = cursor;
    }

    return { content: content + markdown.slice(cursor), mentions };
}

/**
 * Cùng luật với ô tìm kiếm: khớp từng từ không dấu, không cần đúng thứ tự (`an binh`
 * ra `Bình An`), tên khớp đúng cụm lên đầu; cùng mức giữ thứ tự máy chủ trả.
 */
export function filterGroupMembers(
    members: GroupMember[],
    searchKey: string,
    limit = GROUP_MEMBER_RESULT_LIMIT,
): GroupMember[] {
    return searchByRelevance(members, searchKey, member => member.name).slice(0, limit);
}

export interface SuggestionMatch {
    range: { from: number; to: number };
    text: string;
}

// Tag đã chèn và xuống dòng mềm là node lá, đọc ra thành `\0`.
const LEAF_PLACEHOLDER = '\0';
const WORD_BOUNDARY = /[\s\0]/;

/**
 * Bộ nhận `@` cho thành viên nhóm: tên thường có nhiều từ nên từ khoá kéo qua khoảng
 * trắng — từ `@` gần nhất trước con trỏ (đứng đầu dòng hoặc sau khoảng trắng) tới hết
 * từ đang gõ. Không ai khớp thì Editor tự ẩn bảng, nên gõ tiếp câu bình thường vẫn ổn.
 */
export function multiWordTriggerMatcher(trigger: string) {
    return ($position: ResolvedPos): SuggestionMatch | null => {
        if ($position.depth === 0) return null;

        const blockStart = $position.start();
        const text = $position.doc.textBetween(blockStart, $position.end(), LEAF_PLACEHOLDER, LEAF_PLACEHOLDER);
        const cursor = $position.pos - blockStart;
        const triggerAt = cursor > 0 ? text.lastIndexOf(trigger, cursor - 1) : -1;

        if (triggerAt === -1 || (triggerAt > 0 && !WORD_BOUNDARY.test(text[triggerAt - 1]))) return null;

        const queryStart = triggerAt + trigger.length;
        if (text.slice(queryStart, cursor).includes(LEAF_PLACEHOLDER)) return null;

        let queryEnd = cursor;
        while (queryEnd < text.length && !WORD_BOUNDARY.test(text[queryEnd]) && !text.startsWith(trigger, queryEnd)) {
            queryEnd++;
        }

        return {
            range: { from: blockStart + triggerAt, to: blockStart + queryEnd },
            text: text.slice(queryStart, queryEnd),
        };
    };
}
