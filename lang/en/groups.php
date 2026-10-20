<?php

// Groups between Yona users: activity messages in the group conversation and errors.

return [
    'ACTIVITY' => [
        'CREATED' => ':actor created the group ":name"',
        'ADDED' => ':actor added :members to the group',
        'JOINED_BY_LINK' => ':member joined the group with an invite link',
        'LEFT' => ':member left the group',
        'REMOVED' => ':actor removed :member from the group',
        'RENAMED' => ':actor renamed the group to ":name"',
        'MADE_ADMIN' => ':actor made :member a group admin',
        'REMOVED_ADMIN' => ':actor removed :member as a group admin',
        'ADMIN_HANDOVER' => ':member is now a group admin',
        'AVATAR_CHANGED' => ':actor changed the group picture',
    ],
    'ERRORS' => [
        'NOT_A_MEMBER' => 'You are no longer in this group',
        'NOT_ADMIN' => 'Only group admins can do this',
        'NOT_FRIEND' => 'You can only add your friends directly. Others can join with an invite link',
        'USER_NOT_FOUND' => 'User not found',
        'MEMBER_NOT_FOUND' => 'This person is not in the group',
        'NO_USERNAME' => 'You need a @username to join a group',
        'FULL' => 'The group already has :max members',
        'LAST_ADMIN' => 'The group needs at least one admin',
        'INVALID_ROLE' => 'Invalid role',
        'INVALID_AVATAR' => 'Invalid group picture',
        'INVITE_UNUSABLE' => 'This invite link can no longer be used',
        'NAME_REQUIRED' => 'Give the group a name',
        'NAME_TOO_LONG' => 'Group names can be at most 100 characters',
        'MESSAGE_NOT_YOURS' => 'You can only recall your own messages',
    ],
];
