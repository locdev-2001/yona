<?php

// English. G1 — repository only has vi + en, never ja.
// Keep keys in sync with lang/vi/email_templates.php.
return [
    'title' => 'Email Templates',
    'subtitle' => 'Manage automated email templates for this workspace.',

    'columns' => [
        'name' => 'Name',
        'slug' => 'Slug',
        'type' => 'Type',
        'language' => 'Language',
        'subject' => 'Subject',
        'active' => 'Status',
    ],

    'form' => [
        'name' => 'Template name',
        'subject' => 'Email subject',
        'body' => 'Body (HTML)',
        'plaintext' => 'Plain text only',
        'active' => 'Active',
        'sort_order' => 'Sort order',
        'test_email' => 'Send test to email',
    ],

    'actions' => [
        'edit' => 'Edit',
        'save' => 'Save changes',
        'test_send' => 'Send test',
        'preview' => 'Preview',
        'toggle' => 'Toggle',
    ],

    'statuses' => [
        'active' => 'Active',
        'inactive' => 'Inactive',
    ],

    'types' => [
        'leads' => 'Leads',
        'clients' => 'Clients',
        'contacts' => 'Contacts',
        'projects' => 'Projects',
        'tasks' => 'Tasks',
        'staff' => 'Staff',
    ],

    'merge_fields' => [
        'title' => 'Available merge fields',
        'description' => 'Click to insert a token at the cursor position.',
        'global' => [
            'company_name' => 'Company name',
            'current_date' => 'Current date',
        ],
    ],

    'preview' => [
        'title' => 'Preview',
        'notice' => 'Preview rendered with sample data.',
    ],

    // Flash messages
    'updated' => 'Email template updated.',
    'test_sent' => 'Test email queued for delivery.',
];
