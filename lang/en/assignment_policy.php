<?php

return [
    'INDEX' => [
        'HEADER' => [
            'TITLE' => 'Agent assignment',
            'DESCRIPTION' => 'Define policies to effectively manage workload and route conversations based on the needs of inboxes and agents. Learn more here',
        ],
        'ASSIGNMENT_POLICY' => [
            'TITLE' => 'Assignment policy',
            'DESCRIPTION' => 'Manage how conversations get assigned in inboxes.',
            'FEATURES' => [
                0 => 'Assign by conversations evenly or by available capacity',
                1 => 'Add fair distribution rules to avoid overloading any agent',
                2 => 'Add inboxes to a policy - one policy per inbox',
            ],
        ],
        'AGENT_CAPACITY_POLICY' => [
            'TITLE' => 'Agent capacity policy',
            'DESCRIPTION' => 'Manage workload for agents.',
            'FEATURES' => [
                0 => 'Define maximum conversations per inbox',
                1 => 'Create exceptions based on labels and time',
                2 => 'Add agents to a policy - one policy per agent',
            ],
        ],
    ],
    'AGENT_ASSIGNMENT_POLICY' => [
        'INDEX' => [
            'HEADER' => [
                'TITLE' => 'Assignment policy',
                'CREATE_POLICY' => 'New policy',
            ],
            'CARD' => [
                'ORDER' => 'Order',
                'PRIORITY' => 'Priority',
                'ACTIVE' => 'Active',
                'INACTIVE' => 'Inactive',
                'POPOVER' => 'Added inboxes',
                'EDIT' => 'Edit',
            ],
            'NO_RECORDS_FOUND' => 'No assignment policies found',
        ],
        'CREATE' => [
            'HEADER' => [
                'TITLE' => 'Create assignment policy',
            ],
            'CREATE_BUTTON' => 'Create policy',
            'API' => [
                'SUCCESS_MESSAGE' => 'Assignment policy created successfully',
                'ERROR_MESSAGE' => 'Failed to create assignment policy',
                'INBOX_LINKED' => 'Inbox has been linked to the policy',
            ],
        ],
        'EDIT' => [
            'HEADER' => [
                'TITLE' => 'Edit assignment policy',
            ],
            'EDIT_BUTTON' => 'Update policy',
            'CONFIRM_ADD_INBOX_DIALOG' => [
                'TITLE' => 'Add inbox',
                'DESCRIPTION' => '{inboxName} inbox is already linked to another policy. Are you sure you want to link it to this policy? It will be unlinked from the other policy.',
                'CONFIRM_BUTTON_LABEL' => 'Continue',
                'CANCEL_BUTTON_LABEL' => 'Cancel',
            ],
            'INBOX_LINK_PROMPT' => [
                'TITLE' => 'Link inbox to policy',
                'DESCRIPTION' => 'Would you like to link this inbox to the assignment policy?',
                'LINK_BUTTON' => 'Link inbox',
                'CANCEL_BUTTON' => 'Skip',
            ],
            'API' => [
                'SUCCESS_MESSAGE' => 'Assignment policy updated successfully',
                'ERROR_MESSAGE' => 'Failed to update assignment policy',
            ],
            'INBOX_API' => [
                'ADD' => [
                    'SUCCESS_MESSAGE' => 'Inbox added to policy successfully',
                    'ERROR_MESSAGE' => 'Failed to add inbox to policy',
                ],
                'REMOVE' => [
                    'SUCCESS_MESSAGE' => 'Inbox removed from policy successfully',
                    'ERROR_MESSAGE' => 'Failed to remove inbox from policy',
                ],
            ],
        ],
        'FORM' => [
            'NAME' => [
                'LABEL' => 'Policy name:',
                'PLACEHOLDER' => 'Enter policy name',
            ],
            'DESCRIPTION' => [
                'LABEL' => 'Description:',
                'PLACEHOLDER' => 'Enter description',
            ],
            'STATUS' => [
                'LABEL' => 'Status:',
                'PLACEHOLDER' => 'Select status',
                'ACTIVE' => 'Policy is active',
                'INACTIVE' => 'Policy is inactive',
            ],
            'ASSIGNMENT_ORDER' => [
                'LABEL' => 'Assignment order',
                'ROUND_ROBIN' => [
                    'LABEL' => 'Round robin',
                    'DESCRIPTION' => 'Assign conversations evenly among agents.',
                ],
                'BALANCED' => [
                    'LABEL' => 'Balanced',
                    'DESCRIPTION' => 'Assign conversations based on available capacity.',
                    'PREMIUM_MESSAGE' => 'Upgrade to access balanced assignment and agent capacity management.',
                    'PREMIUM_BADGE' => 'Premium',
                ],
            ],
            'ASSIGNMENT_PRIORITY' => [
                'LABEL' => 'Assignment priority',
                'EARLIEST_CREATED' => [
                    'LABEL' => 'Earliest created',
                    'DESCRIPTION' => 'The conversation that was created first gets assigned first.',
                ],
                'LONGEST_WAITING' => [
                    'LABEL' => 'Longest waiting',
                    'DESCRIPTION' => 'The conversation waiting the longest gets assigned first.',
                ],
            ],
            'FAIR_DISTRIBUTION' => [
                'LABEL' => 'Fair distribution policy',
                'DESCRIPTION' => 'Cap conversations per agent within a time window to avoid overload. Defaults to 100 per hour.',
                'INPUT_MAX' => 'Assign max',
                'DURATION' => 'Conversations per agent in every',
            ],
            'EXCLUDE_OLDER_THAN' => [
                'LABEL' => 'Skip stale conversations',
                'DESCRIPTION' => 'Skip unassigned conversations older than this. Defaults to 7 days; clear to disable.',
            ],
            'INBOXES' => [
                'LABEL' => 'Added inboxes',
                'DESCRIPTION' => 'Add inboxes for which this policy will be applicable.',
                'ADD_BUTTON' => 'Add inbox',
                'DROPDOWN' => [
                    'SEARCH_PLACEHOLDER' => 'Search and select inboxes to add',
                    'ADD_BUTTON' => 'Add',
                ],
                'EMPTY_STATE' => 'No inboxes added to this policy, add an inbox to get started',
                'API' => [
                    'SUCCESS_MESSAGE' => 'Inbox successfully added to policy',
                    'ERROR_MESSAGE' => 'Failed to add inbox to policy',
                ],
            ],
        ],
        'DELETE_POLICY' => [
            'SUCCESS_MESSAGE' => 'Assignment policy deleted successfully',
            'ERROR_MESSAGE' => 'Failed to delete assignment policy',
        ],
    ],
    'AGENT_CAPACITY_POLICY' => [
        'INDEX' => [
            'HEADER' => [
                'TITLE' => 'Agent capacity',
                'CREATE_POLICY' => 'New policy',
            ],
            'CARD' => [
                'POPOVER' => 'Added agents',
                'EDIT' => 'Edit',
            ],
            'NO_RECORDS_FOUND' => 'No agent capacity policies found',
        ],
        'CREATE' => [
            'HEADER' => [
                'TITLE' => 'Create agent capacity policy',
            ],
            'CREATE_BUTTON' => 'Create policy',
            'API' => [
                'SUCCESS_MESSAGE' => 'Agent capacity policy created successfully',
                'ERROR_MESSAGE' => 'Failed to create agent capacity policy',
            ],
        ],
        'EDIT' => [
            'HEADER' => [
                'TITLE' => 'Edit agent capacity policy',
            ],
            'EDIT_BUTTON' => 'Update policy',
            'CONFIRM_ADD_AGENT_DIALOG' => [
                'TITLE' => 'Add agent',
                'DESCRIPTION' => '{agentName} is already linked to another policy. Are you sure you want to link it to this policy? It will be unlinked from the other policy.',
                'CONFIRM_BUTTON_LABEL' => 'Continue',
                'CANCEL_BUTTON_LABEL' => 'Cancel',
            ],
            'API' => [
                'SUCCESS_MESSAGE' => 'Agent capacity policy updated successfully',
                'ERROR_MESSAGE' => 'Failed to update agent capacity policy',
            ],
            'AGENT_API' => [
                'ADD' => [
                    'SUCCESS_MESSAGE' => 'Agent added to policy successfully',
                    'ERROR_MESSAGE' => 'Failed to add agent to policy',
                ],
                'REMOVE' => [
                    'SUCCESS_MESSAGE' => 'Agent removed from policy successfully',
                    'ERROR_MESSAGE' => 'Failed to remove agent from policy',
                ],
            ],
            'INBOX_LIMIT_API' => [
                'ADD' => [
                    'SUCCESS_MESSAGE' => 'Inbox limit added successfully',
                    'ERROR_MESSAGE' => 'Failed to add inbox limit',
                ],
                'UPDATE' => [
                    'SUCCESS_MESSAGE' => 'Inbox limit updated successfully',
                    'ERROR_MESSAGE' => 'Failed to update inbox limit',
                ],
                'DELETE' => [
                    'SUCCESS_MESSAGE' => 'Inbox limit deleted successfully',
                    'ERROR_MESSAGE' => 'Failed to delete inbox limit',
                ],
            ],
        ],
        'FORM' => [
            'NAME' => [
                'LABEL' => 'Policy name:',
                'PLACEHOLDER' => 'Enter policy name',
            ],
            'DESCRIPTION' => [
                'LABEL' => 'Description:',
                'PLACEHOLDER' => 'Enter description',
            ],
            'INBOX_CAPACITY_LIMIT' => [
                'LABEL' => 'Inbox capacity limits',
                'ADD_BUTTON' => 'Add inbox',
                'FIELD' => [
                    'SELECT_INBOX' => 'Select inbox',
                    'MAX_CONVERSATIONS' => 'Max conversations',
                    'SET_LIMIT' => 'Set limit',
                ],
                'EMPTY_STATE' => 'No inbox limit set',
            ],
            'EXCLUSION_RULES' => [
                'LABEL' => 'Exclusion rules',
                'DESCRIPTION' => 'Conversations that satisfy the following conditions would not count towards agent capacity',
                'TAGS' => [
                    'LABEL' => 'Exclude conversations tagged with specific labels',
                    'ADD_TAG' => 'add tag',
                    'DROPDOWN' => [
                        'SEARCH_PLACEHOLDER' => 'Search and select tags to add',
                    ],
                    'EMPTY_STATE' => 'No tags added to this policy.',
                ],
                'DURATION' => [
                    'LABEL' => 'Exclude conversations older than a specified duration',
                    'PLACEHOLDER' => 'Set time',
                ],
            ],
            'USERS' => [
                'LABEL' => 'Assigned agents',
                'DESCRIPTION' => 'Add agents for which this policy will be applicable.',
                'ADD_BUTTON' => 'Add agent',
                'DROPDOWN' => [
                    'SEARCH_PLACEHOLDER' => 'Search and select agents to add',
                    'ADD_BUTTON' => 'Add',
                ],
                'EMPTY_STATE' => 'No agents added',
                'API' => [
                    'SUCCESS_MESSAGE' => 'Agent successfully added to policy',
                    'ERROR_MESSAGE' => 'Failed to add agent to policy',
                ],
            ],
        ],
        'DELETE_POLICY' => [
            'SUCCESS_MESSAGE' => 'Agent capacity policy deleted successfully',
            'ERROR_MESSAGE' => 'Failed to delete agent capacity policy',
        ],
    ],
    'DELETE_POLICY' => [
        'TITLE' => 'Delete policy',
        'DESCRIPTION' => 'Are you sure you want to delete this policy? This action cannot be undone.',
        'CONFIRM_BUTTON_LABEL' => 'Delete',
        'CANCEL_BUTTON_LABEL' => 'Cancel',
    ],
];
