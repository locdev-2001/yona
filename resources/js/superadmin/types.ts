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

// Khoá chữ của khung console, khớp lang/{locale}/admin_layout.php nhóm `labels`.
export type ConsoleLabelKey =
    | `resource_description_${string}`
    | 'console_name'
    | 'language'
    | 'close'
    | 'cancel'
    | 'confirm'
    | 'save'
    | 'saving'
    | 'edit'
    | 'delete'
    | 'view'
    | 'actions'
    | 'pagination'
    | 'page_of'
    | 'previous_page'
    | 'next_page'
    | 'open_menu'
    | 'navigation'
    | 'collapse_sidebar'
    | 'expand_sidebar'
    | 'opens_new_tab'
    | 'search'
    | 'search_shortcut_hint'
    | 'command_title'
    | 'command_placeholder'
    | 'command_navigation'
    | 'command_results'
    | 'command_loading'
    | 'command_error'
    | 'command_empty'
    | 'command_min_chars'
    | 'command_footer_navigate'
    | 'command_footer_select'
    | 'command_footer_close'
    | 'result_account'
    | 'result_user'
    | 'result_inbox'
    | 'result_contact'
    | 'user_menu'
    | 'back_to_app'
    | 'logout'
    | 'flash_notice'
    | 'flash_error'
    | 'records_total'
    | 'search_records'
    | 'clear_search'
    | 'filter'
    | 'filter_all'
    | 'new_record'
    | 'no_records'
    | 'no_records_hint'
    | 'sort_by'
    | 'delete_confirm_title'
    | 'delete_confirm_description'
    | 'edit_title'
    | 'new_title'
    | 'create'
    | 'account_overview'
    | 'details'
    | 'enabled'
    | 'disabled'
    | 'yes'
    | 'no'
    | 'show_secret'
    | 'hide_secret'
    | 'copy'
    | 'copied'
    | 'empty_value'
    | 'no_suspension_history'
    | 'resend_confirmation'
    | 'reset_cache_title'
    | 'reset_cache_description'
    | 'reset_cache'
    | 'impersonate_title'
    | 'impersonate_warning'
    | 'impersonate'
    | 'impersonate_reason'
    | 'impersonate_confirm'
    | 'account_users_title'
    | 'account_users_account'
    | 'account_users_user'
    | 'account_users_role'
    | 'account_users_submit'
    | 'mfa'
    | 'settings_title'
    | 'settings_description'
    | 'app_config_title'
    | 'app_config_description'
    | 'instance_status_title'
    | 'instance_status_description'
    | 'login_title'
    | 'login_description'
    | 'login_email'
    | 'login_email_placeholder'
    | 'login_password'
    | 'login_submit';

export type ConsoleNavChild = { key: string; label: string; url: string };

export type ConsoleNavItem = {
    key: string;
    label: string;
    url: string;
    exact?: boolean;
    external?: boolean;
    children?: ConsoleNavChild[];
};

export type ConsoleNavGroup = { key: string; label: string; items: ConsoleNavItem[] };

export type SuperAdminPageProps = {
    superAdmin: {
        locale: string;
        locales: { code: string; label: string; url: string }[];
        installationName: string;
        logo: string;
        logoThumbnail: string;
        version: string;
        navigation: { resource: string; label: string; url: string }[];
        toolPages: { key: string; label: string; url: string }[];
        settingsPages: { key: string; label: string; url: string }[];
        currentPath: string;
        currentUrl?: string;
        navGroups?: ConsoleNavGroup[];
        labels?: Partial<Record<ConsoleLabelKey, string>>;
        dictionary?: { attributes: Record<string, string>; filters: Record<string, string> };
        searchUrl?: string;
        currentUser?: { name: string; email: string } | null;
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
