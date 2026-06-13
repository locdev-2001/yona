import { QueryClient } from '@tanstack/react-query';

// Shared TanStack Query client. Inertia handles page data; use Query for
// incremental/async data (search, infinite lists, polling, mutations).
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});
