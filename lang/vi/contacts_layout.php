<?php

// Bản dịch tiếng Việt của lang/en/contacts_layout.php.

return [
    'HEADER' => [
        'TITLE' => 'Bạn bè',
        'SEARCH_TITLE' => 'Tìm người',
        'ACTIVE_TITLE' => 'Đang hoạt động',
        'SEARCH_PLACEHOLDER' => 'Tìm kiếm...',
        'MESSAGE_BUTTON' => 'Tin nhắn',
        'SEND_MESSAGE' => 'Gửi tin nhắn',
        'BLOCK_CONTACT' => 'Chặn',
        'UNBLOCK_CONTACT' => 'Bỏ chặn',
        'BREADCRUMB' => [
            'CONTACTS' => 'Bạn bè',
        ],
        'ACTIONS' => [
            'CONTACT_CREATION' => [
                'ADD_CONTACT' => 'Thêm người',
                'EXPORT_CONTACT' => 'Xuất danh sách',
                'IMPORT_CONTACT' => 'Nhập danh sách',
                'SAVE_CONTACT' => 'Lưu',
                'EMAIL_ADDRESS_DUPLICATE' => 'Email này đã có ở một hồ sơ khác.',
                'PHONE_NUMBER_DUPLICATE' => 'Số điện thoại này đã có ở một hồ sơ khác.',
                'SUCCESS_MESSAGE' => 'Đã lưu',
                'ERROR_MESSAGE' => 'Chưa lưu được. Bạn hãy thử lại sau.',
            ],
            'BLOCK_SUCCESS_MESSAGE' => 'Đã chặn người này',
            'BLOCK_ERROR_MESSAGE' => 'Chưa chặn được. Bạn hãy thử lại sau.',
            'UNBLOCK_SUCCESS_MESSAGE' => 'Đã bỏ chặn người này',
            'UNBLOCK_ERROR_MESSAGE' => 'Chưa bỏ chặn được. Bạn hãy thử lại sau.',
            'IMPORT_CONTACT' => [
                'TITLE' => 'Nhập danh sách',
                'DESCRIPTION' => 'Nhập danh sách từ một tệp CSV.',
                'DOWNLOAD_LABEL' => 'Tải xuống tệp CSV mẫu.',
                'LABEL' => 'Tệp CSV:',
                'CHOOSE_FILE' => 'Chọn tệp',
                'CHANGE' => 'Đổi',
                'CANCEL' => 'Huỷ',
                'IMPORT' => 'Nhập',
                'SUCCESS_MESSAGE' => 'Chúng tôi sẽ gửi email báo cho bạn khi nhập xong.',
                'ERROR_MESSAGE' => 'Đã có lỗi, vui lòng thử lại',
                'STATUS' => [
                    'PENDING' => 'Đang chờ tới lượt nhập...',
                    'PROCESSING' => 'Đang nhập danh sách...',
                    'COMPLETED' => 'Đã nhập {processed} trên {total} dòng.',
                    'FAILED' => 'Nhập danh sách thất bại.',
                ],
                'DOWNLOAD_FAILED_RECORDS' => 'Tải về những dòng không nhập được',
            ],
            'EXPORT_CONTACT' => [
                'TITLE' => 'Xuất danh sách',
                'DESCRIPTION' => 'Xuất nhanh một tệp CSV gồm đầy đủ thông tin những người trong danh sách của bạn',
                'CONFIRM' => 'Xuất',
                'SUCCESS_MESSAGE' => 'Đang xuất danh sách. Khi tệp sẵn sàng, chúng tôi sẽ gửi email kèm đường dẫn tải về cho bạn.',
                'ERROR_MESSAGE' => 'Đã có lỗi, vui lòng thử lại',
            ],
            'SORT_BY' => [
                'LABEL' => 'Sắp bởi',
                'OPTIONS' => [
                    'NAME' => 'Tên',
                    'EMAIL' => 'Email',
                    'PHONE_NUMBER' => 'Số điện thoại',
                    'COMPANY' => 'Công ty',
                    'COUNTRY' => 'Quốc gia',
                    'CITY' => 'Tỉnh / Thành phố',
                    'LAST_ACTIVITY' => 'Hành động cuối cùng',
                    'CREATED_AT' => 'Tạo vào lúc',
                ],
            ],
            'ORDER' => [
                'LABEL' => 'Sắp xếp',
                'OPTIONS' => [
                    'ASCENDING' => 'Tăng dần',
                    'DESCENDING' => 'Giảm dần',
                ],
            ],
            'FILTERS' => [
                'CREATE_SEGMENT' => [
                    'TITLE' => 'Bạn có muốn lưu bộ lọc này không?',
                    'CONFIRM' => 'Lưu bộ lọc',
                    'LABEL' => 'Tên',
                    'PLACEHOLDER' => 'Nhập tên của bộ lọc',
                    'ERROR' => 'Hãy nhập tên hợp lệ',
                    'SUCCESS_MESSAGE' => 'Đã lưu bộ lọc',
                    'ERROR_MESSAGE' => 'Không lưu được bộ lọc. Bạn hãy thử lại sau.',
                ],
                'DELETE_SEGMENT' => [
                    'TITLE' => 'Xác nhận xoá',
                    'DESCRIPTION' => 'Bạn chắc chắn muốn xóa bộ lọc này?',
                    'CONFIRM' => 'Có, Xoá',
                    'CANCEL' => 'Không, hủy',
                    'SUCCESS_MESSAGE' => 'Đã xóa bộ lọc',
                    'ERROR_MESSAGE' => 'Không xóa được bộ lọc. Bạn hãy thử lại sau.',
                ],
            ],
        ],
    ],
    'PAGINATION_FOOTER' => [
        'SHOWING' => 'Đang hiển thị {startItem} - {endItem} trong {totalItems} người',
    ],
    'FILTER' => [
        'NAME' => 'Tên',
        'EMAIL' => 'Email',
        'PHONE_NUMBER' => 'Số điện thoại',
        'IDENTIFIER' => 'Định danh',
        'COUNTRY' => 'Quốc gia',
        'CITY' => 'Tỉnh / Thành phố',
        'COMPANY' => 'Công ty',
        'CREATED_AT' => 'Tạo vào lúc',
        'LAST_ACTIVITY' => 'Hành động cuối cùng',
        'REFERER_LINK' => 'Liên kết người giới thiệu',
        'BLOCKED' => 'Đã chặn',
        'BLOCKED_TRUE' => 'Đúng',
        'BLOCKED_FALSE' => 'Sai',
        'BUTTONS' => [
            'CLEAR_FILTERS' => 'Xóa các bộ lọc',
            'UPDATE_SEGMENT' => 'Cập nhật nhóm khách',
            'APPLY_FILTERS' => 'Áp dụng bộ lọc',
            'ADD_FILTER' => 'Thêm bộ lọc',
        ],
        'TITLE' => 'Lọc danh sách',
        'EDIT_SEGMENT' => 'Sửa bộ lọc',
        'SEGMENT' => [
            'LABEL' => 'Tên nhóm khách',
            'INPUT_PLACEHOLDER' => 'Nhập tên nhóm khách',
        ],
        'ACTIVE_FILTERS' => [
            'MORE_FILTERS' => '+ {count} bộ lọc nữa',
            'CLEAR_FILTERS' => 'Xóa các bộ lọc',
        ],
    ],
    'FRIENDS' => [
        'TITLE' => 'Bạn bè',
        'TABS' => [
            'ONLINE' => 'Trực tuyến',
            'ALL' => 'Tất cả',
            'PENDING' => 'Đang chờ xử lý',
        ],
        'ADD_FRIEND' => 'Thêm Bạn',
        'SEARCH_PLACEHOLDER' => 'Tìm kiếm',
        'SECTION' => '{label} — {count}',
        'STATUS_ONLINE' => 'Trực tuyến',
        'STATUS_OFFLINE' => 'Ngoại tuyến',
        'MESSAGE' => 'Nhắn tin',
        'MORE' => 'Thêm',
        'VIEW_PROFILE' => 'Xem hồ sơ',
        'REMOVE' => 'Xoá khỏi danh sách',
        'EMPTY' => [
            'ONLINE' => 'Chưa có bạn nào đang trực tuyến.',
            'ALL' => 'Chưa có bạn bè nào. Bấm Thêm Bạn để tìm theo @username.',
            'PENDING' => 'Không có ai đang chờ xử lý.',
            'SEARCH' => 'Không tìm thấy ai khớp.',
        ],
    ],
    'IDENTIFICATION' => [
        'ALL' => 'Tất cả',
        'IDENTIFIED' => 'Đã định danh',
        'UNIDENTIFIED' => 'Chưa định danh',
    ],
    'CARD' => [
        'OF' => 'của',
        'UNIDENTIFIED_BADGE' => 'Chưa định danh',
        'UNIDENTIFIED_HINT' => 'Chưa có email, số điện thoại hay mã định danh — hiện chỉ biết khách qua kênh nhắn tin.',
        'VIEW_DETAILS' => 'Xem chi tiết',
        'EDIT_DETAILS_FORM' => [
            'TITLE' => 'Thông tin cá nhân',
            'FORM' => [
                'FIRST_NAME' => [
                    'PLACEHOLDER' => 'Nhập tên',
                ],
                'LAST_NAME' => [
                    'PLACEHOLDER' => 'Nhập họ',
                ],
                'EMAIL_ADDRESS' => [
                    'PLACEHOLDER' => 'Nhập địa chỉ email',
                    'DUPLICATE' => 'Email này đã có ở một hồ sơ khác.',
                ],
                'PHONE_NUMBER' => [
                    'PLACEHOLDER' => 'Nhập số điện thoại',
                    'DUPLICATE' => 'Số điện thoại này đã có ở một hồ sơ khác.',
                ],
                'CITY' => [
                    'PLACEHOLDER' => 'Nhập tên thành phố',
                ],
                'COUNTRY' => [
                    'PLACEHOLDER' => 'Chọn quốc gia',
                ],
                'BIO' => [
                    'PLACEHOLDER' => 'Nhập phần giới thiệu',
                ],
                'COMPANY_NAME' => [
                    'PLACEHOLDER' => 'Nhập tên công ty',
                ],
            ],
            'UPDATE_BUTTON' => 'Lưu thay đổi',
            'SUCCESS_MESSAGE' => 'Đã lưu thay đổi',
            'ERROR_MESSAGE' => 'Chưa lưu được thay đổi. Bạn hãy thử lại sau.',
        ],
        'SOCIAL_MEDIA' => [
            'TITLE' => 'Sửa liên kết mạng xã hội',
            'FORM' => [
                'FACEBOOK' => [
                    'PLACEHOLDER' => 'Thêm Facebook',
                ],
                'GITHUB' => [
                    'PLACEHOLDER' => 'Thêm Github',
                ],
                'INSTAGRAM' => [
                    'PLACEHOLDER' => 'Thêm Instagram',
                ],
                'TELEGRAM' => [
                    'PLACEHOLDER' => 'Thêm Telegram',
                ],
                'TIKTOK' => [
                    'PLACEHOLDER' => 'Thêm TikTok',
                ],
                'LINKEDIN' => [
                    'PLACEHOLDER' => 'Thêm LinkedIn',
                ],
                'TWITTER' => [
                    'PLACEHOLDER' => 'Thêm Twitter',
                ],
            ],
        ],
        'DELETE_CONTACT' => [
            'MESSAGE' => 'Thao tác này là vĩnh viễn, không thể hoàn tác.',
            'BUTTON' => 'Xóa ngay',
        ],
    ],
    'DETAILS' => [
        'CREATED_AT' => 'Tạo {date}',
        'LAST_ACTIVITY' => 'Hoạt động lần cuối {date}',
        'DELETE_CONTACT_DESCRIPTION' => 'Xoá vĩnh viễn người này khỏi danh sách. Không thể hoàn tác.',
        'DELETE_CONTACT' => 'Xoá khỏi danh sách',
        'DELETE_DIALOG' => [
            'TITLE' => 'Xác nhận xoá',
            'DESCRIPTION' => 'Bạn chắc chắn muốn xoá người này khỏi danh sách?',
            'CONFIRM' => 'Có, Xoá',
            'API' => [
                'SUCCESS_MESSAGE' => 'Đã xoá khỏi danh sách',
                'ERROR_MESSAGE' => 'Chưa xoá được. Bạn hãy thử lại sau.',
            ],
        ],
        'AVATAR' => [
            'UPLOAD' => [
                'ERROR_MESSAGE' => 'Không tải được ảnh đại diện. Bạn hãy thử lại sau.',
                'SUCCESS_MESSAGE' => 'Đã tải ảnh đại diện lên',
            ],
            'DELETE' => [
                'SUCCESS_MESSAGE' => 'Hình đại diện đã được xóa thành công',
                'ERROR_MESSAGE' => 'Không xóa được ảnh đại diện. Bạn hãy thử lại sau.',
            ],
        ],
    ],
    'SIDEBAR' => [
        'TABS' => [
            'ATTRIBUTES' => 'Thuộc tính',
            'HISTORY' => 'Lịch sử',
            'NOTES' => 'Ghi chú',
            'MEDIA' => 'Tệp đính kèm',
            'MERGE' => 'Gộp hồ sơ',
        ],
        'HISTORY' => [
            'EMPTY_STATE' => 'Chưa có hội thoại nào trước đây với người này',
        ],
        'ATTRIBUTES' => [
            'SEARCH_PLACEHOLDER' => 'Tìm thuộc tính',
            'UNUSED_ATTRIBUTES' => '{count} thuộc tính đang dùng | {count} thuộc tính chưa dùng',
            'EMPTY_STATE' => 'Chưa có thuộc tính tuỳ chỉnh nào. Bạn có thể tạo trong phần cài đặt.',
            'YES' => 'Có',
            'NO' => 'Không',
            'TRIGGER' => [
                'SELECT' => 'Chọn giá trị',
                'INPUT' => 'Nhập giá trị',
            ],
            'VALIDATIONS' => [
                'INVALID_NUMBER' => 'Số không hợp lệ',
                'REQUIRED' => 'Giá trị hợp lệ bắt buộc có',
                'INVALID_INPUT' => 'Giá trị không hợp lệ',
                'INVALID_URL' => 'URL không hợp lệ',
                'INVALID_DATE' => 'Ngày không hợp lệ',
            ],
            'NO_ATTRIBUTES' => 'Không có thuộc tính nào được tìm thấy',
            'API' => [
                'SUCCESS_MESSAGE' => 'Thuộc tính được cập nhật thành công',
                'DELETE_SUCCESS_MESSAGE' => 'Thuộc tính được xoá thành công',
                'UPDATE_ERROR' => 'Không thể cập nhật thuộc tính. Vui lòng thử lại sau',
                'DELETE_ERROR' => 'Không thể xoá thuộc tính. Vui lòng thử lại sau',
            ],
        ],
        'MERGE' => [
            'TITLE' => 'Gộp hồ sơ',
            'DESCRIPTION' => 'Gộp hai hồ sơ thành một, gồm mọi thuộc tính và hội thoại. Nếu có xung đột, thuộc tính của hồ sơ chính được ưu tiên.',
            'PRIMARY' => 'Hồ sơ chính',
            'PRIMARY_HELP_LABEL' => 'Sẽ được giữ lại',
            'PRIMARY_REQUIRED_ERROR' => 'Bạn hãy chọn một hồ sơ để gộp trước khi tiếp tục',
            'PARENT' => 'Sẽ được gộp vào',
            'PARENT_HELP_LABEL' => 'Sẽ được xoá',
            'EMPTY_STATE' => 'Không tìm thấy ai',
            'PLACEHOLDER' => 'Tìm hồ sơ chính',
            'SEARCH_PLACEHOLDER' => 'Tìm hồ sơ',
            'SEARCH_ERROR_MESSAGE' => 'Chưa tìm được. Bạn hãy thử lại sau.',
            'SUCCESS_MESSAGE' => 'Đã gộp hồ sơ',
            'ERROR_MESSAGE' => 'Chưa gộp được hồ sơ, bạn hãy thử lại!',
            'IS_SEARCHING' => 'Đang tìm kiếm...',
            'BUTTONS' => [
                'CANCEL' => 'Huỷ',
                'CONFIRM' => 'Gộp hồ sơ',
            ],
        ],
        'NOTES' => [
            'PLACEHOLDER' => 'Thêm ghi chú',
            'WROTE' => 'đã viết',
            'YOU' => 'Bạn',
            'SAVE' => 'Lưu ghi chú',
            'ADD_NOTE' => 'Thêm ghi chú cho người này',
            'EXPAND' => 'Mở rộng',
            'COLLAPSE' => 'Thu gọn',
            'NO_NOTES' => 'Chưa có ghi chú nào, bạn có thể thêm ghi chú ở trang hồ sơ.',
            'EMPTY_STATE' => 'Người này chưa có ghi chú nào. Bạn có thể thêm ghi chú bằng ô bên trên.',
            'CONVERSATION_EMPTY_STATE' => 'Chưa có ghi chú nào. Dùng nút Thêm ghi chú để tạo.',
        ],
    ],
    'EMPTY_STATE' => [
        'TITLE' => 'Danh sách của bạn đang trống',
        'SUBTITLE' => 'Bấm nút bên dưới để thêm người đầu tiên',
        'BUTTON_LABEL' => 'Thêm người',
        'SEARCH_EMPTY_STATE_TITLE' => 'Không tìm thấy ai khớp với tìm kiếm 🔍',
        'LIST_EMPTY_STATE_TITLE' => 'Chưa có ai trong danh sách này 📋',
        'ACTIVE_EMPTY_STATE_TITLE' => 'Hiện chưa có ai đang hoạt động 🌙',
    ],
    'LOAD_MORE' => 'Tải thêm',
];
