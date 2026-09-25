<?php

// Structured messages (app/Messaging/Structured): payload errors and plain-text fallbacks for channels that cannot show cards.

return [
    'errors' => [
        'not_allowed' => 'A :type message cannot be sent in this direction.',
        'not_answerable' => 'A :type message does not accept replies.',
        'unknown_choice' => 'That option is not part of the message.',
        'already_submitted' => 'This message has already been answered.',
        'duplicate_choice' => 'Options must be distinct.',
        'duplicate_item' => 'Card ids must be unique.',
        'invalid_action' => 'Invalid button.',
        'invalid_url' => 'Links must start with http:// or https://.',
        'invalid_phone' => 'Invalid phone number.',
        'invalid_price' => 'Invalid price.',
        'variants_without_order' => 'A card with variants needs an Order button.',
        'unknown_item' => 'The product to order was not found.',
        'invalid_selection' => 'The :name option is invalid or sold out.',
        'quantity_exceeded' => 'Quantity is above the allowed maximum.',
        'field_required' => ':field is required.',
        'field_invalid' => ':field is invalid.',
        'empty_submission' => 'Nothing was submitted.',
        'payload_too_large' => 'The page data is too large.',
    ],
    'cards' => [
        'preview_many' => ':title and :count more',
        'compare_at' => 'was :price, -:percent%',
    ],
    'order_status' => [
        'preview' => 'Order #:ref · :status',
        'eta' => 'Arrives :date',
        'total' => 'Total :amount',
        'tracking' => 'Track: :url',
        'statuses' => [
            'placed' => 'Placed',
            'confirmed' => 'Confirmed',
            'shipped' => 'Shipped',
            'delivering' => 'Out for delivery',
            'delivered' => 'Delivered',
            'cancelled' => 'Cancelled',
        ],
    ],
    'order_request' => [
        'preview' => 'Order request: :title',
        'line' => 'Order request: :title:selection × :quantity',
        'note' => 'Note: :note',
    ],
];
