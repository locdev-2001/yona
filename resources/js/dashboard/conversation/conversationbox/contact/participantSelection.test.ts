import { describe, expect, it } from 'vitest';

import type { AgentMeta } from '../../types';
import {
    isParticipating,
    remainingParticipantCount,
    thumbnailParticipants,
    toggleParticipant,
} from './participantSelection';

const agent = (id: number): AgentMeta => ({ id, name: `Agent ${id}` });
const five = [agent(1), agent(2), agent(3), agent(4), agent(5)];

describe('participantSelection', () => {
    it('thêm agent chưa có vào cuối danh sách', () => {
        expect(toggleParticipant([agent(1)], agent(2)).map(item => item.id)).toEqual([1, 2]);
    });

    it('bấm lại agent đang có thì gỡ khỏi danh sách', () => {
        expect(toggleParticipant([agent(1), agent(2)], agent(1)).map(item => item.id)).toEqual([2]);
    });

    it('không sửa mảng gốc', () => {
        const participants = [agent(1)];
        toggleParticipant(participants, agent(2));
        expect(participants).toHaveLength(1);
    });

    it('chỉ hiện 4 avatar đầu, phần dư đếm riêng', () => {
        expect(thumbnailParticipants(five).map(item => item.id)).toEqual([1, 2, 3, 4]);
        expect(remainingParticipantCount(five)).toBe(1);
        expect(remainingParticipantCount([agent(1)])).toBe(-3);
    });

    it('nhận biết mình có đang tham gia hay không', () => {
        expect(isParticipating(five, 3)).toBe(true);
        expect(isParticipating(five, 42)).toBe(false);
    });
});
