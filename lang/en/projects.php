<?php

// P08 — Projects module strings (English). Mirror of lang/vi/projects.php.
// G1 — repo only has vi + en, NO ja.
return [
    // Page titles
    'title' => [
        'index' => 'Projects',
        'create' => 'Create Project',
        'edit' => 'Edit Project',
        'show' => 'Project Details',
        'members' => 'Project Members',
        'milestones' => 'Milestones',
        'files' => 'Files',
        'discussions' => 'Discussions',
        'activity' => 'Activity',
    ],

    // Fields
    'fields' => [
        'name' => 'Project Name',
        'description' => 'Description',
        'client' => 'Client',
        'status' => 'Status',
        'owner' => 'Owner',
        'team' => 'Team',
        'billing_type' => 'Billing Type',
        'start_date' => 'Start Date',
        'deadline' => 'Deadline',
        'progress' => 'Progress',
        'progress_from_tasks' => 'Calculate progress from tasks',
        'visible_to_customer' => 'Visible to customer',
        'is_pinned' => 'Pinned',
        'project_number' => 'Project #',
        'finished_at' => 'Finished At',
    ],

    // Billing types (M3 placeholder labels)
    'billing_types' => [
        'fixed' => 'Fixed Price',
        'hourly' => 'Hourly Rate',
        'non_billable' => 'Non-Billable',
    ],

    // Milestone fields
    'milestone' => [
        'name' => 'Milestone Name',
        'color' => 'Color',
        'due_date' => 'Due Date',
        'description' => 'Description',
        'order' => 'Order',
    ],

    // Discussion / reply fields
    'discussion' => [
        'subject' => 'Subject',
        'body' => 'Content',
        'show_to_customer' => 'Show to customer',
        'reply' => 'Reply',
        'replies' => 'Replies',
    ],

    // Member fields
    'member' => [
        'user' => 'Member',
        'added_at' => 'Added At',
    ],

    // Actions
    'actions' => [
        'create' => 'Create Project',
        'edit' => 'Edit',
        'delete' => 'Delete',
        'add_member' => 'Add Member',
        'remove_member' => 'Remove',
        'add_milestone' => 'Add Milestone',
        'upload_file' => 'Upload File',
        'new_discussion' => 'New Discussion',
        'reply' => 'Reply',
        'change_status' => 'Change Status',
        'pin' => 'Pin',
        'unpin' => 'Unpin',
        'recalc_progress' => 'Recalculate Progress',
        'search' => 'Search...',
    ],

    // Success / info messages
    'messages' => [
        'created' => 'Project created successfully.',
        'updated' => 'Project updated.',
        'deleted' => 'Project deleted.',
        'status_changed' => 'Project status changed.',
        'progress_updated' => 'Progress updated.',
        'progress_recalculated' => 'Progress recalculated from tasks.',
        'member_added' => 'Member added to project.',
        'member_removed' => 'Member removed from project.',
        'milestone_created' => 'Milestone created.',
        'milestone_updated' => 'Milestone updated.',
        'milestone_deleted' => 'Milestone deleted.',
        'file_uploaded' => 'File uploaded.',
        'file_deleted' => 'File deleted.',
        'discussion_opened' => 'Discussion opened.',
        'discussion_deleted' => 'Discussion deleted.',
        'reply_added' => 'Reply added.',
    ],

    // Validation messages
    'validation' => [
        'member_not_active_workspace_member' => 'This user is not an active member of the workspace.',
    ],

    // Activity action keys (for ActivityFormatter / i18n rendering)
    'activity' => [
        'project_created' => 'Project created',
        'project_status_changed' => 'Status changed to :to_status_name',
        'project_member_added' => 'Member #:user_id added to project',
        'project_member_removed' => 'Member #:user_id removed from project',
        'project_milestone_added' => 'Milestone ":milestone_name" added',
        'project_file_uploaded' => 'File uploaded',
        'project_discussion_opened' => 'Discussion ":subject" opened',
        'project_progress_updated' => 'Progress updated to :progress%',
    ],

    // Filters
    'filters' => [
        'all_statuses' => 'All Statuses',
        'pinned_only' => 'Pinned only',
    ],

    // Tabs
    'tabs' => [
        'overview' => 'Overview',
        'members' => 'Members',
        'milestones' => 'Milestones',
        'files' => 'Files',
        'discussions' => 'Discussions',
        'activity' => 'Activity',
    ],

    // Default statuses (seed labels - display only)
    'default_statuses' => [
        'open' => 'Open',
        'in_progress' => 'In Progress',
        'on_hold' => 'On Hold',
        'finished' => 'Finished',
        'closed' => 'Closed',
    ],
];
