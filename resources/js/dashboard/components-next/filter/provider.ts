import { createElement, useEffect, useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';

import ChannelIcon from 'dashboard/components-next/icon/ChannelIcon';
import { getJson } from 'dashboard/helper/apiClient';
import type { DashboardPageProps } from 'dashboard/types';
import { t } from '../../../i18n';
import { groupFilterTypes } from './helper/filterAttributeIcons';
import { CONVERSATION_ATTRIBUTES } from './helper/filterHelper';
import type { FilterOption, FilterSelectOption, FilterType } from './helper/filterHelper';
import languages from './helper/languages';
import { containmentOperators, dateOperators, equalityOperators, presenceOperators } from './operators';

// Port từ components-next/filter/provider.js (useConversationFilterContext).
// Nguồn dữ liệu: inboxes/teams từ shared props, agents qua GET /api/v1/agents,
// contact qua GET /api/v1/contacts/search; labels (B7) / campaigns (C) /
// custom attributes (E1) rỗng cho tới khi port.
interface AgentSummary {
    id: number;
    name: string;
}

interface ContactSummary {
    id: number;
    name?: string | null;
    email?: string | null;
    phone_number?: string | null;
    identifier?: string | null;
}

const contactOptionName = (contact: ContactSummary): string =>
    contact.name || contact.email || contact.phone_number || contact.identifier || t('FILTER.CONTACT_FALLBACK', { id: contact.id });

const searchContactOptions = async (accountId: number, query: string): Promise<FilterOption[]> => {
    const response = await getJson<{ payload?: ContactSummary[] } | ContactSummary[]>(
        `/api/v1/accounts/${accountId}/contacts/search?q=${encodeURIComponent(query)}&page=1`,
    );
    const contacts = Array.isArray(response) ? response : (response.payload ?? []);
    return contacts.map(contact => ({ id: contact.id, name: contactOptionName(contact) }));
};

export function useConversationFilterContext(): (FilterType | FilterSelectOption)[] {
    const { currentAccount, inboxes = [], teams = [] } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const [agents, setAgents] = useState<AgentSummary[]>([]);

    useEffect(() => {
        let cancelled = false;
        getJson<AgentSummary[]>(`/api/v1/accounts/${accountId}/agents`).then(
            list => {
                if (!cancelled) setAgents(list);
            },
            () => undefined,
        );
        return () => {
            cancelled = true;
        };
    }, [accountId]);

    return useMemo(() => {
        const filterTypes: FilterType[] = [
            {
                attributeKey: CONVERSATION_ATTRIBUTES.STATUS,
                value: CONVERSATION_ATTRIBUTES.STATUS,
                attributeName: t('FILTER.ATTRIBUTES.STATUS'),
                label: t('FILTER.ATTRIBUTES.STATUS'),
                inputType: 'multiSelect',
                options: ['open', 'resolved', 'pending', 'snoozed', 'all'].map(id => ({
                    id,
                    name: t(`CHAT_LIST.CHAT_STATUS_FILTER_ITEMS.${id}.TEXT`),
                })),
                dataType: 'text',
                filterOperators: equalityOperators,
                attributeModel: 'standard',
            },
            {
                attributeKey: CONVERSATION_ATTRIBUTES.PRIORITY,
                value: CONVERSATION_ATTRIBUTES.PRIORITY,
                attributeName: t('FILTER.ATTRIBUTES.PRIORITY'),
                label: t('FILTER.ATTRIBUTES.PRIORITY'),
                inputType: 'multiSelect',
                options: ['low', 'medium', 'high', 'urgent'].map(id => ({
                    id,
                    name: t(`CONVERSATION.PRIORITY.OPTIONS.${id.toUpperCase()}`),
                })),
                dataType: 'text',
                filterOperators: equalityOperators,
                attributeModel: 'standard',
            },
            {
                attributeKey: CONVERSATION_ATTRIBUTES.ASSIGNEE_ID,
                value: CONVERSATION_ATTRIBUTES.ASSIGNEE_ID,
                attributeName: t('FILTER.ATTRIBUTES.ASSIGNEE_NAME'),
                label: t('FILTER.ATTRIBUTES.ASSIGNEE_NAME'),
                inputType: 'searchSelect',
                options: agents.map(agent => ({ id: agent.id, name: agent.name })),
                dataType: 'text',
                filterOperators: presenceOperators,
                attributeModel: 'standard',
            },
            {
                attributeKey: CONVERSATION_ATTRIBUTES.INBOX_ID,
                value: CONVERSATION_ATTRIBUTES.INBOX_ID,
                attributeName: t('FILTER.ATTRIBUTES.INBOX_NAME'),
                label: t('FILTER.ATTRIBUTES.INBOX_NAME'),
                inputType: 'searchSelect',
                options: inboxes.map(inbox => ({
                    id: inbox.id,
                    name: inbox.name,
                    icon: createElement(ChannelIcon, { inbox, className: 'size-4' }),
                })),
                dataType: 'text',
                filterOperators: presenceOperators,
                attributeModel: 'standard',
            },
            {
                attributeKey: CONVERSATION_ATTRIBUTES.TEAM_ID,
                value: CONVERSATION_ATTRIBUTES.TEAM_ID,
                attributeName: t('FILTER.ATTRIBUTES.TEAM_NAME'),
                label: t('FILTER.ATTRIBUTES.TEAM_NAME'),
                inputType: 'searchSelect',
                options: teams.map(team => ({ id: team.id, name: team.name })),
                dataType: 'number',
                filterOperators: presenceOperators,
                attributeModel: 'standard',
            },
            {
                attributeKey: CONVERSATION_ATTRIBUTES.CONTACT_ID,
                value: CONVERSATION_ATTRIBUTES.CONTACT_ID,
                attributeName: t('FILTER.ATTRIBUTES.CONTACT'),
                label: t('FILTER.ATTRIBUTES.CONTACT'),
                inputType: 'asyncSearchSelect',
                searchOptions: query => searchContactOptions(accountId, query),
                searchPlaceholder: t('FILTER.CONTACT_SEARCH_PLACEHOLDER'),
                dataType: 'number',
                filterOperators: equalityOperators,
                attributeModel: 'standard',
            },
            {
                attributeKey: CONVERSATION_ATTRIBUTES.DISPLAY_ID,
                value: CONVERSATION_ATTRIBUTES.DISPLAY_ID,
                attributeName: t('FILTER.ATTRIBUTES.CONVERSATION_IDENTIFIER'),
                label: t('FILTER.ATTRIBUTES.CONVERSATION_IDENTIFIER'),
                inputType: 'number',
                dataType: 'number',
                filterOperators: containmentOperators,
                attributeModel: 'standard',
            },
            {
                attributeKey: CONVERSATION_ATTRIBUTES.CAMPAIGN_ID,
                value: CONVERSATION_ATTRIBUTES.CAMPAIGN_ID,
                attributeName: t('FILTER.ATTRIBUTES.CAMPAIGN_NAME'),
                label: t('FILTER.ATTRIBUTES.CAMPAIGN_NAME'),
                inputType: 'searchSelect',
                options: [],
                dataType: 'number',
                filterOperators: presenceOperators,
                attributeModel: 'standard',
            },
            {
                attributeKey: CONVERSATION_ATTRIBUTES.LABELS,
                value: CONVERSATION_ATTRIBUTES.LABELS,
                attributeName: t('FILTER.ATTRIBUTES.LABELS'),
                label: t('FILTER.ATTRIBUTES.LABELS'),
                inputType: 'multiSelect',
                options: [],
                dataType: 'text',
                filterOperators: presenceOperators,
                attributeModel: 'standard',
            },
            {
                attributeKey: CONVERSATION_ATTRIBUTES.BROWSER_LANGUAGE,
                value: CONVERSATION_ATTRIBUTES.BROWSER_LANGUAGE,
                attributeName: t('FILTER.ATTRIBUTES.BROWSER_LANGUAGE'),
                label: t('FILTER.ATTRIBUTES.BROWSER_LANGUAGE'),
                inputType: 'searchSelect',
                options: languages,
                dataType: 'text',
                filterOperators: equalityOperators,
                attributeModel: 'additional',
            },
            {
                attributeKey: CONVERSATION_ATTRIBUTES.REFERER,
                value: CONVERSATION_ATTRIBUTES.REFERER,
                attributeName: t('FILTER.ATTRIBUTES.REFERER_LINK'),
                label: t('FILTER.ATTRIBUTES.REFERER_LINK'),
                inputType: 'plainText',
                dataType: 'text',
                filterOperators: containmentOperators,
                attributeModel: 'additional',
            },
            {
                attributeKey: CONVERSATION_ATTRIBUTES.CREATED_AT,
                value: CONVERSATION_ATTRIBUTES.CREATED_AT,
                attributeName: t('FILTER.ATTRIBUTES.CREATED_AT'),
                label: t('FILTER.ATTRIBUTES.CREATED_AT'),
                inputType: 'date',
                dataType: 'text',
                filterOperators: dateOperators,
                attributeModel: 'standard',
            },
            {
                attributeKey: CONVERSATION_ATTRIBUTES.LAST_ACTIVITY_AT,
                value: CONVERSATION_ATTRIBUTES.LAST_ACTIVITY_AT,
                attributeName: t('FILTER.ATTRIBUTES.LAST_ACTIVITY'),
                label: t('FILTER.ATTRIBUTES.LAST_ACTIVITY'),
                inputType: 'date',
                dataType: 'text',
                filterOperators: dateOperators,
                attributeModel: 'standard',
            },
        ];

        return groupFilterTypes(filterTypes);
    }, [accountId, agents, inboxes, teams]);
}
