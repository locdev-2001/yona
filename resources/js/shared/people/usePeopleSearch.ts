import { useEffect, useState } from 'react';

import { getJson } from 'dashboard/helper/apiClient';
import type { Person } from './person';

const MIN_QUERY_LENGTH = 2;
const SEARCH_DELAY_MS = 250;

type SearchState =
    | { status: 'idle'; people: Person[] }
    | { status: 'loading'; people: Person[] }
    | { status: 'done'; people: Person[] }
    | { status: 'error'; people: Person[] };

// Tìm người theo @username hoặc tên, đợi ngừng gõ rồi mới gọi máy chủ. `friendsOnly`: chỉ
// bạn bè của mình, ô tìm trống thì hiện luôn danh sách bạn bè.
export function usePeopleSearch(query: string, { friendsOnly = false }: { friendsOnly?: boolean } = {}): SearchState {
    const [state, setState] = useState<SearchState>({ status: 'idle', people: [] });

    useEffect(() => {
        const term = query.trim().replace(/^@/, '');

        if (!friendsOnly && term.length < MIN_QUERY_LENGTH) {
            setState({ status: 'idle', people: [] });
            return;
        }

        setState(current => ({ status: 'loading', people: current.people }));
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            const scope = friendsOnly ? '&scope=friends' : '';
            getJson<{ payload: Person[] }>(`/api/v1/users/search?q=${encodeURIComponent(term)}${scope}`, { signal: controller.signal })
                .then(result => setState({ status: 'done', people: result.payload }))
                .catch(() => {
                    if (!controller.signal.aborted) setState({ status: 'error', people: [] });
                });
        }, SEARCH_DELAY_MS);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [query, friendsOnly]);

    return state;
}
