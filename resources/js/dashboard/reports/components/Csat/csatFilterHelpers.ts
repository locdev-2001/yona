import { CSAT_RATINGS } from 'shared/constants/messages';

import type { DropdownListItem } from 'dashboard/components/ui/Dropdown/DropdownList';

// Port từ reports/components/Csat/CsatFilterHelpers.js

export type CsatFilterType = 'agents' | 'inboxes' | 'teams' | 'ratings';
export type CsatFilterKey = 'user_ids' | 'inbox_id' | 'team_id' | 'rating';

interface FilterSourceItem {
    id: number;
    name?: string;
    title?: string;
    emoji?: string;
}

export const buildFilterList = (items: FilterSourceItem[], type: CsatFilterType): DropdownListItem[] =>
    items.map(item => ({
        id: item.id,
        name: (type === 'ratings' ? item.emoji : item.name) ?? '',
        type,
    }));

export const buildRatingsList = (translate: (key: string) => string): DropdownListItem[] =>
    CSAT_RATINGS.map(rating => ({
        id: rating.value,
        name: translate(rating.translationKey),
        type: 'ratings',
    }));

export const getActiveFilter = (
    filters: FilterSourceItem[],
    _type: CsatFilterType,
    key: number | string,
): FilterSourceItem | undefined => filters.find(item => item.id.toString() === key.toString());

const KEY_TO_TYPE: Record<CsatFilterKey, CsatFilterType> = {
    user_ids: 'agents',
    inbox_id: 'inboxes',
    team_id: 'teams',
    rating: 'ratings',
};

const TYPE_TO_KEY: Record<CsatFilterType, CsatFilterKey> = {
    agents: 'user_ids',
    inboxes: 'inbox_id',
    teams: 'team_id',
    ratings: 'rating',
};

export const keyToFilterType = (key: CsatFilterKey): CsatFilterType => KEY_TO_TYPE[key];
export const typeToFilterKey = (type: CsatFilterType): CsatFilterKey => TYPE_TO_KEY[type];
