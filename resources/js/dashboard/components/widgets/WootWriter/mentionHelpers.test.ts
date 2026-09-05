import { describe, expect, it } from 'vitest';
import { MessageMarkdownSerializer, buildMessageSchema } from '@chatwoot/prosemirror-schema';

import type { AssignableAgent } from 'dashboard/composables/useAgentsList';
import type { TeamMeta } from 'dashboard/conversation/types';
import MessageFormatter from 'shared/helpers/MessageFormatter';
import { buildMentionItems, countMentionItems } from './mentionHelpers';

const agents: AssignableAgent[] = [
    { id: 12, name: 'Samantha Prabhu', email: 'sam@acme.inc', confirmed: true },
    { id: 13, name: 'John Doe', email: 'john@acme.inc', confirmed: true },
];

const teams: TeamMeta[] = [
    { id: 3, name: 'Sales Team', description: 'Handles sales' },
    { id: 4, name: 'Support', description: null },
];

const GROUPS = { agentsGroupLabel: 'Agents', teamsGroupLabel: 'Teams' };

describe('buildMentionItems', () => {
    it('gộp agent rồi team, mỗi nhóm mang nhãn riêng khi không lọc tab', () => {
        const items = buildMentionItems({ agents, teams, searchKey: '', filter: 'all', ...GROUPS });

        expect(items.map(item => item.id)).toEqual(['user-12', 'user-13', 'team-3', 'team-4']);
        expect(items.map(item => item.group)).toEqual(['Agents', 'Agents', 'Teams', 'Teams']);
    });

    it('lọc theo từ khoá sau @ trên tên, không phân biệt hoa thường và bỏ khoảng trắng thừa', () => {
        const items = buildMentionItems({ agents, teams, searchKey: '  sa ', filter: 'all', ...GROUPS });

        expect(items.map(item => item.id)).toEqual(['user-12', 'team-3']);
    });

    it('tab Agents/Teams chỉ trả nhóm tương ứng và bỏ nhãn nhóm', () => {
        const agentTab = buildMentionItems({ agents, teams, searchKey: '', filter: 'agents', ...GROUPS });
        const teamTab = buildMentionItems({ agents, teams, searchKey: '', filter: 'teams', ...GROUPS });

        expect(agentTab.map(item => item.id)).toEqual(['user-12', 'user-13']);
        expect(agentTab.every(item => item.group === undefined)).toBe(true);
        expect(teamTab.map(item => item.id)).toEqual(['team-3', 'team-4']);
    });

    it('mang email của agent và mô tả của team xuống dòng phụ', () => {
        const [agentItem] = buildMentionItems({ agents, teams, searchKey: 'samantha', filter: 'all', ...GROUPS });
        const [teamItem] = buildMentionItems({ agents, teams, searchKey: 'sales', filter: 'teams', ...GROUPS });

        expect(agentItem.subtitle).toBe('sam@acme.inc');
        expect(agentItem.record).toMatchObject({ type: 'user', displayName: 'Samantha Prabhu' });
        expect(teamItem.subtitle).toBe('Handles sales');
        expect(teamItem.record).toMatchObject({ type: 'team', displayName: 'Sales Team' });
    });

    it('bộ đếm trên tab bám theo cùng từ khoá', () => {
        expect(countMentionItems(agents, teams, '')).toEqual({ agents: 2, teams: 2 });
        expect(countMentionItems(agents, teams, 'su')).toEqual({ agents: 0, teams: 1 });
    });
});

// Cú pháp backend bóc ra (messages/mention_service.rb) — FE phải sinh đúng dạng này.
const MENTION_USER_REGEX = /\(mention:\/\/user\/(\d+)\/(.+?)\)/g;

function serializeMention(attrs: { userId: number; userFullName: string; mentionType: string }): string {
    const schema = buildMessageSchema(
        ['strong', 'em', 'code', 'link', 'strike'],
        ['bulletList', 'orderedList', 'codeBlock', 'blockquote'],
    );
    const doc = schema.node('doc', null, [
        schema.node('paragraph', null, [schema.text('cc '), schema.nodes.mention.create(attrs)]),
    ]);

    return MessageMarkdownSerializer.serialize(doc);
}

describe('nội dung có mention', () => {
    it('node mention serialize thành link mention:// mà backend parse được', () => {
        const content = serializeMention({ userId: 12, userFullName: 'Samantha Prabhu', mentionType: 'user' });

        expect(content).toBe('cc [@Samantha Prabhu](mention://user/12/Samantha%20Prabhu)');
        expect([...content.matchAll(MENTION_USER_REGEX)].map(match => match[1])).toEqual(['12']);
    });

    it('mention team giữ đúng scheme team', () => {
        const content = serializeMention({ userId: 3, userFullName: 'Sales Team', mentionType: 'team' });

        expect(content).toContain('(mention://team/3/Sales%20Team)');
    });
});

describe('nhận diện mention khi hiển thị', () => {
    it('bong bóng tin nhắn đổi link mention:// thành thẻ tô sáng tên', () => {
        const html = new MessageFormatter('cc [@Samantha Prabhu](mention://user/12/Samantha%20Prabhu)')
            .formattedMessage;

        expect(html).toContain('<span class="prosemirror-mention-node">@Samantha Prabhu</span>');
        expect(html).not.toContain('mention://');
    });

    it('link thường vẫn render như link, không thành mention', () => {
        const html = new MessageFormatter('[@Samantha](https://acme.inc)').formattedMessage;

        expect(html).not.toContain('prosemirror-mention-node');
    });
});
