<?php

// Activity timeline — action keys mapped to Vietnamese sentences.
// :actor is replaced with the actor_name snapshot.
// Other :params come from the activity payload.
// M0 seeds common/system keys; M1 phases add entity-specific keys.
return [
    'system_actor' => 'Hệ thống',

    // ── Reminder ─────────────────────────────────────────────────────────────
    'reminder.due' => 'Nhắc nhở: :description',

    // ── Generic / placeholder keys (M1 phases extend these) ──────────────────
    'created' => ':actor đã tạo',
    'updated' => ':actor đã cập nhật',
    'deleted' => ':actor đã xóa',
    'restored' => ':actor đã khôi phục',
    'assigned' => ':actor đã giao cho :assignee',
    'unassigned' => ':actor đã hủy giao cho :assignee',
    'commented' => ':actor đã bình luận',
    'noted' => ':actor đã thêm ghi chú',
    'stage_changed' => ':actor đã chuyển giai đoạn từ :from sang :to',
    'status_changed' => ':actor đã đổi trạng thái từ :from sang :to',
    'tagged' => ':actor đã gắn nhãn :tag',
    'untagged' => ':actor đã gỡ nhãn :tag',
    'attachment_added' => ':actor đã đính kèm tệp :filename',
    'attachment_removed' => ':actor đã xóa tệp đính kèm :filename',

    // ── Team (M0 test subject) ────────────────────────────────────────────────
    'team.created' => ':actor đã tạo nhóm :name',
    'team.updated' => ':actor đã cập nhật nhóm :name',
    'team.deleted' => ':actor đã xóa nhóm :name',
];
