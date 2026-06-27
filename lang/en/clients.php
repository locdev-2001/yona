<?php

// P06 — Clients module strings (English). Mirror of lang/vi/clients.php.
// G1 — repo only has vi + en, NO ja.
return [
    // Page titles
    'title' => [
        'index' => 'Clients',
        'create' => 'Add Client',
        'edit' => 'Edit Client',
        'show' => 'Client Details',
        'groups' => 'Client Groups',
    ],

    // Empty states
    'empty' => 'No clients yet.',

    // Fields — client
    'fields' => [
        'name' => 'Company Name',
        'vat' => 'VAT Number',
        'phone' => 'Phone',
        'website' => 'Website',
        'currency' => 'Currency',
        'default_language' => 'Default Language',
        'owner' => 'Owner',
        'groups' => 'Groups',
        'leadid' => 'Source Lead',
    ],

    // Address
    'address' => [
        'billing' => 'Billing Address',
        'shipping' => 'Shipping Address',
        'street' => 'Street',
        'city' => 'City',
        'state' => 'State/Province',
        'zip' => 'ZIP / Postal Code',
        'country' => 'Country',
        'copy_from_billing' => 'Copy from billing address',
    ],

    // Contact fields
    'contact' => [
        'title' => 'Contact',
        'dialog_description' => 'Contact details for this client.',
        'first_name' => 'First Name',
        'last_name' => 'Last Name',
        'email' => 'Email',
        'phone' => 'Phone',
        'job_title' => 'Job Title',
        'language' => 'Language',
        'is_primary' => 'Primary Contact',
        'set_primary' => 'Set as Primary',
        'add' => 'Add Contact',
        'edit' => 'Edit Contact',
        'none' => 'No contacts yet',
        'delete_confirm' => 'Delete this contact?',
    ],

    // Groups
    'group' => [
        'title' => 'Group',
        'dialog_description' => 'Organize clients into groups.',
        'add' => 'Add Group',
        'edit' => 'Edit Group',
        'name' => 'Group Name',
        'slug' => 'Slug',
        'client_count' => ':count clients',
        'empty' => 'No groups yet.',
        'delete_confirm' => 'Delete this group?',
    ],

    // Customer admins
    'customer_admin' => [
        'title' => 'Customer Admins',
        'add' => 'Add Admin',
        'none' => 'No admins assigned',
        'save' => 'Save',
    ],

    // Vault
    'vault' => [
        'title' => 'Vault',
        'dialog_description' => 'Store login and secret credentials for this client.',
        'add' => 'Add Entry',
        'edit' => 'Edit Entry',
        'empty' => 'No vault entries',
        'delete_confirm' => 'Delete this vault entry?',
        'name' => 'Name',
        'server_address' => 'Server Address',
        'port' => 'Port',
        'username' => 'Username',
        'password' => 'Password',
        'description' => 'Description',
        'share_in_projects' => 'Share in Projects',
        'visibility' => 'Visibility',
        'visibility_private' => 'Private',
        'visibility_shared' => 'Shared',
    ],

    // Tabs (show page)
    'tabs' => [
        'profile' => 'Profile',
        'contacts' => 'Contacts',
        'files' => 'Files',
        'notes' => 'Notes',
        'activity' => 'Activity',
        'vault' => 'Vault',
    ],

    // Actions
    'actions' => [
        'create' => 'Add Client',
        'edit' => 'Edit',
        'delete' => 'Delete',
        'delete_confirm' => 'Delete this client?',
        'save' => 'Save',
        'cancel' => 'Cancel',
        'search' => 'Search',
        'filter_by_group' => 'Filter by group',
        'all_groups' => 'All groups',
    ],

    // Flash messages
    'flash' => [
        'created' => 'Client created successfully.',
        'updated' => 'Client updated.',
        'deleted' => 'Client deleted.',
        'contact_added' => 'Contact added.',
        'contact_updated' => 'Contact updated.',
        'contact_deleted' => 'Contact deleted.',
        'primary_changed' => 'Primary contact updated.',
        'group_created' => 'Group created.',
        'group_updated' => 'Group updated.',
        'group_deleted' => 'Group deleted.',
        'admins_updated' => 'Customer admins updated.',
        'vault_created' => 'Vault entry added.',
        'vault_updated' => 'Vault entry updated.',
        'vault_deleted' => 'Vault entry deleted.',
    ],

    // Errors
    'errors' => [
        'customer_admin_not_member' => 'One or more users are not active members of this workspace.',
    ],
];
