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

// Tìm người theo @username hoặc tên, đợi ngừng gõ rồi mới gọi máy chủ.
export function usePeopleSearch(query: string): SearchState {
    const [state, setState] = useState<SearchState>({ status: 'idle', people: [] });

    useEffect(() => {
        const term = query.trim().replace(/^@/, '');

        if (term.length < MIN_QUERY_LENGTH) {
            setState({ status: 'idle', people: [] });
            return;
        }

        setState(current => ({ status: 'loading', people: current.people }));
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            getJson<{ payload: Person[] }>(`/api/v1/users/search?q=${encodeURIComponent(term)}`, { signal: controller.signal })
                .then(result => setState({ status: 'done', people: result.payload }))
                .catch(() => {
                    if (!controller.signal.aborted) setState({ status: 'error', people: [] });
                });
        }, SEARCH_DELAY_MS);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [query]);

    return state;
}
