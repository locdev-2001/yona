import { useEffect, useState } from 'react';

import { getJson } from 'dashboard/helper/apiClient';

export type UsernameAvailability = 'idle' | 'checking' | 'available' | 'unavailable' | 'unchanged';

const CHECK_DELAY_MS = 350;

// Hỏi máy chủ tên còn trống không, đợi người dùng ngừng gõ rồi mới hỏi.
// `currentUsername` là tên đang dùng: giữ nguyên thì không cần hỏi.
export function useUsernameAvailability(username: string, currentUsername: string | null) {
    const [status, setStatus] = useState<UsernameAvailability>('idle');

    useEffect(() => {
        const normalized = username.trim().replace(/^@/, '').toLowerCase();

        if (normalized === '') {
            setStatus('idle');
            return;
        }

        if (normalized === currentUsername) {
            setStatus('unchanged');
            return;
        }

        setStatus('checking');
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            getJson<{ available: boolean }>(`/api/v1/usernames/availability?username=${encodeURIComponent(normalized)}`, {
                signal: controller.signal,
            })
                .then(result => setStatus(result.available ? 'available' : 'unavailable'))
                .catch(() => {
                    if (!controller.signal.aborted) setStatus('unavailable');
                });
        }, CHECK_DELAY_MS);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [username, currentUsername]);

    return { status };
}
