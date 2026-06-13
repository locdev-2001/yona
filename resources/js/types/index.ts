import { LucideIcon } from 'lucide-react';

export type WorkspaceRole = 'admin' | 'sales_manager' | 'sales_rep' | 'support_manager' | 'support_agent' | 'marketer' | 'viewer';

export interface Workspace {
    id: string;
    name: string;
    slug: string;
    role?: WorkspaceRole;
    base_currency?: string;
    timezone?: string;
    locale?: string;
}

export interface Membership {
    role: WorkspaceRole;
    team_id: string | null;
    permissions: string[];
}

export interface Auth {
    user: User;
    workspaces: Workspace[];
    membership: Membership | null;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
    badge?: string | number;
    items?: { title: string; url: string; badge?: string | number }[];
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    activeWorkspace: Workspace | null;
    locale: string;
    i18n: Record<string, unknown>;
    flash: { success: string | null; error: string | null };
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}
