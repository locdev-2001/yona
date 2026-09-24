import type { GroupMember } from 'dashboard/conversation/groupMembersApi';
import { foldSearchText } from 'shared/helpers/searchFold';

// Nhắc tên THÀNH VIÊN NHÓM trên kênh (khác nhắc tên nhân viên ở Lưu ý riêng).
// Editor chèn node mention loại `member`, serializer ghi thành
// `[@Tên](mention://member/<external_id>/<encodeURIComponent(Tên)>)`. Trước khi
// gửi, link đó đổi về chữ `@Tên` + một mục `content_attributes.mentions` — nội
// dung tới khách là chữ thường, tag thật đi bằng siêu dữ liệu.

/** Không có `_` để serializer markdown không chèn `\` vào URI. */
export const MEMBER_MENTION_TYPE = 'member';

export const GROUP_MEMBER_RESULT_LIMIT = 50;

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

/** Lọc không dấu, không phân biệt hoa thường: `binh` khớp `Bình`, `d` khớp `Đạt`. */
export function filterGroupMembers(
    members: GroupMember[],
    searchKey: string,
    limit = GROUP_MEMBER_RESULT_LIMIT,
): GroupMember[] {
    const needle = foldSearchText(searchKey.trim());
    const matched = needle ? members.filter(member => foldSearchText(member.name).includes(needle)) : members;

    return matched.slice(0, limit);
}
