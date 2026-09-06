import { describe, expect, it } from 'vitest';

import { mergeNotifications, sortNotifications } from './helpers';
import type { NotificationRecord } from './types';

function notification(id: number, primaryActorId: number, createdAt: number): NotificationRecord {
    return { id, primary_actor_id: primaryActorId, created_at: createdAt } as NotificationRecord;
}

describe('sortNotifications', () => {
    it('puts the newest first by default', () => {
        const sorted = sortNotifications([notification(1, 1, 100), notification(2, 2, 300)], 'desc');

        expect(sorted.map(record => record.id)).toEqual([2, 1]);
    });

    it('puts the oldest first when asked', () => {
        const sorted = sortNotifications([notification(1, 1, 300), notification(2, 2, 100)], 'asc');

        expect(sorted.map(record => record.id)).toEqual([2, 1]);
    });
});

describe('mergeNotifications', () => {
    it('replaces the older notification of the same conversation', () => {
        const merged = mergeNotifications([notification(1, 7, 100)], [notification(2, 7, 200)]);

        expect(merged.map(record => record.id)).toEqual([2]);
    });

    it('merges fields into an existing record', () => {
        const merged = mergeNotifications(
            [{ ...notification(1, 7, 100), read_at: null } as NotificationRecord],
            [{ ...notification(1, 7, 100), read_at: '2026-09-06T00:00:00Z' } as NotificationRecord],
        );

        expect(merged).toHaveLength(1);
        expect(merged[0].read_at).toBe('2026-09-06T00:00:00Z');
    });

    it('keeps notifications of other conversations', () => {
        const merged = mergeNotifications([notification(1, 7, 100)], [notification(2, 8, 200)]);

        expect(merged.map(record => record.id)).toEqual([1, 2]);
    });
});
