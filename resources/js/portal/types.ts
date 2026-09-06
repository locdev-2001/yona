export interface PortalSearchTranslations {
    searchPlaceholder: string;
    emptyPlaceholder: string;
    loadingPlaceholder: string;
    resultsTitle: string;
    submit: string;
}

export interface PortalConfig {
    portalSlug: string;
    portalColor: string;
    theme: string;
    customDomain: string;
    hostURL: string;
    localeCode: string;
    searchTranslations: PortalSearchTranslations;
    isPlainLayoutEnabled: string;
    tocHeader: string;
}

export interface PortalSearchArticle {
    id: number;
    category_id: number | null;
    title: string;
    content: string;
    link: string;
}

declare global {
    interface Window {
        portalConfig: PortalConfig;
    }
}
