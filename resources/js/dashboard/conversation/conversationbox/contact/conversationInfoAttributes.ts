import { getLanguageName } from 'dashboard/components-next/filter/helper/languages';

// Phần thuần của ConversationInfo.vue: dựng danh sách thuộc tính tĩnh (đúng thứ
// tự bản gốc) rồi bỏ mục rỗng. Bản gốc ghép chuỗi trước khi lọc nên browser rỗng
// vẫn còn dấu cách — giữ nguyên để không lệch hành vi.
export interface StaticAttributeElement {
    key: string;
    title: string;
    content: string;
    type: 'static_attribute';
}

type AttributeBag = Record<string, unknown>;

function readString(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function joinNameAndVersion(browser: unknown, nameKey: string, versionKey: string): string {
    if (!browser || typeof browser !== 'object') return '';
    const bag = browser as AttributeBag;

    return `${readString(bag[nameKey])} ${readString(bag[versionKey])}`;
}

export function buildConversationInfoElements(
    conversationAttributes: AttributeBag = {},
    contactAttributes: AttributeBag = {},
): StaticAttributeElement[] {
    const initiatedAt = conversationAttributes.initiated_at as AttributeBag | undefined;
    const browser = conversationAttributes.browser;

    return (
        [
            {
                key: 'static-initiated-at',
                title: 'CONTACT_PANEL.INITIATED_AT',
                content: readString(initiatedAt?.timestamp),
            },
            {
                key: 'static-browser-language',
                title: 'CONTACT_PANEL.BROWSER_LANGUAGE',
                content: getLanguageName(readString(conversationAttributes.browser_language)),
            },
            {
                key: 'static-referer',
                title: 'CONTACT_PANEL.INITIATED_FROM',
                content: readString(conversationAttributes.referer),
            },
            {
                key: 'static-browser',
                title: 'CONTACT_PANEL.BROWSER',
                content: joinNameAndVersion(browser, 'browser_name', 'browser_version'),
            },
            {
                key: 'static-platform',
                title: 'CONTACT_PANEL.OS',
                content: joinNameAndVersion(browser, 'platform_name', 'platform_version'),
            },
            {
                key: 'static-ip-address',
                title: 'CONTACT_PANEL.IP_ADDRESS',
                content: readString(contactAttributes.created_at_ip),
            },
        ] satisfies Omit<StaticAttributeElement, 'type'>[]
    )
        .filter(element => Boolean(element.content))
        .map(element => ({ ...element, type: 'static_attribute' as const }));
}
