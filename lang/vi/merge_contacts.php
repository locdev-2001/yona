<?php

// Bản dịch tiếng Việt của lang/en/merge_contacts.php.

return [
    'TITLE' => 'Gộp hồ sơ',
    'DESCRIPTION' => 'Gộp hai hồ sơ thành một, gồm mọi thuộc tính và hội thoại. Nếu có xung đột, thuộc tính của hồ sơ chính được ưu tiên.',
    'PRIMARY' => [
        'TITLE' => 'Hồ sơ chính',
        'HELP_LABEL' => 'Sẽ được xoá',
    ],
    'PARENT' => [
        'TITLE' => 'Hồ sơ cần gộp',
        'PLACEHOLDER' => 'Tìm hồ sơ',
        'HELP_LABEL' => 'Được giữ',
    ],
    'SUMMARY' => [
        'TITLE' => 'Tóm tắt',
        'DELETE_WARNING' => 'Hồ sơ của <strong>{primaryContactName}</strong> sẽ bị xoá.',
        'ATTRIBUTE_WARNING' => 'Thông tin của <strong>{primaryContactName}</strong> sẽ được chép sang <strong>{parentContactName}</strong>.',
    ],
    'SEARCH' => [
        'ERROR_MESSAGE' => 'Có lỗi xảy ra. Bạn hãy thử lại sau.',
    ],
    'FORM' => [
        'SUBMIT' => ' Gộp hồ sơ',
        'CANCEL' => 'Huỷ',
        'CHILD_CONTACT' => [
            'ERROR' => 'Chọn một hồ sơ để gộp',
        ],
        'SUCCESS_MESSAGE' => 'Đã gộp hồ sơ',
        'ERROR_MESSAGE' => 'Chưa gộp được hồ sơ, bạn hãy thử lại!',
    ],
    'DROPDOWN_ITEM' => [
        'ID' => '(ID: {identifier})',
    ],
];
