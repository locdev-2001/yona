import { describe, expect, it } from 'vitest';
import {
    MessageMarkdownSerializer,
    MessageMarkdownTransformer,
    buildMessageSchema,
} from '@chatwoot/prosemirror-schema';
import { triggerCharacters } from '@chatwoot/prosemirror-schema/src/mentions/plugin';
import type { Node as ProseMirrorNode } from 'prosemirror-model';

import {
    MEMBER_MENTION_TYPE,
    extractMemberMentions,
    filterGroupMembers,
    multiWordTriggerMatcher,
} from './groupMemberMentions';

const schema = buildMessageSchema(
    ['strong', 'em', 'code', 'link', 'strike'],
    ['bulletList', 'orderedList', 'codeBlock', 'blockquote'],
);

type Inline = string | { id: string; name: string; type?: string };

// Dựng đúng markdown mà ô soạn sinh ra khi agent chọn thành viên trong bảng.
function composed(...parts: Inline[]): string {
    const inline: ProseMirrorNode[] = parts.map(part =>
        typeof part === 'string'
            ? schema.text(part)
            : schema.nodes.mention.create({
                  userId: part.id,
                  userFullName: part.name,
                  mentionType: part.type ?? MEMBER_MENTION_TYPE,
              }),
    );

    return MessageMarkdownSerializer.serialize(schema.node('doc', null, [schema.node('paragraph', null, inline)]));
}

describe('extractMemberMentions', () => {
    it('node member serialize ra mention://member và đổi về chữ @Tên + một mục mentions', () => {
        const markdown = composed({ id: '555', name: 'Bình' }, ' ơi');

        expect(markdown).toBe('[@Bình](mention://member/555/B%C3%ACnh) ơi');
        expect(extractMemberMentions(markdown)).toEqual({
            content: '@Bình ơi',
            mentions: [{ external_id: '555', name: 'Bình', offset: 0, length: 5 }],
        });
    });

    it.each(['Hà_My', 'An*Shop*', 'Ngọc [Sỉ]', 'Tú~', 'Nhi `vip`', 'Dũng 😀', 'An (Sale)', 'A\\B'])(
        'giải đúng tên "%s" dù serializer chèn dấu \\',
        name => {
            const { content, mentions } = extractMemberMentions(composed('cc ', { id: '9', name }, ' nhé'));

            expect(content).toBe(`cc @${name} nhé`);
            expect(mentions).toEqual([{ external_id: '9', name, offset: 3, length: name.length + 1 }]);
        },
    );

    it('emoji đứng trước → offset theo chỉ số chuỗi JavaScript', () => {
        const { content, mentions } = extractMemberMentions(composed('😀 ', { id: '1', name: 'An' }));

        expect(content).toBe('😀 @An');
        expect(mentions[0]).toMatchObject({ offset: 3, length: 3 });
        expect(content.slice(mentions[0].offset, mentions[0].offset + mentions[0].length)).toBe('@An');
    });

    it('hai người trong một tin', () => {
        const { content, mentions } = extractMemberMentions(
            composed({ id: '1', name: 'Bình' }, ' và ', { id: '2', name: 'An' }, ' xem giúp'),
        );

        expect(content).toBe('@Bình và @An xem giúp');
        expect(mentions.map(({ external_id, offset }) => [external_id, offset])).toEqual([
            ['1', 0],
            ['2', 9],
        ]);
    });

    it('nhắc tên nhân viên và link thường giữ nguyên, không vào mentions', () => {
        const markdown = `${composed({ id: '12', name: 'Lộc', type: 'user' })} xem [trang](https://yona.vn)`;

        expect(extractMemberMentions(markdown)).toEqual({ content: markdown, mentions: [] });
    });

    it('không có nhắc tên → nội dung y nguyên', () => {
        expect(extractMemberMentions('**Dạ** còn hàng ạ')).toEqual({ content: '**Dạ** còn hàng ạ', mentions: [] });
    });

    it('nháp khôi phục (link thay cho node) vẫn giải được', () => {
        const markdown = composed({ id: '555', name: 'Hà_My' }, ' ơi');
        const restored = MessageMarkdownSerializer.serialize(new MessageMarkdownTransformer(schema).parse(markdown));

        expect(extractMemberMentions(restored).mentions).toEqual([
            { external_id: '555', name: 'Hà_My', offset: 0, length: 6 },
        ]);
    });
});

describe('filterGroupMembers', () => {
    const members = [
        { external_id: '1', name: 'Bình' },
        { external_id: '2', name: 'Dũng' },
        { external_id: '3', name: 'Đạt' },
        { external_id: '4', name: 'An' },
    ];

    const names = (searchKey: string, list = members) => filterGroupMembers(list, searchKey).map(member => member.name);

    it('lọc không dấu, không phân biệt hoa thường', () => {
        expect(names('binh')).toEqual(['Bình']);
        expect(names('DUNG')).toEqual(['Dũng']);
        expect(names('d')).toEqual(['Dũng', 'Đạt']);
    });

    describe('nhiều từ, cùng luật với ô tìm kiếm', () => {
        const group = [
            { external_id: '1', name: 'Nguyễn Văn Bình' },
            { external_id: '2', name: 'Trần Thị An' },
            { external_id: '3', name: 'Anh Bình' },
            { external_id: '4', name: 'Bình An' },
            { external_id: '5', name: 'Lê Đức' },
            { external_id: '6', name: 'An Bình Dương' },
        ];

        it('khớp từng từ dù không liền nhau hay đảo thứ tự: "an binh" ra "Bình An"', () => {
            expect(names('an binh', group)).toContain('Bình An');
            expect(names('binh an', group)).toContain('Bình An');
            expect(names('an duc', group)).toEqual([]);
        });

        it('tên khớp đúng cụm lên đầu, rồi đủ từ trọn, rồi từ nằm trong từ dài hơn', () => {
            expect(names('an binh', group)).toEqual(['An Bình Dương', 'Bình An', 'Nguyễn Văn Bình', 'Anh Bình']);
            expect(names('binh an', group)).toEqual(['Bình An', 'An Bình Dương', 'Nguyễn Văn Bình', 'Anh Bình']);
        });

        it('gõ có dấu hay không dấu, hoa hay thường ra cùng một danh sách', () => {
            expect(names('BÌNH  An', group)).toEqual(names('binh an', group));
        });

        it('xếp hạng trước rồi mới cắt 50 mục: tên khớp đúng cụm nằm cuối danh sách vẫn lọt vào', () => {
            const crowded = [
                ...Array.from({ length: 60 }, (_, index) => ({ external_id: String(index), name: `Anh Bình ${index}` })),
                { external_id: 'x', name: 'Bình An' },
            ];

            expect(names('binh an', crowded)[0]).toBe('Bình An');
        });
    });

    it('từ khoá rỗng giữ nguyên thứ tự máy chủ trả, tối đa 50 mục', () => {
        expect(filterGroupMembers(members, '')).toEqual(members);

        const many = Array.from({ length: 60 }, (_, index) => ({ external_id: String(index), name: `Khách ${index}` }));
        expect(filterGroupMembers(many, 'khach')).toHaveLength(50);
    });
});

// Đoạn văn một dòng trong ô soạn; `|` trong phần chữ là vị trí con trỏ.
function resolveCursor(...parts: Inline[]) {
    let cursor = -1;
    let offset = 0;
    const inline: ProseMirrorNode[] = [];

    for (const part of parts) {
        if (typeof part === 'string') {
            const caret = part.indexOf('|');
            const text = part.replace('|', '');
            if (caret !== -1) cursor = offset + caret;
            if (text) inline.push(schema.text(text));
            offset += text.length;
        } else {
            inline.push(schema.nodes.mention.create({ userId: part.id, userFullName: part.name, mentionType: MEMBER_MENTION_TYPE }));
            offset += 1;
        }
    }

    const doc = schema.node('doc', null, [schema.node('paragraph', null, inline)]);
    const paragraphStart = 1;

    return doc.resolve(paragraphStart + cursor);
}

describe('multiWordTriggerMatcher', () => {
    const matchMember = multiWordTriggerMatcher('@');
    const matchSingleWord = triggerCharacters('@', 0);
    const queryAt = (...parts: Inline[]) => matchMember(resolveCursor(...parts))?.text ?? null;

    it('từ khoá kéo qua khoảng trắng từ @ tới con trỏ', () => {
        expect(queryAt('@an binh|')).toBe('an binh');
        expect(queryAt('Chào @Bình An|')).toBe('Bình An');
        expect(matchMember(resolveCursor('Chào @an binh|'))?.range).toEqual({ from: 6, to: 14 });
    });

    it('con trỏ giữa câu chỉ lấy tới hết từ đang gõ, không nuốt phần câu phía sau', () => {
        expect(queryAt('@an| binh ơi')).toBe('an');
        expect(queryAt('@an bi|nh ơi')).toBe('an binh');
        expect(matchMember(resolveCursor('@an bi|nh ơi'))?.range).toEqual({ from: 1, to: 9 });
    });

    it('tag đã chèn nằm giữa @ và con trỏ thì không còn là từ khoá', () => {
        expect(queryAt('@an ', { id: '555', name: 'Bình' }, ' binh|')).toBeNull();
        expect(queryAt({ id: '555', name: 'Bình' }, ' @an binh|')).toBe('an binh');
    });

    it('@ dính liền chữ phía trước (email) không mở gợi ý', () => {
        expect(queryAt('gửi a@shop vn|')).toBeNull();
    });

    it.each<[string, Inline[]]>([
        ['giữa một từ', ['@bi|nh ơi']],
        ['chỉ có @', ['@|']],
        ['con trỏ trước @', ['|@an']],
        ['@ trong email', ['gửi a@b|']],
        ['sau lời chào', ['Chào @bi|']],
        ['ngay sau tag', [{ id: '555', name: 'Bình' }, '@bi|']],
        ['hai @ liền nhau', ['@a|@b']],
        ['@ thứ hai trong câu', ['@an @bi|']],
    ])('khi không có khoảng trắng thì y hệt bộ nhận một từ: %s', (_, parts) => {
        const $position = resolveCursor(...parts);

        expect(matchMember($position)).toEqual(matchSingleWord($position));
    });
});
