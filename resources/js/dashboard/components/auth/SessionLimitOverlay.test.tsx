import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import SessionLimitOverlay from './SessionLimitOverlay';
import type { UserSessionRow } from 'dashboard/settings/profile/ActiveSessions';

// Test bám hành vi của
// SessionLimitOverlay.vue (sắp xếp theo created_at giảm dần, khoá nút khi đang xử lý).
function makeSession(overrides: Partial<UserSessionRow>): UserSessionRow {
    return {
        id: 1,
        browser_name: 'Chrome',
        browser_version: '120.0',
        device_name: 'Unknown',
        platform_name: 'macOS',
        platform_version: '14.0',
        city: null,
        country: null,
        last_activity_at: null,
        created_at: '2026-09-01T10:00:00.000000Z',
        current: false,
        ...overrides,
    };
}

describe('SessionLimitOverlay', () => {
    const sessions = [
        makeSession({ id: 1, browser_name: 'Chrome', created_at: '2026-09-01T10:00:00.000000Z' }),
        makeSession({ id: 2, browser_name: 'Firefox', created_at: '2026-09-05T10:00:00.000000Z' }),
    ];

    it('lists the newest session first', () => {
        render(
            <SessionLimitOverlay
                sessions={sessions}
                onRevoke={vi.fn()}
                onRevokeAll={vi.fn()}
                onCancel={vi.fn()}
            />,
        );

        const labels = screen.getAllByText(/on macOS$/).map(node => node.textContent);
        expect(labels).toEqual(['Firefox on macOS', 'Chrome on macOS']);
    });

    it('reports the session the user chose to end', () => {
        const onRevoke = vi.fn();
        render(
            <SessionLimitOverlay
                sessions={sessions}
                onRevoke={onRevoke}
                onRevokeAll={vi.fn()}
                onCancel={vi.fn()}
            />,
        );

        fireEvent.click(screen.getAllByRole('button', { name: 'End' })[0]);

        expect(onRevoke).toHaveBeenCalledWith(2);
    });

    it('falls back to the unknown device label', () => {
        render(
            <SessionLimitOverlay
                sessions={[makeSession({ browser_name: 'Unknown Browser', platform_name: 'Unknown' })]}
                onRevoke={vi.fn()}
                onRevokeAll={vi.fn()}
                onCancel={vi.fn()}
            />,
        );

        expect(screen.getByText('Unknown device')).toBeInTheDocument();
    });
});
