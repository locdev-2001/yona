import { describe, expect, it } from 'vitest';
import {
    MessageMarkdownSerializer,
    MessageMarkdownTransformer,
    buildMessageSchema,
} from '@chatwoot/prosemirror-schema';
import type { Node as ProseMirrorNode } from 'prosemirror-model';

import { MEMBER_MENTION_TYPE, extractMemberMentions, filterGroupMembers } from './groupMemberMentions';

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

    it('lọc không dấu, không phân biệt hoa thường', () => {
        expect(filterGroupMembers(members, 'binh').map(member => member.name)).toEqual(['Bình']);
        expect(filterGroupMembers(members, 'DUNG').map(member => member.name)).toEqual(['Dũng']);
        expect(filterGroupMembers(members, 'd').map(member => member.name)).toEqual(['Dũng', 'Đạt']);
    });

    it('từ khoá rỗng giữ nguyên thứ tự máy chủ trả, tối đa 50 mục', () => {
        expect(filterGroupMembers(members, '')).toEqual(members);

        const many = Array.from({ length: 60 }, (_, index) => ({ external_id: String(index), name: `Khách ${index}` }));
        expect(filterGroupMembers(many, 'khach')).toHaveLength(50);
    });
});
