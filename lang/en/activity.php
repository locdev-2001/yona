<?php

// Activity timeline — action keys mapped to English sentences.
return [
    'system_actor' => 'System',

    // ── Reminder ─────────────────────────────────────────────────────────────
    'reminder.due' => 'Reminder: :description',

    // ── Generic / placeholder keys ────────────────────────────────────────────
    'created' => ':actor created',
    'updated' => ':actor updated',
    'deleted' => ':actor deleted',
    'restored' => ':actor restored',
    'assigned' => ':actor assigned to :assignee',
    'unassigned' => ':actor unassigned from :assignee',
    'commented' => ':actor commented',
    'noted' => ':actor added a note',
    'stage_changed' => ':actor moved stage from :from to :to',
    'status_changed' => ':actor changed status from :from to :to',
    'tagged' => ':actor added tag :tag',
    'untagged' => ':actor removed tag :tag',
    'attachment_added' => ':actor attached file :filename',
    'attachment_removed' => ':actor removed attachment :filename',

    // ── Team (M0 test subject) ────────────────────────────────────────────────
    'team.created' => ':actor created team :name',
    'team.updated' => ':actor updated team :name',
    'team.deleted' => ':actor deleted team :name',
];
