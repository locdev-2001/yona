import { picoSearch } from '@chatwoot/pico-search';

import type { Inbox } from 'dashboard/settings/inboxes/types';

// Port từ dashboard/helper/inbox.js (phần dùng cho B1 — voice/twilio helpers
// port cùng kênh của chúng).
export const INBOX_TYPES = {
    WEB: 'Channel::WebWidget',
    FB: 'Channel::FacebookPage',
    TWITTER: 'Channel::TwitterProfile',
    TWILIO: 'Channel::TwilioSms',
    WHATSAPP: 'Channel::Whatsapp',
    API: 'Channel::Api',
    EMAIL: 'Channel::Email',
    TELEGRAM: 'Channel::Telegram',
    LINE: 'Channel::Line',
    SMS: 'Channel::Sms',
    INSTAGRAM: 'Channel::Instagram',
    TIKTOK: 'Channel::Tiktok',
} as const;

const INBOX_ICON_MAP_LINE: Record<string, string> = {
    [INBOX_TYPES.WEB]: 'i-woot-website',
    [INBOX_TYPES.FB]: 'i-woot-messenger',
    [INBOX_TYPES.TWITTER]: 'i-woot-x',
    [INBOX_TYPES.WHATSAPP]: 'i-woot-whatsapp',
    [INBOX_TYPES.API]: 'i-woot-api',
    [INBOX_TYPES.EMAIL]: 'i-woot-mail',
    [INBOX_TYPES.TELEGRAM]: 'i-woot-telegram',
    [INBOX_TYPES.LINE]: 'i-woot-line',
    [INBOX_TYPES.INSTAGRAM]: 'i-woot-instagram',
    [INBOX_TYPES.TIKTOK]: 'i-woot-tiktok',
};

const DEFAULT_ICON_LINE = 'i-ri-chat-1-line';

type IdentifierResolver = (inbox: Inbox) => string | null | undefined;

const INBOX_IDENTIFIER_RESOLVERS: Record<string, IdentifierResolver> = {
    [INBOX_TYPES.WEB]: inbox => inbox.website_url,
    [INBOX_TYPES.EMAIL]: inbox => inbox.email,
    [INBOX_TYPES.WHATSAPP]: inbox => inbox.phone_number,
    [INBOX_TYPES.SMS]: inbox => inbox.phone_number,
    [INBOX_TYPES.API]: inbox => inbox.inbox_identifier,
};

export function getInboxIdentifier(inbox: Inbox | null | undefined): string {
    if (!inbox) return '';
    return INBOX_IDENTIFIER_RESOLVERS[inbox.channel_type]?.(inbox) || '';
}

export function getInboxIconByType(type: string): string {
    return INBOX_ICON_MAP_LINE[type] ?? DEFAULT_ICON_LINE;
}

type SearchableInbox = Inbox & { channel_identifier: string };

export function searchInboxes(inboxes: SearchableInbox[], query: string): SearchableInbox[] {
    const primaryMatches = picoSearch(inboxes, query, ['name', 'channel_type']) as SearchableInbox[];
    const primaryMatchIds = new Set(primaryMatches.map(inbox => inbox.id));
    const identifierMatches = picoSearch(inboxes, query, ['channel_identifier']) as SearchableInbox[];

    return [...primaryMatches, ...identifierMatches.filter(inbox => !primaryMatchIds.has(inbox.id))];
}
