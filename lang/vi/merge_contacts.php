<?php

// Bản dịch tiếng Việt của lang/en/merge_contacts.php.
// Nguồn: bản dịch `vi` của Chatwoot v4.17.1 (dashboard/widget/survey + config/locales/vi.yml);
// khóa Chatwoot chưa dịch và khóa riêng Yona được dịch mới trong đợt G3.

return [
    'TITLE' => 'Hợp nhất các liên hệ',
    'DESCRIPTION' => 'Hợp nhất các liên hệ để kết hợp hai hồ sơ thành một, bao gồm tất cả các thuộc tính và hội thoại. Trong trường hợp xung đột, các thuộc tính của liên hệ Chính sẽ được ưu tiên.',
    'PRIMARY' => [
        'TITLE' => 'Liên hệ chính',
        'HELP_LABEL' => 'Sẽ được xoá',
    ],
    'PARENT' => [
        'TITLE' => 'Liên hệ cần gộp',
        'PLACEHOLDER' => 'Tìm kiếm liên hệ',
        'HELP_LABEL' => 'Được giữ',
    ],
    'SUMMARY' => [
        'TITLE' => 'Tóm tắt',
        'DELETE_WARNING' => 'Liên hệ của <strong>{primaryContactName}</strong> sẽ bị xoá.',
        'ATTRIBUTE_WARNING' => 'Chi tiết liên hệ của <strong>{primaryContactName}</strong> sẽ được sao chép đến <strong>{parentContactName}</strong>.',
    ],
    'SEARCH' => [
        'ERROR_MESSAGE' => 'Có lỗi xảy ra. Bạn hãy thử lại sau.',
    ],
    'FORM' => [
        'SUBMIT' => ' Hợp nhất các liên hệ',
        'CANCEL' => 'Huỷ',
        'CHILD_CONTACT' => [
            'ERROR' => 'Chọn một liên hệ con để gộp',
        ],
        'SUCCESS_MESSAGE' => 'Liên hệ được gộp thành công',
        'ERROR_MESSAGE' => 'Không thể hợp nhất liên lạc, thử lại!',
    ],
    'DROPDOWN_ITEM' => [
        'ID' => '(ID: {identifier})',
    ],
];
