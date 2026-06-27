<?php

// English — mirror of lang/vi/custom_fields.php. Keep keys in sync (G1).
return [
    'title' => 'Custom Fields',
    'subtitle' => 'Add custom information fields for each entity type.',
    'dialog_description' => 'Configure the custom field definition below.',

    'field_types' => [
        'input' => 'Short text',
        'number' => 'Number',
        'textarea' => 'Long text',
        'select' => 'Dropdown (single)',
        'multiselect' => 'Dropdown (multi)',
        'checkbox' => 'Checkbox',
        'date' => 'Date',
        'datetime' => 'Date & time',
        'color' => 'Color',
        'link' => 'Link',
    ],

    'entity_types' => [
        'client' => 'Client',
        'contact' => 'Contact',
        'lead' => 'Lead',
        'project' => 'Project',
        'task' => 'Task',
    ],

    'fields' => [
        'name' => 'Field name',
        'field_type' => 'Field type',
        'entity_type' => 'Entity type',
        'options' => 'Options',
        'default_value' => 'Default value',
        'required' => 'Required',
        'active' => 'Active',
        'order' => 'Order',
        'bs_column' => 'Width (1-12)',
        'show_on_table' => 'Show in table',
        'show_on_client_portal' => 'Show on client portal',
        'disallow_client_edit' => 'Disallow client edit',
        'only_admin' => 'Admin only',
        'slug' => 'Slug (identifier)',
        'url' => 'URL',
        'link_text' => 'Link text',
        'add_option' => 'Add option',
    ],

    'flash' => [
        'created' => 'Custom field created.',
        'updated' => 'Custom field updated.',
        'deleted' => 'Custom field deleted.',
    ],

    'errors' => [
        'option_required' => 'This field type requires at least one option.',
        'option_in_list' => 'Field :name contains an invalid value.',
        'option_in_use' => 'Cannot remove option ":option" because it is currently in use.',
        'color_hex' => 'Field :name must be a valid HEX color code (e.g. #FF5733).',
        'link_url' => 'Field :name must have a valid URL.',
        'number_invalid' => 'Field :name must be a number.',
        'date_invalid' => 'Field :name must be in YYYY-MM-DD format.',
        'datetime_invalid' => 'Field :name must be in YYYY-MM-DD HH:MM format.',
        'required' => 'The :name field is required.',
        'immutable' => 'Field type and entity type cannot be changed after creation.',
    ],

    'actions' => [
        'add' => 'Add field',
        'edit' => 'Edit field',
        'delete' => 'Delete field',
        'save' => 'Save',
        'cancel' => 'Cancel',
        'add_option' => 'Add option',
        'delete_confirm' => 'Delete this field? This cannot be undone.',
    ],

    'empty' => 'No custom fields yet.',
    'select_entity' => 'Select entity type',
    'immutable_hint' => 'Field type and entity type cannot be changed after creation.',
];
