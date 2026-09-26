import { useEffect, useState } from 'react';

import { getJson } from 'dashboard/helper/apiClient';
import type { MacroOptionSets } from './types';

// Gốc là ba dispatch `agents/get` + `teams/get` + `labels/get` trước khi dựng
// dropdown (MacroEditor.fetchDropdownData) và composables/useMacros đọc lại từ
// store. Ở đây gom về một nguồn: editor và popup xem trước trong hội thoại đọc
// cùng một bộ lựa chọn, mỗi account nạp một lần.
export const EMPTY_OPTION_SETS: MacroOptionSets = { agents: [], teams: [], labels: [], cannedCards: [] };

let cachedAccountId = 0;
let cachedOptionSets: MacroOptionSets = EMPTY_OPTION_SETS;
let pending: Promise<MacroOptionSets> | null = null;

export function loadMacroOptionSets(accountId: number): Promise<MacroOptionSets> {
    if (cachedAccountId === accountId) return Promise.resolve(cachedOptionSets);
    if (pending) return pending;

    pending = Promise.all([
        getJson<Array<{ id: number; name: string }>>(`/api/v1/accounts/${accountId}/agents`),
        getJson<Array<{ id: number; name: string }>>(`/api/v1/accounts/${accountId}/teams`),
        getJson<{ payload: Array<{ id: number; title: string; color: string }> }>(`/api/v1/accounts/${accountId}/labels`),
        getJson<Array<{ id: number; short_code: string; content_type: string | null }>>(
            `/api/v1/accounts/${accountId}/canned_responses`,
        ),
    ])
        .then(([agents, teams, labelResponse, cannedResponses]) => {
            cachedOptionSets = {
                agents: agents.map(item => ({ id: item.id, name: item.name })),
                teams: teams.map(item => ({ id: item.id, name: item.name })),
                labels: (labelResponse.payload ?? []).map(item => ({ id: item.title, name: item.title, color: item.color })),
                cannedCards: cannedResponses
                    .filter(item => item.content_type)
                    .map(item => ({ id: item.id, name: `/${item.short_code}` })),
            };
            cachedAccountId = accountId;
            return cachedOptionSets;
        })
        .finally(() => {
            pending = null;
        });

    return pending;
}

export function useMacroOptionSets(accountId: number): MacroOptionSets {
    const [optionSets, setOptionSets] = useState<MacroOptionSets>(cachedOptionSets);

    useEffect(() => {
        let active = true;
        loadMacroOptionSets(accountId).then(
            sets => {
                if (active) setOptionSets(sets);
            },
            () => undefined,
        );
        return () => {
            active = false;
        };
    }, [accountId]);

    return optionSets;
}
