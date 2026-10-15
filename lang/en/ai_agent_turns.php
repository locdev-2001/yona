<?php

// Fixed text the AI agent leaves in a conversation: private notes for staff (no one is
// mentioned) and the standard holding reply sent to the customer, written like a human.
return [
    'notices' => [
        'turn_failed' => ':agent could not handle this message and switched the conversation to manual. Please reply to the customer.',
        'window_closed' => ':agent could not send a reply because the channel reply window is closed.',
        'budget_exhausted' => ':agent paused replies for the rest of today because the daily AI budget is used up. Please reply to the customer.',
    ],
    'handover' => [
        'title' => ':agent handed the conversation to a person (:reason)',
        'reasons' => [
            'binding_info_missing' => 'exact information missing',
            'customer_requested_human' => 'customer asked for a person',
            'complaint' => 'complaint',
            'out_of_scope' => 'out of scope',
            'other' => 'other reason',
        ],
        'default_note' => 'The customer asked for something that needs exact information (price, policy, promotion, stock) and no source was found in the shop data.',
    ],
    'holding_reply' => 'Please give me a moment, I will check and get right back to you.',
];
