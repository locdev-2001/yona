import { LucideIcon } from 'lucide-react';

// ── Announcements ──────────────────────────────────────────────────────────────
export type AnnouncementCategory = 'feature' | 'improvement' | 'fix' | 'announcement' | 'maintenance';
export type AnnouncementStatus = 'draft' | 'published';
export type AnnouncementAudienceType = 'all';

export interface AnnouncementAudience {
    type: AnnouncementAudienceType;
}

export interface Announcement {
    id: string;
    title: string;
    slug: string;
    body_html: string;
    category: AnnouncementCategory;
    status?: AnnouncementStatus;
    published_at: string | null;
    cover_image: string | null;
    audience?: AnnouncementAudience;
    /** Present on the index page response — derived server-side. */
    is_read?: boolean;
}
// ──────────────────────────────────────────────────────────────────────────────

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

export interface AdminIdentity {
    id: number;
    name: string;
    email: string;
    permissions: string[];
}

export interface ImpersonationContext {
    admin_id: number;
    workspace_id: string;
}

export interface Auth {
    admin: AdminIdentity | null;
    user: User | null;
    workspaces: Workspace[];
    membership: Membership | null;
    impersonating: ImpersonationContext | null;
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
    /** Lazy prop — resolved for authenticated web users only; null for guests/admins. */
    unreadAnnouncementCount?: number | null;
    /** Lazy prop — most recent unread announcement payload; null when all read. */
    latestUnreadAnnouncement?: Pick<Announcement, 'id' | 'title' | 'body_html' | 'category' | 'published_at' | 'cover_image' | 'slug'> | null;
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
