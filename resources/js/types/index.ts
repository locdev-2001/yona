import { LucideIcon } from 'lucide-react';

// ── Custom Fields ─────────────────────────────────────────────────────────────
/** Union of all values the custom-field engine can produce/consume.
 * - string[] for multiselect / checkbox field types
 * - { url?, text? } for link field type
 * Compatible with Inertia v2 FormDataConvertible (array + object branches). */
export type CustomFieldValue = string | number | boolean | null | undefined | string[] | { url?: string; text?: string };
// ──────────────────────────────────────────────────────────────────────────────

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

export interface EntitlementSnapshot {
    flags: string[];
    /** Quota limits per key (e.g. 'quota.conversations.zalo_personal' → 50) */
    quotas: Record<string, number>;
    /** Remaining per quota.conversations.* key for current billing period */
    remaining: Record<string, number>;
}

export interface Membership {
    role: WorkspaceRole;
    team_id: string | null;
    permissions: string[];
    /** Present only when billing module is active; null otherwise */
    entitlements: EntitlementSnapshot | null;
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
    /** P04: in-app notification bell data (unread count + recent 5). */
    notifications?: NotificationsBell | null;
    [key: string]: unknown;
}

// ── P04: Activity, Notifications, Reminders ───────────────────────────────────
export interface ActivityItem {
    id: string;
    action: string;
    message: string;
    payload: Record<string, unknown>;
    actor_name: string | null;
    visible_to_customer: boolean;
    occurred_at: string;
}

export interface NotificationItem {
    id: string;
    action: string | null;
    subject_type: string | null;
    subject_id: string | null;
    payload: Record<string, unknown>;
    link: string | null;
    read_at: string | null;
    created_at: string;
}

export interface NotificationsBell {
    unread: number;
    recent: Pick<NotificationItem, 'id' | 'action' | 'subject_type' | 'subject_id' | 'link' | 'created_at'>[];
}

export interface ReminderItem {
    id: string;
    remindable_type: string;
    remindable_id: string;
    user_id: number;
    description: string;
    remind_at: string;
    is_notified: boolean;
    notified_at: string | null;
    lock_version: number;
}
// ──────────────────────────────────────────────────────────────────────────────

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

// ── P06: Clients + Contacts ───────────────────────────────────────────────────
export interface ClientGroup {
    id: string;
    name: string;
    slug: string;
    clients_count?: number;
}

export interface Contact {
    id: string;
    client_id: string;
    first_name: string;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    title: string | null;
    is_primary: boolean;
    language: string | null;
    custom_fields: Record<string, CustomFieldValue>;
}

export interface Client {
    id: string;
    workspace_id: string;
    owner_id: number | null;
    name: string;
    vat: string | null;
    phone: string | null;
    website: string | null;
    currency: string | null;
    default_language: string | null;
    billing_street: string | null;
    billing_city: string | null;
    billing_state: string | null;
    billing_zip: string | null;
    billing_country: string | null;
    shipping_street: string | null;
    shipping_city: string | null;
    shipping_state: string | null;
    shipping_zip: string | null;
    shipping_country: string | null;
    leadid: string | null;
    custom_fields: Record<string, CustomFieldValue>;
    // Relations (eager-loaded)
    primary_contact?: Contact | null;
    contacts?: Contact[];
    groups?: ClientGroup[];
    owner?: Pick<User, 'id' | 'name'> | null;
    customer_admins?: Pick<User, 'id' | 'name'>[];
    activities?: ActivityItem[];
    tags?: Tag[];
}

export interface Tag {
    id: string;
    name: string;
    slug: string;
    color: string | null;
}

// ── P07: Leads + Pipeline ─────────────────────────────────────────────────────
export interface Pipeline {
    id: string;
    name: string;
    is_default: boolean;
    stages?: PipelineStage[];
}

export interface PipelineStage {
    id: string;
    pipeline_id: string;
    name: string;
    color: string | null;
    stage_order: number;
    probability: number;
    type: 'open' | 'won' | 'lost';
}

export interface LeadSource {
    id: string;
    name: string;
}

export interface Lead {
    id: string;
    workspace_id: string;
    owner_id: number | null;
    team_id: string | null;
    lead_number: number;
    name: string;
    title: string | null;
    email: string | null;
    phone: string | null;
    company: string | null;
    lead_value: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    country: string | null;
    website: string | null;
    description: string | null;
    pipeline_id: string;
    stage_id: string;
    source_id: string | null;
    assigned_to: number | null;
    last_contact: string | null;
    date_converted: string | null;
    converted_client_id: string | null;
    is_junk: boolean;
    is_lost: boolean;
    is_public: boolean;
    lead_order: number;
    last_stage_id: string | null;
    custom_fields: Record<string, CustomFieldValue>;
    lock_version: number;
    created_at: string;
    updated_at: string;
    // Relations (eager-loaded)
    pipeline?: Pipeline | null;
    stage?: PipelineStage | null;
    source?: LeadSource | null;
    assignee?: Pick<User, 'id' | 'name'> | null;
    owner?: Pick<User, 'id' | 'name'> | null;
    converted_client?: Pick<Client, 'id' | 'name'> | null;
    activities?: ActivityItem[];
    tags?: Tag[];
}

export interface KanbanColumn {
    stage: PipelineStage;
    leads: PaginatedLeads;
    total_value: string | number;
}

export interface PaginatedLeads {
    data: Lead[];
    current_page: number;
    last_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
    total: number;
}
// ──────────────────────────────────────────────────────────────────────────────

export interface ClientVaultEntry {
    id: string;
    client_id: string;
    name: string;
    server_address: string | null;
    port: string | null;
    username: string | null;
    description: string | null;
    share_in_projects: boolean;
    visibility: 'private' | 'shared';
}
// ──────────────────────────────────────────────────────────────────────────────

// ── P08: Projects + Milestones ────────────────────────────────────────────────
export interface ProjectStatus {
    id: string;
    name: string;
    color: string | null;
    status_order: number;
}

export interface ProjectMilestone {
    id: string;
    project_id: string;
    name: string;
    color: string | null;
    due_date: string | null;
    milestone_order: number;
    description: string | null;
}

export interface ProjectDiscussion {
    id: string;
    project_id: string;
    subject: string;
    body: string | null;
    show_to_customer: boolean;
    author_id: number | null;
    author?: Pick<User, 'id' | 'name'> | null;
    comments?: ProjectDiscussionReply[];
    created_at: string;
}

export interface ProjectDiscussionReply {
    id: string;
    body: string;
    user_id: number | null;
    parent_id: string | null;
    created_at: string;
    user?: Pick<User, 'id' | 'name'> | null;
}

export interface ProjectAttachment {
    id: string;
    path: string;
    file_name: string | null;
    mime: string | null;
    size: number | null;
    visible_to_customer: boolean;
    attachment_key: string;
    created_at: string;
}

export type ProjectBillingType = 1 | 2 | 3; // 1=fixed, 2=hourly, 3=non_billable

export interface Project {
    id: string;
    workspace_id: string;
    project_number: number;
    name: string;
    description: string | null;
    client_id: string;
    status_id: string | null;
    owner_id: number | null;
    team_id: string | null;
    billing_type: ProjectBillingType;
    start_date: string | null;
    deadline: string | null;
    finished_at: string | null;
    progress: number;
    progress_from_tasks: boolean;
    is_pinned: boolean;
    visible_to_customer: boolean;
    custom_fields: Record<string, CustomFieldValue>;
    created_at: string;
    updated_at: string;
    // Relations (eager-loaded)
    client?: Pick<Client, 'id' | 'name'> | null;
    status?: ProjectStatus | null;
    owner?: Pick<User, 'id' | 'name'> | null;
    team?: Pick<Team, 'id' | 'name'> | null;
    members?: Pick<User, 'id' | 'name'>[];
    milestones?: ProjectMilestone[];
    discussions?: ProjectDiscussion[];
    attachments?: ProjectAttachment[];
    activities?: ActivityItem[];
}

export interface PaginatedProjects {
    data: Project[];
    current_page: number;
    last_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
    total: number;
}

export interface Team {
    id: string;
    name: string;
}
// ──────────────────────────────────────────────────────────────────────────────

// ── P09: Tasks + Timers ───────────────────────────────────────────────────────
export type TaskStatus = 1 | 2 | 3 | 4 | 5; // 1=not_started,2=awaiting,3=testing,4=in_progress,5=complete
export type TaskPriority = 1 | 2 | 3 | 4; // 1=low,2=medium,3=high,4=urgent
export type TaskRelatedType = 'lead' | 'client' | 'project' | 'contact';

export interface TaskAssignee {
    id: number;
    name: string;
    email?: string;
    pivot?: { assigned_by: number | null };
}

export interface TaskChecklistItem {
    id: string;
    task_id: string;
    description: string;
    finished: boolean;
    finished_by: number | null;
    finished_at: string | null;
    assigned_user_id: number | null;
    item_order: number;
    assigned_user?: Pick<User, 'id' | 'name'> | null;
}

export interface TaskTimer {
    id: string;
    task_id: string;
    user_id: number;
    start_time: string;
    end_time: string | null; // null = running
    hourly_rate: string | null;
    note: string | null;
    duration_seconds: number;
    user?: Pick<User, 'id' | 'name'> | null;
}

export interface Task {
    id: string;
    workspace_id: string;
    task_number: number;
    name: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    start_date: string | null;
    due_date: string | null;
    finished_at: string | null;
    related_type: TaskRelatedType | null;
    related_id: string | null;
    milestone_id: string | null;
    billable: boolean;
    billed: boolean;
    hourly_rate: string | null;
    visible_to_customer: boolean;
    kanban_order: number;
    owner_id: number | null;
    custom_fields: Record<string, CustomFieldValue>;
    lock_version: number;
    created_at: string;
    updated_at: string;
    // Relations (eager-loaded)
    assignees?: TaskAssignee[];
    followers?: Pick<User, 'id' | 'name'>[];
    checklist_items?: TaskChecklistItem[];
    timers?: TaskTimer[];
    milestone?: Pick<ProjectMilestone, 'id' | 'name'> | null;
    tags?: Tag[];
    activities?: ActivityItem[];
}

export interface PaginatedTasks {
    data: Task[];
    current_page: number;
    last_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
    total: number;
}

/** Kanban columns grouped by status (TaskStatus → Task[]). */
export type TaskKanbanColumns = Record<string, Task[]>;

// ── P260704: Automation / Workflow Engine ──────────────────────────────────────
/** v1 Node Handler registry (docs/crm-automation-workflow.md §Node Handler registry) — no more, no fewer. */
export type WorkflowNodeType =
    | 'start'
    | 'condition'
    | 'wait'
    | 'end'
    | 'send_message'
    | 'create_task'
    | 'notify_internal'
    | 'tag'
    | 'change_lead_stage';

/** Node config shape is a free-form bag validated per-type server-side (ValidatesWorkflowGraph
 * only checks the envelope, not per-type keys) — kept loose here, narrowed by each inspector form. */
export interface WorkflowGraphNode {
    id: string;
    type: WorkflowNodeType;
    config: Record<string, unknown>;
    /** Layout only — WorkflowEngine never reads this key, but it IS persisted
     * in the graph jsonb column (ValidatesWorkflowGraph.php's position.x/y
     * rules) so the editor doesn't re-scatter every node on each reload. */
    position?: { x: number; y: number };
}

export interface WorkflowGraphEdge {
    from: string;
    to: string;
    /** null for a normal edge; true/false for a condition node's 2 outputs. */
    branch: boolean | null;
}

export interface WorkflowGraph {
    nodes: WorkflowGraphNode[];
    edges: WorkflowGraphEdge[];
}

export interface Workflow {
    id: string;
    workspace_id: string;
    name: string;
    graph: WorkflowGraph;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface WorkflowListItem {
    id: string;
    name: string;
    is_active: boolean;
    updated_at: string;
}
// ──────────────────────────────────────────────────────────────────────────────
