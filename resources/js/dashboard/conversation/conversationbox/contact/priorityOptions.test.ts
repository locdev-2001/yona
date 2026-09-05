import { describe, expect, it } from 'vitest';

import { buildPriorityOptions, findPriorityOption, resolvePrioritySelection } from './priorityOptions';

describe('priorityOptions', () => {
    const options = buildPriorityOptions();

    it('giữ đúng thứ tự None/Urgent/High/Medium/Low của ConversationAction.vue', () => {
        expect(options.map(option => option.id)).toEqual([null, 'urgent', 'high', 'medium', 'low']);
        expect(options.map(option => option.name)).toEqual(['None', 'Urgent', 'High', 'Medium', 'Low']);
        expect(options.map(option => option.icon)).toEqual([
            'i-woot-priority-empty',
            'i-woot-priority-urgent',
            'i-woot-priority-high',
            'i-woot-priority-medium',
            'i-woot-priority-low',
        ]);
    });

    it('ánh xạ priority hiện tại sang option tương ứng', () => {
        expect(findPriorityOption(options, 'urgent')).toBe(options[1]);
        expect(findPriorityOption(options, 'low')).toBe(options[4]);
    });

    it('rơi về None khi conversation chưa có priority', () => {
        expect(findPriorityOption(options, null)).toBe(options[0]);
    });

    it('bấm lại mức đang chọn thì gỡ về None', () => {
        expect(resolvePrioritySelection(options, options[2], options[2])).toBe(options[0]);
    });

    it('bấm mức khác thì đổi sang mức đó', () => {
        expect(resolvePrioritySelection(options, options[2], options[4])).toBe(options[4]);
    });

    it('bấm None khi đang None vẫn giữ None', () => {
        expect(resolvePrioritySelection(options, options[0], options[0])).toBe(options[0]);
    });
});
