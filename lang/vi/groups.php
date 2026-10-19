<?php

// Nhóm giữa người dùng Yona: tin hoạt động trong hội thoại nhóm và lỗi khi thao tác.

return [
    'ACTIVITY' => [
        'CREATED' => ':actor đã tạo nhóm ":name"',
        'ADDED' => ':actor đã thêm :members vào nhóm',
        'JOINED_BY_LINK' => ':member đã vào nhóm bằng link mời',
        'LEFT' => ':member đã rời nhóm',
        'REMOVED' => ':actor đã mời :member ra khỏi nhóm',
        'RENAMED' => ':actor đã đổi tên nhóm thành ":name"',
        'MADE_ADMIN' => ':actor đã đặt :member làm quản trị nhóm',
        'REMOVED_ADMIN' => ':actor đã gỡ quyền quản trị của :member',
        'ADMIN_HANDOVER' => ':member trở thành quản trị nhóm',
    ],
    'ERRORS' => [
        'NOT_A_MEMBER' => 'Bạn không còn ở trong nhóm này',
        'NOT_ADMIN' => 'Chỉ quản trị nhóm làm được việc này',
        'NOT_FRIEND' => 'Chỉ thêm trực tiếp được bạn bè của bạn. Người khác vào bằng link mời',
        'USER_NOT_FOUND' => 'Không tìm thấy người dùng này',
        'MEMBER_NOT_FOUND' => 'Người này không có trong nhóm',
        'NO_USERNAME' => 'Bạn cần có @username để vào nhóm',
        'FULL' => 'Nhóm đã đủ :max thành viên',
        'LAST_ADMIN' => 'Nhóm cần còn ít nhất một quản trị',
        'INVALID_ROLE' => 'Vai trò không hợp lệ',
        'INVITE_UNUSABLE' => 'Link mời không còn dùng được',
        'NAME_REQUIRED' => 'Hãy đặt tên cho nhóm',
        'NAME_TOO_LONG' => 'Tên nhóm dài tối đa 100 ký tự',
        'MESSAGE_NOT_YOURS' => 'Bạn chỉ thu hồi được tin của mình',
    ],
];
