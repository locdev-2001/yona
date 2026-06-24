<?php

// P09 — Tasks module strings (English). Mirror of lang/vi/tasks.php.
// G1 — repo only has vi + en, NO ja.
return [
    // Flash messages
    'created' => 'Task created successfully.',
    'updated' => 'Task updated successfully.',
    'deleted' => 'Task deleted.',
    'assigned' => 'Assignees updated.',
    'status_updated' => 'Status updated.',

    // Timer flash
    'timer_started' => 'Timer started.',
    'timer_stopped' => 'Timer stopped.',
    'timer_logged' => 'Time entry logged.',
    'timer_updated' => 'Time entry updated.',
    'timer_deleted' => 'Time entry deleted.',

    // Page titles
    'title' => [
        'index' => 'Tasks',
        'kanban' => 'Kanban Board',
        'show' => 'Task Details',
        'create' => 'Create Task',
        'edit' => 'Edit Task',
        'checklist' => 'Checklist',
        'timers' => 'Timesheets',
    ],

    // Fields
    'fields' => [
        'name' => 'Task Name',
        'description' => 'Description',
        'status' => 'Status',
        'priority' => 'Priority',
        'start_date' => 'Start Date',
        'due_date' => 'Due Date',
        'related_to' => 'Related To',
        'milestone' => 'Milestone',
        'assignees' => 'Assignees',
        'followers' => 'Followers',
        'billable' => 'Billable',
        'hourly_rate' => 'Hourly Rate',
        'visible_to_customer' => 'Visible to Customer',
        'task_number' => 'Task #',
        'note' => 'Note',
        'start_time' => 'Start Time',
        'end_time' => 'End Time',
        'duration' => 'Duration',
    ],

    // Actions
    'actions' => [
        'create' => 'Create Task',
        'edit' => 'Edit',
        'delete' => 'Delete',
        'assign' => 'Assign',
        'change_status' => 'Change Status',
        'start_timer' => 'Start Timer',
        'stop_timer' => 'Stop Timer',
        'log_time' => 'Log Time',
        'search' => 'Search...',
        'add_checklist' => 'Add Checklist Item',
        'toggle_done' => 'Mark Done',
    ],

    // Status labels
    'status' => [
        'not_started' => 'Not Started',
        'awaiting_feedback' => 'Awaiting Feedback',
        'testing' => 'Testing',
        'in_progress' => 'In Progress',
        'complete' => 'Complete',
    ],

    // Priority labels
    'priority' => [
        'low' => 'Low',
        'medium' => 'Medium',
        'high' => 'High',
        'urgent' => 'Urgent',
    ],

    // Filters
    'filters' => [
        'all_statuses' => 'All Statuses',
        'all_priorities' => 'All Priorities',
        'all_assignees' => 'All Assignees',
        'my_tasks' => 'My Tasks',
    ],

    // Kanban
    'kanban' => [
        'title' => 'Kanban Board',
        'drag_hint' => 'Drag to change status',
        'empty_column' => 'No tasks',
    ],

    // Checklist
    'checklist' => [
        'title' => 'Checklist',
        'added' => 'Checklist item added.',
        'deleted' => 'Checklist item deleted.',
        'empty' => 'No checklist items yet.',
        'placeholder' => 'Add checklist item...',
    ],

    // Timesheet / Timer
    'timer' => [
        'title' => 'Timesheets',
        'running' => 'Running',
        'stopped' => 'Stopped',
        'billed_locked' => 'Task is billed — time entries are locked.',
        'manual_entry' => 'Manual Entry',
        'total' => 'Total Time',
        'empty' => 'No time entries yet.',
    ],

    // Related-to types
    'related_type' => [
        'lead' => 'Lead',
        'client' => 'Client',
        'project' => 'Project',
        'contact' => 'Contact',
        'standalone' => 'Standalone',
    ],

    // Notifications
    'notifications' => [
        'assigned' => 'You have been assigned to task: :task_name',
    ],
];
