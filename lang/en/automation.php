<?php

// P260704 — Automation/Workflow Engine strings (English). Mirror in lang/vi/automation.php.
return [
    'created' => 'Workflow created.',
    'updated' => 'Workflow updated.',
    'deleted' => 'Workflow deleted.',
    'enrolled' => 'Workflow run started.',

    'title' => [
        'index' => 'Automation',
        'create' => 'Create workflow',
        'show' => 'Edit workflow',
    ],

    'index' => [
        'create_button' => 'Create workflow',
        'empty' => 'No workflows yet.',
        'column_name' => 'Name',
        'column_status' => 'Status',
        'column_updated' => 'Last updated',
        'status_active' => 'Active',
        'status_inactive' => 'Inactive',
    ],

    'canvas' => [
        'name_placeholder' => 'Workflow name',
        'save' => 'Save',
        'saving' => 'Saving...',
        'delete' => 'Delete workflow',
        'delete_confirm' => 'Delete this workflow? This cannot be undone.',
        'run_manually' => 'Run manually',
        'active_toggle' => 'Active',
        'palette_title' => 'Add node',
        'inspector_title' => 'Node settings',
        'inspector_empty' => 'Select a node on the canvas to configure it.',
        'delete_node' => 'Delete node',
        'validation_no_start' => 'The graph must have exactly one start node.',
        'validation_dangling_edge' => 'A connection points to a node that no longer exists.',
        'validation_start_incoming' => 'The start node cannot have an incoming connection.',
        'branch_true' => 'True',
        'branch_false' => 'False',
        'condition_count' => ':count conditions',
        'recipient_count' => ':count recipients',
        'stage_selected' => 'Stage selected',
    ],

    'node_types' => [
        'start' => 'Start',
        'condition' => 'Condition',
        'wait' => 'Wait',
        'end' => 'End',
        'send_message' => 'Send message',
        'create_task' => 'Create task',
        'notify_internal' => 'Internal notification',
        'tag' => 'Attach/detach tag',
        'change_lead_stage' => 'Change lead stage',
    ],

    'triggers' => [
        'lead_created' => 'When a lead is created',
        'lead_assigned' => 'When a lead is assigned',
        'lead_stage_changed' => 'When a lead changes stage',
        'message_received' => 'When a message arrives',
        'manual' => 'Manual run',
    ],

    'fields' => [
        'trigger' => 'Trigger event',
        'condition_field' => 'Field',
        'condition_operator' => 'Operator',
        'condition_value' => 'Value',
        'add_condition' => 'Add condition',
        'remove_condition' => 'Remove',
        'wait_amount' => 'Amount',
        'wait_unit' => 'Unit',
        'wait_minutes' => 'Minutes',
        'wait_hours' => 'Hours',
        'wait_days' => 'Days',
        'channel' => 'Channel',
        'message_body' => 'Message body',
        'task_name' => 'Task name',
        'task_description' => 'Description',
        'task_priority' => 'Priority',
        'task_due_in_days' => 'Due in (days)',
        'notify_recipients' => 'Recipients',
        'notify_message' => 'Notification message',
        'tag_action' => 'Action',
        'tag_attach' => 'Attach',
        'tag_detach' => 'Detach',
        'tag_name' => 'Tag name',
        'tag_color' => 'Color',
        'pipeline_stage' => 'Stage',
    ],

    'operators' => [
        'equals' => 'Equals',
        'not_equals' => 'Not equals',
        'contains' => 'Contains',
        'greater_than' => 'Greater than',
        'less_than' => 'Less than',
    ],

    'priorities' => [
        'low' => 'Low',
        'medium' => 'Medium',
        'high' => 'High',
        'urgent' => 'Urgent',
    ],

    'enroll' => [
        'title' => 'Run manually',
        'subject_type' => 'Subject type',
        'subject_id' => 'Subject ID',
        'submit' => 'Run',
    ],
];
