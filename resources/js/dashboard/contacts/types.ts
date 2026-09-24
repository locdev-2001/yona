// Shape contact phía client — camelCase
// (camelcaseKeys deep, stopPaths custom_attributes).
export interface ContactSocialProfiles {
    facebook?: string;
    github?: string;
    instagram?: string;
    telegram?: string;
    tiktok?: string;
    linkedin?: string;
    twitter?: string;
}

export interface ContactAdditionalAttributes {
    description?: string;
    companyName?: string;
    countryCode?: string;
    country?: string;
    city?: string;
    socialProfiles?: ContactSocialProfiles;
    socialTelegramUserName?: string;
    [key: string]: unknown;
}

export interface ContactInboxSlim {
    sourceId: string;
    inbox: {
        id: number;
        name: string;
        channelType: string;
        avatarUrl?: string | null;
        channelId?: number;
        provider?: string | null;
    };
}

export interface Contact {
    id: number;
    name: string;
    email: string | null;
    phoneNumber: string | null;
    identifier: string | null;
    thumbnail: string;
    blocked?: boolean;
    availabilityStatus: string | null;
    additionalAttributes: ContactAdditionalAttributes;
    customAttributes: Record<string, unknown>;
    createdAt?: number;
    lastActivityAt?: number;
    contactInboxes?: ContactInboxSlim[];
    companyId?: number | string;
}

export interface ContactsMeta {
    count: number;
    currentPage: number;
    hasMore?: boolean;
}

// State của ContactsForm (map FORM_CONFIG của bản gốc).
export interface ContactFormState {
    id: number;
    name: string;
    email: string;
    companyId: number | string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    additionalAttributes: {
        description: string;
        companyName: string;
        countryCode: string;
        country: string;
        city: string;
        socialProfiles: Required<ContactSocialProfiles>;
    };
}
