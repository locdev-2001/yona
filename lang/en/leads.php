<?php

// P07 — Leads module strings (English). Mirror keys from lang/vi/leads.php.
// G1 — repo only has vi + en, NO ja.
return [
    // Page titles
    'title' => [
        'index' => 'Leads',
        'kanban' => 'Kanban Board',
        'create' => 'Add Lead',
        'edit' => 'Edit Lead',
        'show' => 'Lead Details',
        'convert' => 'Convert Lead',
    ],

    // Fields
    'fields' => [
        'name' => 'Name',
        'title' => 'Title',
        'email' => 'Email',
        'phone' => 'Phone',
        'company' => 'Company',
        'lead_value' => 'Value',
        'website' => 'Website',
        'description' => 'Description',
        'pipeline' => 'Pipeline',
        'stage' => 'Stage',
        'source' => 'Source',
        'assigned_to' => 'Assigned To',
        'owner' => 'Owner',
        'last_contact' => 'Last Contact',
        'date_converted' => 'Date Converted',
        'is_public' => 'Public',
        'is_lost' => 'Lost',
        'is_junk' => 'Junk',
        'lead_number' => 'Lead #',
        'custom_fields' => 'Custom Fields',
    ],

    // Address
    'address' => [
        'label' => 'Address',
        'street' => 'Street',
        'city' => 'City',
        'state' => 'State',
        'zip' => 'ZIP / Postal Code',
        'country' => 'Country',
    ],

    // Actions
    'actions' => [
        'create' => 'Add Lead',
        'edit' => 'Edit',
        'delete' => 'Delete',
        'assign' => 'Assign',
        'convert' => 'Convert',
        'mark_lost' => 'Mark as Lost',
        'mark_junk' => 'Mark as Junk',
        'restore' => 'Restore',
        'more' => 'More',
        'move_stage' => 'Move Stage',
        'view_kanban' => 'Kanban View',
        'view_list' => 'List View',
    ],

    // Flash messages
    'flash' => [
        'created' => 'Lead created successfully.',
        'updated' => 'Lead updated.',
        'deleted' => 'Lead deleted.',
        'assigned' => 'Lead assigned.',
        'converted' => 'Lead converted to client.',
        'marked_lost' => 'Lead marked as lost.',
        'marked_junk' => 'Lead marked as junk.',
        'restored' => 'Lead restored.',
        'stage_moved' => 'Lead moved to new stage.',
    ],

    // Activity keys
    'activity' => [
        'lead.created' => ':actor created the lead',
        'lead.updated' => ':actor updated the lead',
        'lead.stage_changed' => ':actor moved the lead to a new stage',
        'lead.assigned' => ':actor assigned the lead',
        'lead.converted' => ':actor converted the lead to a client',
        'lead.marked_lost' => ':actor marked the lead as lost',
        'lead.marked_junk' => ':actor marked the lead as junk',
        'lead.restored' => ':actor restored the lead',
    ],

    // Notification strings
    'notification' => [
        'assigned' => [
            'subject' => 'New lead assigned to you',
            'line' => 'Lead ":lead_name" has been assigned to you by :assigned_by.',
            'action' => 'View lead',
        ],
    ],

    // Errors
    'errors' => [
        'already_converted' => 'This lead has already been converted.',
        'client_not_in_workspace' => 'The selected client does not belong to this workspace.',
        'client_workspace_mismatch' => 'Cannot convert: client workspace does not match.',
    ],

    // Validation
    'validation' => [
        'stage_not_in_pipeline' => 'Stage does not belong to this lead\'s pipeline.',
    ],

    // Convert dialog
    'convert' => [
        'title' => 'Convert Lead to Client',
        'description' => 'Create a client profile and contact from this lead.',
        'create_new_client' => 'Create new client',
        'attach_to' => 'Attach to existing client',
        'client_name' => 'Company name',
        'contact_name' => 'Contact name',
        'submit' => 'Convert',
    ],

    // Kanban
    'kanban' => [
        'no_pipeline' => 'No pipelines found.',
        'empty_stage' => 'No leads here.',
        'total_value' => 'Total value',
    ],

    // Status badges
    'status' => [
        'active' => 'Active',
        'lost' => 'Lost',
        'junk' => 'Junk',
        'converted' => 'Converted',
    ],
];
