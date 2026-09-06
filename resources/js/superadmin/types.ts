export type SuperAdminField = {
    name: string;
    label: string;
    type: string;
    html_class: string;
    value: unknown;
};

export type SuperAdminColumn = {
    name: string;
    label: string;
    html_class: string;
};

export type SuperAdminRow = {
    url: string | null;
    destroy_url?: string | null;
    cells: SuperAdminField[];
};

export type SuperAdminPageProps = {
    superAdmin: {
        installationName: string;
        logoThumbnail: string;
        version: string;
        navigation: { resource: string; label: string; url: string }[];
        settingsPages: { key: string; label: string; url: string }[];
        currentPath: string;
    };
    flash?: { notice?: string | null; error?: string | null; alert?: string | null };
    [key: string]: unknown;
};

export type AssociationValue = { label: string; url: string | null } | null;

export type HasOneValue = {
    label: string;
    url: string | null;
    fields: SuperAdminField[];
} | null;

export type HasManyValue = { columns: SuperAdminColumn[]; rows: SuperAdminRow[] };
