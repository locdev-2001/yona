<?php

// Public token page (`/m/{token}`, phase-05 §C): schedule picker, form, order
// tracking, bank transfer, product detail — no login required.

return [
    'not_found' => 'This link is invalid or has expired.',
    'loading' => 'Loading…',
    'send_failed' => 'Could not send, please try again.',
    'submitted_title' => 'Received',
    'submitted_body' => 'Thanks, the shop has received your details.',
    'close' => 'Close',
    'you_can_close_tab' => 'You can close this page now.',
    'open_in_new_tab' => 'Open in a new tab',

    'schedule' => [
        'day_section' => 'Day',
        'time_section' => 'Time slot',
        'full_note' => 'Crossed-out slots are already full.',
        'no_slots' => 'No open time slots right now.',
        'confirm' => 'Confirm {day}, {time}',
        'choose_slot' => 'Choose a time slot',
    ],

    'form' => [
        'submit' => 'Send details',
        'check_field' => 'Check {field}',
    ],

    'order_tracking' => [
        'ref' => 'Order #{ref}',
        'eta' => 'Arrives {date}',
        'fee_included' => 'Shipping included',
        'total' => 'Total',
        'track_order' => 'Track on the website',
        'statuses' => [
            'placed' => 'Placed',
            'confirmed' => 'Confirmed',
            'shipped' => 'Shipped',
            'delivering' => 'On the way',
            'delivered' => 'Delivered',
            'cancelled' => 'Cancelled',
        ],
    ],

    'bank_transfer' => [
        'copy' => 'Copy',
        'copied' => 'Copied',
        'bank_name' => 'Bank',
        'account_number' => 'Account number',
        'account_name' => 'Account name',
        'amount' => 'Amount',
        'transfer_note' => 'Transfer note',
        'instructions' => 'Instructions',
    ],

    'product' => [
        'variant' => 'Variant',
        'quantity' => 'Quantity',
        'max_quantity' => 'Up to {max}',
        'note_label' => 'Note for the shop',
        'note_placeholder' => 'Optional',
        'subtotal' => 'Subtotal',
        'submit' => 'Send order request',
        'select_variant' => 'Choose every variant before ordering',
    ],
];
