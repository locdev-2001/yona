<?php

// Bản dịch tiếng Việt của lang/en/help_center.php.
// Nguồn: bản dịch `vi` của Chatwoot v4.17.1 (dashboard/widget/survey + config/locales/vi.yml);
// khóa Chatwoot chưa dịch và khóa riêng Yona được dịch mới trong đợt G3.

return [
    'TITLE' => 'Trung tâm trợ giúp',
    'NEW_PAGE' => [
        'DESCRIPTION' => 'Tạo cổng trợ giúp tự phục vụ cho khách hàng. Giúp họ tìm câu trả lời ngay mà không phải chờ đợi, giảm số câu hỏi lặp lại, tăng hiệu suất nhân viên và nâng chất lượng hỗ trợ.',
        'CREATE_PORTAL_BUTTON' => 'Tạo cổng',
    ],
    'HEADER' => [
        'FILTER' => 'Lọc bởi',
        'SORT' => 'Sắp bởi',
        'LOCALE' => 'Ngôn ngữ',
        'SETTINGS_BUTTON' => 'Cài đặt',
        'NEW_BUTTON' => 'Bài mới',
        'DROPDOWN_OPTIONS' => [
            'PUBLISHED' => 'Đã phát hành',
            'DRAFT' => 'Nháp',
            'ARCHIVED' => 'Đã lưu trữ',
        ],
        'TITLES' => [
            'ALL_ARTICLES' => 'Tất cả bài viết',
            'MINE' => 'Các bài của tôi',
            'DRAFT' => 'Các bài nháp',
            'ARCHIVED' => 'Các bài lưu',
        ],
        'LOCALE_SELECT' => [
            'TITLE' => 'Chọn ngôn ngữ',
            'PLACEHOLDER' => 'Chọn ngôn ngữ',
            'NO_RESULT' => 'Không tìm thấy ngôn ngữ nào',
            'SEARCH_PLACEHOLDER' => 'Tìm ngôn ngữ',
        ],
    ],
    'EDIT_HEADER' => [
        'ALL_ARTICLES' => 'Tất cả bài viết',
        'PUBLISH_BUTTON' => 'Phát hành',
        'MOVE_TO_ARCHIVE_BUTTON' => 'Di chuyển đến lưu trữ',
        'PREVIEW' => 'Xem trước',
        'ADD_TRANSLATION' => 'Thêm bản dịch',
        'OPEN_SIDEBAR' => 'Mở thanh bên',
        'CLOSE_SIDEBAR' => 'Đóng thanh bên',
        'SAVING' => 'Đang lưu...',
        'SAVED' => 'Đã lưu',
    ],
    'ARTICLE_EDITOR' => [
        'IMAGE_UPLOAD' => [
            'TITLE' => 'Tải lên hình ảnh',
            'UPLOADING' => 'Đang tải lên...',
            'SUCCESS' => 'Ảnh tải lên thành công',
            'ERROR' => 'Lỗi khi tải ảnh lên',
            'UN_AUTHORIZED_ERROR' => 'Bạn không có quyền tải ảnh lên',
            'ERROR_FILE_SIZE' => 'Kích thước ảnh phải nhỏ hơn {size}MB',
            'ERROR_FILE_FORMAT' => 'Ảnh phải có định dạng jpg, jpeg hoặc png',
            'ERROR_FILE_DIMENSIONS' => 'Kích thước ảnh phải nhỏ hơn 2000 x 2000',
        ],
    ],
    'ARTICLE_SETTINGS' => [
        'TITLE' => 'Cài đặt bài viết',
        'FORM' => [
            'CATEGORY' => [
                'LABEL' => 'Danh mục',
                'TITLE' => 'Chọn loại',
                'PLACEHOLDER' => 'Chọn loại',
                'NO_RESULT' => 'Không tìm thấy loại',
                'SEARCH_PLACEHOLDER' => 'Tìm danh mục',
            ],
            'AUTHOR' => [
                'LABEL' => 'Tác giả',
                'TITLE' => 'Chọn tác giả',
                'PLACEHOLDER' => 'Chọn tác giả',
                'NO_RESULT' => 'Không tìm thấy tác giả',
                'SEARCH_PLACEHOLDER' => 'Tìm tác giả',
            ],
            'META_TITLE' => [
                'LABEL' => 'Tiêu đề meta',
                'PLACEHOLDER' => 'Thêm Tiêu đề meta',
            ],
            'META_DESCRIPTION' => [
                'LABEL' => 'Mô tả meta',
                'PLACEHOLDER' => 'Thêm mô tả meta của bạn để có kết quả SEO tốt hơn...',
            ],
            'META_TAGS' => [
                'LABEL' => 'Các thẻ meta',
                'PLACEHOLDER' => 'Thêm các thẻ meta bằng dấu phẩy...',
            ],
        ],
        'BUTTONS' => [
            'ARCHIVE' => 'Lưu trữ bài viết',
            'DELETE' => 'Xoá bài',
        ],
    ],
    'ARTICLE_SEARCH_RESULT' => [
        'UNCATEGORIZED' => 'Chưa được phân loại',
        'SEARCH_RESULTS' => 'Kết quả tìm cho {query}',
        'EMPTY_TEXT' => 'Tìm bài viết để chèn vào câu trả lời.',
        'SEARCH_LOADER' => 'Đang tìm kiếm...',
        'INSERT_ARTICLE' => 'Thêm vào',
        'NO_RESULT' => 'Không có bài viết nào',
        'COPY_LINK' => 'Sao chép bài viết vào bộ nhớ tạm',
        'OPEN_LINK' => 'Mở bài viên trong tab mới',
        'PREVIEW_LINK' => 'Xem trước bài viết',
    ],
    'PORTAL' => [
        'HEADER' => 'Cổng',
        'DEFAULT' => 'Mặc định',
        'NEW_BUTTON' => 'Cổng mới',
        'ACTIVE_BADGE' => 'có hiệu lực',
        'CHOOSE_LOCALE_LABEL' => 'Chọn một ngôn ngữ',
        'LOADING_MESSAGE' => 'Đang tải cổng...',
        'ARTICLES_LABEL' => 'bài viết',
        'NO_PORTALS_MESSAGE' => 'Không có cổng nào',
        'ADD_NEW_LOCALE' => 'Thêm ngôn ngữ',
        'POPOVER' => [
            'TITLE' => 'Cổng',
            'PORTAL_SETTINGS' => 'Cài đặt cổng',
            'SUBTITLE' => 'Bạn có nhiều cổng và có thể có các ngôn ngữ khác nhau cho mỗi cổng.',
            'CANCEL_BUTTON_LABEL' => 'Huỷ',
            'CHOOSE_LOCALE_BUTTON' => 'Chọn ngôn ngữ',
        ],
        'PORTAL_SETTINGS' => [
            'LIST_ITEM' => [
                'HEADER' => [
                    'COUNT_LABEL' => 'bài viết',
                    'ADD' => 'Thêm ngôn ngữ',
                    'VISIT' => 'Xem trang',
                    'SETTINGS' => 'Cài đặt',
                    'DELETE' => 'Xoá',
                ],
                'PORTAL_CONFIG' => [
                    'TITLE' => 'Cấu hình Cổng thông tin',
                    'ITEMS' => [
                        'NAME' => 'Tên',
                        'DOMAIN' => 'Tên miền tuỳ chỉnh',
                        'SLUG' => 'Đường dẫn',
                        'TITLE' => 'Tiêu đề cổng',
                        'THEME' => 'Màu chủ đề',
                        'SUB_TEXT' => 'Tiêu đề phụ của cổng thông tin',
                    ],
                ],
                'AVAILABLE_LOCALES' => [
                    'TITLE' => 'Các ngôn ngữ sẵn có',
                    'TABLE' => [
                        'NAME' => 'Tên ngôn ngữ',
                        'CODE' => 'Mã ngôn ngữ',
                        'ARTICLE_COUNT' => 'Số lượng bài',
                        'CATEGORIES' => 'Số danh mục',
                        'SWAP' => 'Chuyển',
                        'DELETE' => 'Xoá',
                        'DEFAULT_LOCALE' => 'Mặc định',
                    ],
                ],
            ],
            'DELETE_PORTAL' => [
                'TITLE' => 'Xóa cổng thông tin',
                'MESSAGE' => 'Bạn có chắc chắn muốn xóa cổng thông tin này',
                'YES' => 'Có, xóa cổng thông tin',
                'NO' => 'Không, giữ cổng thông tin',
                'API' => [
                    'DELETE_SUCCESS' => 'Đã xóa cổng thông tin thành công',
                    'DELETE_ERROR' => 'Lỗi khi xóa cổng thông tin',
                ],
            ],
            'SEND_CNAME_INSTRUCTIONS' => [
                'API' => [
                    'SUCCESS_MESSAGE' => 'Đã gửi hướng dẫn CNAME',
                    'ERROR_MESSAGE' => 'Có lỗi khi gửi hướng dẫn CNAME',
                ],
            ],
        ],
        'EDIT' => [
            'HEADER_TEXT' => 'Sửa cổng thông tin',
            'TABS' => [
                'BASIC_SETTINGS' => [
                    'TITLE' => 'Thông tin cơ bản',
                ],
                'CUSTOMIZATION_SETTINGS' => [
                    'TITLE' => 'Tuỳ chỉnh cổng thông tin',
                ],
                'CATEGORY_SETTINGS' => [
                    'TITLE' => 'Danh mục',
                ],
                'LOCALE_SETTINGS' => [
                    'TITLE' => 'Ngôn ngữ',
                ],
            ],
            'CATEGORIES' => [
                'TITLE' => 'Các danh mục trong',
                'NEW_CATEGORY' => 'Tạo danh mục',
                'TABLE' => [
                    'NAME' => 'Tên',
                    'DESCRIPTION' => 'Mô tả',
                    'LOCALE' => 'Ngôn ngữ',
                    'ARTICLE_COUNT' => 'Số lượng bài',
                    'ACTION_BUTTON' => [
                        'EDIT' => 'Sửa danh mục',
                        'DELETE' => 'Xoá danh mục',
                    ],
                    'EMPTY_TEXT' => 'Không tìm thấy danh mục nào',
                ],
            ],
            'EDIT_BASIC_INFO' => [
                'BUTTON_TEXT' => 'Cập nhật thông tin cơ bản',
            ],
        ],
        'ADD' => [
            'CREATE_FLOW' => [
                'BASIC' => [
                    'TITLE' => 'Thông tin trung tâm trợ giúp',
                    'BODY' => 'Thông tin cơ bản về cổng',
                ],
                'CUSTOMIZATION' => [
                    'TITLE' => 'Tùy chỉnh trung tâm trợ giúp',
                    'BODY' => 'Tuỳ chỉnh cổng',
                ],
                'FINISH' => [
                    'TITLE' => 'Tới rồi! 🎉',
                    'BODY' => 'Bạn đã sẵn sàng!',
                ],
            ],
            'CREATE_FLOW_PAGE' => [
                'BACK_BUTTON' => 'Trở về',
                'BASIC_SETTINGS_PAGE' => [
                    'HEADER' => 'Tạo cổng',
                    'TITLE' => 'Thông tin trung tâm trợ giúp',
                    'CREATE_BASIC_SETTING_BUTTON' => 'Tạo cài đặt cơ bản cho cổng thông tin',
                ],
                'CUSTOMIZATION_PAGE' => [
                    'HEADER' => 'Tuỳ biến cổng',
                    'TITLE' => 'Tùy chỉnh trung tâm trợ giúp',
                    'UPDATE_PORTAL_BUTTON' => 'Cập nhật thông tin cấu hình cổng',
                ],
                'FINISH_PAGE' => [
                    'TITLE' => 'Tới rồi!🎉 Bạn đã sẵn sàng!',
                    'MESSAGE' => 'Bây giờ bạn có thể thấy cổng được tạo này trên trang tất cả các cổng của bạn.',
                    'FINISH' => 'Đi đến tất cả các trang cổng thông tin',
                ],
            ],
            'LOGO' => [
                'LABEL' => 'Logo',
                'UPLOAD_BUTTON' => 'Tải lên logo',
                'HELP_TEXT' => 'Logo này sẽ được hiển thị trên tiêu đề cổng thông tin.',
                'IMAGE_UPLOAD_SUCCESS' => 'Đã tải logo lên',
                'IMAGE_UPLOAD_ERROR' => 'Đã xóa logo',
                'IMAGE_DELETE_ERROR' => 'Có lỗi khi xóa logo',
            ],
            'NAME' => [
                'LABEL' => 'Tên',
                'PLACEHOLDER' => 'Tên cổng',
                'HELP_TEXT' => 'Tên sẽ được sử dụng trong nội bộ cổng thông tin công khai.',
                'ERROR' => 'Tên bắt buộc có',
            ],
            'SLUG' => [
                'LABEL' => 'Đường dẫn',
                'PLACEHOLDER' => 'Slug cổng cho các url',
                'ERROR' => 'Phải có Slug',
            ],
            'DOMAIN' => [
                'LABEL' => 'Tên miền tuỳ biến',
                'PLACEHOLDER' => 'Tên miền tuỳ biến cổng',
                'HELP_TEXT' => 'Chỉ thêm nếu bạn muốn dùng tên miền riêng cho cổng trợ giúp. Ví dụ: {exampleURL}',
                'ERROR' => 'Nhập URL domain',
            ],
            'HOME_PAGE_LINK' => [
                'LABEL' => 'Liên kết trang chủ',
                'PLACEHOLDER' => 'Liên kế trang chủ cổng thông tin',
                'HELP_TEXT' => 'Liên kết để quay về trang chủ từ cổng trợ giúp. Ví dụ: {exampleURL}',
                'ERROR' => 'Nhập URL trang chủ',
            ],
            'THEME_COLOR' => [
                'LABEL' => 'Màu chủ đề cổng thông tin',
                'HELP_TEXT' => 'Màu này sẽ hiển thị dưới dạng màu chủ đề cho cổng thông tin.',
            ],
            'PAGE_TITLE' => [
                'LABEL' => 'Tiêu đề trang',
                'PLACEHOLDER' => 'Tiêu đề trang cổng thông tin',
                'HELP_TEXT' => 'Tiêu đề trang sẽ được sử dụng trong cổng công khai.',
                'ERROR' => 'Phải có Tiêu đề trang',
            ],
            'HEADER_TEXT' => [
                'LABEL' => 'Văn bản tiêu đề',
                'PLACEHOLDER' => 'Văn bản tiêu đề cổng thông tin',
                'HELP_TEXT' => 'Văn bản tiêu đề Cổng thông tin sẽ được sử dụng trong cổng thông tin công khai.',
                'ERROR' => 'Phải có Văn bản tiêu đề cổng',
            ],
            'API' => [
                'SUCCESS_MESSAGE_FOR_BASIC' => 'Cổng thông tin được tạo thành công.',
                'ERROR_MESSAGE_FOR_BASIC' => 'Không thể tạo cổng. Thử lại.',
                'SUCCESS_MESSAGE_FOR_UPDATE' => 'Cổng thông tin được cập nhật thành công.',
                'ERROR_MESSAGE_FOR_UPDATE' => 'Không thể cập nhật cổng. Thử lại.',
            ],
        ],
        'ADD_LOCALE' => [
            'TITLE' => 'Thêm ngôn ngữ',
            'SUB_TITLE' => 'Việc này sẽ thêm một ngôn ngữ mới vào danh sách của bạn.',
            'PORTAL' => 'Cổng',
            'LOCALE' => [
                'LABEL' => 'Ngôn ngữ',
                'PLACEHOLDER' => 'Chọn một ngôn ngữ',
                'ERROR' => 'Ngôn ngữ là bắt buộc',
            ],
            'BUTTONS' => [
                'CREATE' => 'Tạo ngôn ngữ',
                'CANCEL' => 'Huỷ',
            ],
            'API' => [
                'SUCCESS_MESSAGE' => 'Ngôn ngữ được thêm thành công',
                'ERROR_MESSAGE' => 'Không thể thêm ngôn ngữ. Vui lòng thử lại.',
            ],
        ],
        'CHANGE_DEFAULT_LOCALE' => [
            'API' => [
                'SUCCESS_MESSAGE' => 'Ngôn ngữ mặc định được cập nhật thành công',
                'ERROR_MESSAGE' => 'Không thể thay đổi ngôn ngữ mặc định. Vui lòng thử lại.',
            ],
        ],
        'DELETE_LOCALE' => [
            'API' => [
                'SUCCESS_MESSAGE' => 'Ngôn ngữ đã được gỡ bỏ thành công khỏi cổng thông tin',
                'ERROR_MESSAGE' => 'Không thể gỡ ngôn ngữ khỏi cổng thông tin. Vui lòng thử lại.',
            ],
        ],
        'DRAFT_LOCALE' => [
            'API' => [
                'SUCCESS_MESSAGE' => 'Đã chuyển ngôn ngữ về bản nháp',
                'ERROR_MESSAGE' => 'Không chuyển được ngôn ngữ về bản nháp. Bạn hãy thử lại.',
            ],
        ],
        'PUBLISH_LOCALE' => [
            'API' => [
                'SUCCESS_MESSAGE' => 'Đã xuất bản ngôn ngữ',
                'ERROR_MESSAGE' => 'Không xuất bản được ngôn ngữ. Bạn hãy thử lại.',
            ],
        ],
    ],
    'TABLE' => [
        'LOADING_MESSAGE' => 'Đang tải nội dung...',
        '404' => 'Không có bài viết nào phù hợp với tìm kiếm của bạn 🔍',
        'NO_ARTICLES' => 'Không có bài viết nào có sẵn',
        'HEADERS' => [
            'TITLE' => 'Tiêu đề',
            'CATEGORY' => 'Loại',
            'READ_COUNT' => 'Lượt xem',
            'STATUS' => 'Trạng thái',
            'LAST_EDITED' => 'Sửa lần cuối',
        ],
        'COLUMNS' => [
            'BY' => 'bởi',
            'AUTHOR_NOT_AVAILABLE' => 'Không có thông tin tác giả',
        ],
    ],
    'EDIT_ARTICLE' => [
        'LOADING' => 'Đang tải nội dung...',
        'TITLE_PLACEHOLDER' => 'Tiêu đề bài viết ở đây',
        'CONTENT_PLACEHOLDER' => 'Viết bài của bạn ở đây',
        'API' => [
            'ERROR' => 'Lỗi khi lưu bài viết',
        ],
    ],
    'PUBLISH_ARTICLE' => [
        'API' => [
            'ERROR' => 'Lỗi khi xuất bản bài viết',
            'SUCCESS' => 'Bài viết xuất bản thành công',
        ],
    ],
    'ARCHIVE_ARTICLE' => [
        'API' => [
            'ERROR' => 'Lỗi khi lưu trữ bài viết',
            'SUCCESS' => 'Lưu trữ bài viết thành công',
        ],
    ],
    'DRAFT_ARTICLE' => [
        'API' => [
            'ERROR' => 'Có lỗi khi chuyển bài viết về nháp',
            'SUCCESS' => 'Đã chuyển bài viết về nháp',
        ],
    ],
    'DELETE_ARTICLE' => [
        'MODAL' => [
            'CONFIRM' => [
                'TITLE' => 'Xác nhận xoá',
                'MESSAGE' => 'Bạn có chắc chắn xóa bài viết?',
                'YES' => 'Có, Xoá',
                'NO' => 'Không, Giữ',
            ],
        ],
        'API' => [
            'SUCCESS_MESSAGE' => 'Đã xóa bài viết thành công',
            'ERROR_MESSAGE' => 'Lỗi khi xóa bài viết',
        ],
    ],
    'REORDER_ARTICLE' => [
        'API' => [
            'ERROR_MESSAGE' => 'Không sắp xếp lại được bài viết. Bạn hãy thử lại.',
        ],
    ],
    'REORDER_CATEGORY' => [
        'API' => [
            'ERROR_MESSAGE' => 'Không sắp xếp lại được danh mục. Bạn hãy thử lại.',
        ],
    ],
    'CREATE_ARTICLE' => [
        'ERROR_MESSAGE' => 'Vui lòng thêm tiêu đề và nội dung bài viết sau đó mới có thể cập nhật cài đặt',
    ],
    'SIDEBAR' => [
        'SEARCH' => [
            'PLACEHOLDER' => 'Tìm kiếm bài viết',
        ],
    ],
    'BREADCRUMB' => [
        'ARTICLES' => 'Bài viết',
        'CATEGORIES' => 'Danh mục',
        'LOCALES' => 'Ngôn ngữ',
        'SETTINGS' => 'Cài đặt',
    ],
    'CATEGORY' => [
        'ADD' => [
            'TITLE' => 'Tạo một danh mục',
            'SUB_TITLE' => 'Danh mục sẽ được sử dụng trong cổng thông tin công khai để phân loại các bài.',
            'PORTAL' => 'Cổng',
            'LOCALE' => 'Ngôn ngữ',
            'NAME' => [
                'LABEL' => 'Tên',
                'PLACEHOLDER' => 'Tên danh mục',
                'HELP_TEXT' => 'Tên và biểu tượng danh mục sẽ hiện trên cổng trợ giúp công khai để phân loại bài viết.',
                'ERROR' => 'Tên bắt buộc có',
            ],
            'SLUG' => [
                'LABEL' => 'Đường dẫn',
                'PLACEHOLDER' => 'Danh mục slug cho url',
                'HELP_TEXT' => 'app.chatwoot.com/hc/my-portal/en-US/categories/my-slug',
                'ERROR' => 'Phải có Slug',
            ],
            'DESCRIPTION' => [
                'LABEL' => 'Mô tả',
                'PLACEHOLDER' => 'Đưa ra một mô tả ngắn về danh mục.',
                'ERROR' => 'Mô tả bắt buộc có',
            ],
            'BUTTONS' => [
                'CREATE' => 'Tạo danh mục',
                'CANCEL' => 'Huỷ',
            ],
            'API' => [
                'SUCCESS_MESSAGE' => 'Danh mục đã được tạo thành công',
                'ERROR_MESSAGE' => 'Không thể tạo danh mục',
            ],
        ],
        'EDIT' => [
            'TITLE' => 'Chỉnh sửa danh mục',
            'SUB_TITLE' => 'Chỉnh sửa danh mục sẽ cập nhật danh mục trong cổng thông tin công khai.',
            'PORTAL' => 'Cổng',
            'LOCALE' => 'Ngôn ngữ',
            'NAME' => [
                'LABEL' => 'Tên',
                'PLACEHOLDER' => 'Tên danh mục',
                'HELP_TEXT' => 'Tên và biểu tượng danh mục sẽ hiện trên cổng trợ giúp công khai để phân loại bài viết.',
                'ERROR' => 'Tên bắt buộc có',
            ],
            'SLUG' => [
                'LABEL' => 'Đường dẫn',
                'PLACEHOLDER' => 'Danh mục slug cho url',
                'HELP_TEXT' => 'app.chatwoot.com/hc/my-portal/en-US/categories/my-slug',
                'ERROR' => 'Phải có Slug',
            ],
            'DESCRIPTION' => [
                'LABEL' => 'Mô tả',
                'PLACEHOLDER' => 'Đưa ra một mô tả ngắn về danh mục.',
                'ERROR' => 'Mô tả bắt buộc có',
            ],
            'BUTTONS' => [
                'CREATE' => 'Cập nhật danh mục',
                'CANCEL' => 'Huỷ',
            ],
            'API' => [
                'SUCCESS_MESSAGE' => 'Danh mục cập nhật thành công',
                'ERROR_MESSAGE' => 'Không thể cập nhật danh mục',
            ],
        ],
        'DELETE' => [
            'API' => [
                'SUCCESS_MESSAGE' => 'Xoá danh mục thành công',
                'ERROR_MESSAGE' => 'Không thể xoá danh mục',
            ],
        ],
    ],
    'ARTICLE_SEARCH' => [
        'TITLE' => 'Tìm bài viết',
        'PLACEHOLDER' => 'Tìm bài viết',
        'NO_RESULT' => 'Không có bài viết nào',
        'SEARCHING' => 'Đang tìm kiếm...',
        'SEARCH_BUTTON' => 'Tìm kiếm',
        'INSERT_ARTICLE' => 'Chèn liên kết',
        'IFRAME_ERROR' => 'URL rỗng hoặc không hợp lệ. Không hiển thị được nội dung.',
        'OPEN_ARTICLE_SEARCH' => 'Chèn bài viết từ trung tâm trợ giúp',
        'SUCCESS_ARTICLE_INSERTED' => 'Đã chèn bài viết',
        'PREVIEW_LINK' => 'Xem trước bài viết',
        'CANCEL' => 'Đóng',
        'BACK' => 'Trở về',
        'BACK_RESULTS' => 'Quay lại kết quả',
    ],
    'UPGRADE_PAGE' => [
        'TITLE' => 'Trung tâm trợ giúp',
        'DESCRIPTION' => 'Tạo cổng tự phục vụ dễ dùng. Giúp người dùng đọc bài viết và được hỗ trợ 24/7. Hãy nâng cấp gói để bật tính năng này.',
        'SELF_HOSTED_DESCRIPTION' => 'Tạo cổng tự phục vụ dễ dùng. Giúp người dùng đọc bài viết và được hỗ trợ 24/7. Hãy liên hệ quản trị viên để bật tính năng này.',
        'BUTTON' => [
            'LEARN_MORE' => 'Tìm hiểu thêm',
            'UPGRADE' => 'Nâng cấp',
        ],
        'FEATURES' => [
            'PORTALS' => [
                'TITLE' => 'Nhiều cổng trợ giúp',
                'DESCRIPTION' => 'Tạo nhiều cổng trợ giúp cho từng sản phẩm khác nhau trên cùng một tài khoản.',
            ],
            'LOCALES' => [
                'TITLE' => 'Hỗ trợ đầy đủ đa ngôn ngữ',
                'DESCRIPTION' => 'Bản địa hóa cổng trợ giúp theo ngôn ngữ của bạn. Chúng tôi hỗ trợ mọi ngôn ngữ và cho phép dịch từng bài viết.',
            ],
            'SEO' => [
                'TITLE' => 'Thiết kế thân thiện SEO',
                'DESCRIPTION' => 'Tùy chỉnh thẻ meta để tăng khả năng hiện trên công cụ tìm kiếm với các trang chuẩn SEO.',
            ],
            'API' => [
                'TITLE' => 'Hỗ trợ API đầy đủ',
                'DESCRIPTION' => 'Dùng cổng trợ giúp như một CMS headless, ghép với framework giao diện bên thứ ba qua API của chúng tôi.',
            ],
        ],
    ],
    'LOADING' => 'Đang tải...',
    'ARTICLES_PAGE' => [
        'ARTICLE_CARD' => [
            'CARD' => [
                'VIEWS' => '{count} lượt xem | {count} lượt xem',
                'DROPDOWN_MENU' => [
                    'PUBLISH' => 'Phát hành',
                    'DRAFT' => 'Nháp',
                    'ARCHIVE' => 'Lưu trữ',
                    'TRANSLATE' => 'Dịch',
                    'DELETE' => 'Xoá',
                ],
                'STATUS' => [
                    'DRAFT' => 'Nháp',
                    'PUBLISHED' => 'Đã phát hành',
                    'ARCHIVED' => 'Đã lưu trữ',
                ],
                'PENDING_EDITS' => 'Sửa đổi chưa xuất bản',
                'PENDING_EDITS_TOOLTIP' => 'Bài viết đã xuất bản này còn sửa đổi chưa xuất bản',
                'CATEGORY' => [
                    'UNCATEGORISED' => 'Chưa phân loại',
                ],
            ],
        ],
        'ARTICLES_HEADER' => [
            'TABS' => [
                'ALL' => 'Tất cả bài viết',
                'MINE' => 'Của tôi',
                'DRAFT' => 'Nháp',
                'PUBLISHED' => 'Đã phát hành',
                'ARCHIVED' => 'Đã lưu trữ',
            ],
            'CATEGORY' => [
                'ALL' => 'Tất cả danh mục',
            ],
            'LOCALE' => [
                'ALL' => 'Tất cả ngôn ngữ',
            ],
            'SEARCH_PLACEHOLDER' => 'Tìm bài viết...',
            'NEW_ARTICLE' => 'Bài viết mới',
        ],
        'EMPTY_STATE' => [
            'ALL' => [
                'TITLE' => 'Viết một bài',
                'SUBTITLE' => 'Viết một bài thật chi tiết, bắt đầu thôi!',
                'BUTTON_LABEL' => 'Bài viết mới',
            ],
            'MINE' => [
                'TITLE' => 'Bạn chưa viết bài nào ở đây',
                'SUBTITLE' => 'Mọi bài viết do bạn viết sẽ hiện ở đây cho dễ tìm.',
            ],
            'DRAFT' => [
                'TITLE' => 'Chưa có bài viết nháp nào',
                'SUBTITLE' => 'Bài viết nháp sẽ hiện ở đây',
            ],
            'PUBLISHED' => [
                'TITLE' => 'Chưa có bài viết nào được xuất bản',
                'SUBTITLE' => 'Bài viết đã xuất bản sẽ hiện ở đây',
            ],
            'ARCHIVED' => [
                'TITLE' => 'Kho lưu trữ chưa có bài viết nào',
                'SUBTITLE' => 'Bài viết đã lưu trữ không hiện trên cổng trợ giúp, bạn có thể dùng để đánh dấu trang cũ hoặc lỗi thời',
            ],
            'CATEGORY' => [
                'TITLE' => 'Danh mục này chưa có bài viết nào',
                'SUBTITLE' => 'Bài viết thuộc danh mục này sẽ hiện ở đây',
            ],
            'SEARCH' => [
                'TITLE' => 'Không có bài viết nào khớp',
                'SUBTITLE' => 'Chúng tôi không tìm thấy bài viết nào khớp với từ khóa. Hãy thử từ khác.',
            ],
        ],
        'BULK_TRANSLATE' => [
            'TITLE' => 'Dịch bài viết | Dịch {count} bài viết',
            'DESCRIPTION' => 'Dịch bài viết đã chọn sang ngôn ngữ khác. | Dịch các bài viết đã chọn sang ngôn ngữ khác.',
            'LOCALE_LABEL' => 'Ngôn ngữ đích',
            'LOCALE_PLACEHOLDER' => 'Chọn một ngôn ngữ',
            'CATEGORY_LABEL' => 'Danh mục đích',
            'CATEGORY_PLACEHOLDER' => 'Chọn một danh mục',
            'OPTIONAL' => '(tùy chọn)',
            'CONFIRM' => 'Dịch',
            'SELECT_ALL' => 'Chọn tất cả ({count})',
            'SELECTED_COUNT' => 'Đã chọn {count}',
            'CLEAR_SELECTION' => 'Bỏ chọn',
            'TRANSLATE_BUTTON' => 'Dịch',
            'CONFIRM_OVERWRITE' => 'Ghi đè và dịch',
            'DUPLICATE_WARNING' => 'Bài viết này đã có bản dịch ở ngôn ngữ đã chọn. | Đã có bản dịch của {count} bài viết ở ngôn ngữ đã chọn.',
            'DUPLICATE_CONFIRM_HINT' => 'Bấm dịch lần nữa để ghi đè bản dịch hiện có.',
            'API' => [
                'SUCCESS_MESSAGE' => 'Đang dịch. Bài viết sẽ hiện dưới dạng nháp khi xong.',
                'ERROR_MESSAGE' => 'Không bắt đầu được việc dịch. Bạn hãy thử lại.',
            ],
        ],
        'BULK_ACTIONS' => [
            'PUBLISH' => 'Phát hành',
            'DRAFT' => 'Nháp',
            'ARCHIVE' => 'Lưu trữ',
            'TRANSLATE' => 'Dịch',
            'MOVE_TO_CATEGORY' => 'Loại',
            'DELETE' => 'Xoá',
            'STATUS_SUCCESS' => 'Đã cập nhật bài viết',
            'STATUS_ERROR' => 'Cập nhật bài viết thất bại',
            'STATUS_SKIPPED' => 'Đã bỏ qua 1 bài viết còn sửa đổi chưa xuất bản — hãy mở bài đó để xuất bản hoặc bỏ sửa đổi. | Đã bỏ qua {count} bài viết còn sửa đổi chưa xuất bản — hãy mở từng bài để xuất bản hoặc bỏ sửa đổi.',
            'STATUS_SKIPPED_ALL' => 'Những bài viết này còn sửa đổi chưa xuất bản — hãy mở từng bài để xuất bản hoặc bỏ sửa đổi.',
            'CATEGORY_SUCCESS' => 'Đã chuyển bài viết',
            'CATEGORY_ERROR' => 'Chuyển bài viết thất bại',
            'DELETE_CONFIRM_TITLE' => 'Xóa bài viết | Xóa {count} bài viết',
            'DELETE_CONFIRM_DESCRIPTION' => 'Thao tác này sẽ xóa vĩnh viễn bài viết đã chọn. Không thể hoàn tác. | Thao tác này sẽ xóa vĩnh viễn {count} bài viết đã chọn. Không thể hoàn tác.',
            'DELETE_CONFIRM' => 'Xoá',
            'DELETE_SUCCESS' => 'Đã xóa bài viết',
            'DELETE_ERROR' => 'Xóa bài viết thất bại',
        ],
    ],
    'CATEGORY_PAGE' => [
        'CATEGORY_HEADER' => [
            'NEW_CATEGORY' => 'Tạo danh mục',
            'EDIT_CATEGORY' => 'Sửa danh mục',
            'SEARCH_PLACEHOLDER' => 'Tìm danh mục...',
            'CATEGORIES_COUNT' => '{n} danh mục | {n} danh mục',
            'BREADCRUMB' => [
                'CATEGORY_LOCALE' => 'Danh mục ({localeCode})',
                'ACTIVE_CATEGORY' => '{categoryName} ({categoryCount} bài viết) | {categoryName} ({categoryCount} bài viết)',
            ],
        ],
        'CATEGORY_EMPTY_STATE' => [
            'TITLE' => 'Không tìm thấy danh mục nào',
            'SUBTITLE' => 'Danh mục sẽ hiện ở đây. Bạn có thể thêm danh mục bằng nút "Danh mục mới".',
        ],
        'SEARCH_EMPTY_STATE' => [
            'TITLE' => 'Không có danh mục nào khớp',
            'SUBTITLE' => 'Chúng tôi không tìm thấy danh mục nào khớp với từ khóa. Hãy thử từ khác.',
        ],
        'CATEGORY_CARD' => [
            'ARTICLES_COUNT' => '{count} bài viết | {count} bài viết',
        ],
        'CATEGORY_DIALOG' => [
            'CREATE' => [
                'API' => [
                    'SUCCESS_MESSAGE' => 'Danh mục đã được tạo thành công',
                    'ERROR_MESSAGE' => 'Không thể tạo danh mục',
                ],
            ],
            'EDIT' => [
                'API' => [
                    'SUCCESS_MESSAGE' => 'Danh mục cập nhật thành công',
                    'ERROR_MESSAGE' => 'Không thể cập nhật danh mục',
                ],
            ],
            'DELETE' => [
                'API' => [
                    'SUCCESS_MESSAGE' => 'Xoá danh mục thành công',
                    'ERROR_MESSAGE' => 'Không thể xoá danh mục',
                ],
            ],
            'HEADER' => [
                'CREATE' => 'Tạo danh mục',
                'EDIT' => 'Sửa danh mục',
                'DESCRIPTION' => 'Chỉnh sửa danh mục sẽ cập nhật danh mục trong cổng thông tin công khai.',
                'PORTAL' => 'Cổng',
                'LOCALE' => 'Ngôn ngữ',
            ],
            'FORM' => [
                'NAME' => [
                    'LABEL' => 'Tên',
                    'PLACEHOLDER' => 'Tên danh mục',
                    'ERROR' => 'Tên bắt buộc có',
                ],
                'SLUG' => [
                    'LABEL' => 'Đường dẫn',
                    'PLACEHOLDER' => 'Danh mục slug cho url',
                    'ERROR' => 'Phải có Slug',
                    'HELP_TEXT' => 'app.chatwoot.com/hc/{portalSlug}/{localeCode}/categories/{categorySlug}',
                ],
                'DESCRIPTION' => [
                    'LABEL' => 'Mô tả',
                    'PLACEHOLDER' => 'Đưa ra một mô tả ngắn về danh mục.',
                    'ERROR' => 'Mô tả bắt buộc có',
                ],
            ],
            'BUTTONS' => [
                'CREATE' => 'Tạo',
                'EDIT' => 'Cập nhật',
                'CANCEL' => 'Huỷ',
            ],
        ],
    ],
    'LOCALES_PAGE' => [
        'LOCALES_COUNT' => 'Chưa có ngôn ngữ nào | {n} ngôn ngữ | {n} ngôn ngữ',
        'NEW_LOCALE_BUTTON_TEXT' => 'Ngôn ngữ mới',
        'SEARCH_PLACEHOLDER' => 'Tìm ngôn ngữ...',
        'SEARCH_EMPTY_STATE' => [
            'TITLE' => 'Không có ngôn ngữ nào khớp',
            'SUBTITLE' => 'Chúng tôi không tìm thấy ngôn ngữ nào khớp với từ khóa. Hãy thử từ khác.',
        ],
        'LOCALE_CARD' => [
            'ARTICLES_COUNT' => '{count} bài viết | {count} bài viết',
            'CATEGORIES_COUNT' => '{count} danh mục | {count} danh mục',
            'DEFAULT' => 'Mặc định',
            'DRAFT' => 'Nháp',
            'DROPDOWN_MENU' => [
                'MAKE_DEFAULT' => 'Đặt làm mặc định',
                'MOVE_TO_DRAFT' => 'Chuyển về nháp',
                'PUBLISH_LOCALE' => 'Xuất bản ngôn ngữ',
                'CUSTOMIZE_CONTENT' => 'Bản địa hóa nội dung',
                'SELECT_POPULAR_CONTENT' => 'Chọn nội dung nổi bật',
                'DELETE' => 'Xoá',
            ],
        ],
        'POPULAR_CONTENT_DIALOG' => [
            'TITLE' => 'Nội dung nổi bật',
            'DESCRIPTION' => 'Chọn tối đa 3 danh mục và 6 bài viết để nổi bật trên trang chủ trung tâm trợ giúp của ngôn ngữ này. Kéo thả để sắp thứ tự khách sẽ thấy.',
            'SEARCH' => 'Tìm kiếm...',
            'EMPTY' => 'Không có kết quả khớp',
            'ADD_ANOTHER' => 'Thêm mục nữa...',
            'SLOTS_LEFT' => 'Còn {count} chỗ',
            'OVERRIDING_DEFAULTS' => 'Đang ghi đè mặc định cho ngôn ngữ này',
            'CONFIRM' => 'Lưu nội dung nổi bật',
            'CATEGORIES' => [
                'LABEL' => 'Danh mục nổi bật',
                'ARTICLES_COUNT' => 'Chưa có bài viết | {count} bài viết | {count} bài viết',
            ],
            'ARTICLES' => [
                'LABEL' => 'Bài viết nổi bật',
                'IN_CATEGORY' => 'trong {category}',
                'UNCATEGORIZED' => 'Chưa được phân loại',
            ],
            'API' => [
                'SUCCESS_MESSAGE' => 'Đã cập nhật nội dung nổi bật',
                'ERROR_MESSAGE' => 'Không cập nhật được nội dung nổi bật. Bạn hãy thử lại.',
            ],
        ],
        'CONTENT_DIALOG' => [
            'TITLE' => 'Bản địa hóa nội dung',
            'DESCRIPTION' => 'Đặt giá trị riêng cho ngôn ngữ này. Mục nào để trống sẽ lấy theo ngôn ngữ mặc định.',
            'NAME' => [
                'LABEL' => 'Tên',
            ],
            'PAGE_TITLE' => [
                'LABEL' => 'Tiêu đề trang',
            ],
            'HEADER_TEXT' => [
                'LABEL' => 'Chữ ở phần đầu trang',
            ],
            'API' => [
                'SUCCESS_MESSAGE' => 'Đã cập nhật nội dung của ngôn ngữ',
                'ERROR_MESSAGE' => 'Không cập nhật được nội dung của ngôn ngữ. Bạn hãy thử lại.',
            ],
        ],
        'ADD_LOCALE_DIALOG' => [
            'TITLE' => 'Thêm ngôn ngữ',
            'DESCRIPTION' => 'Chọn ngôn ngữ sẽ dùng để viết bài này. Ngôn ngữ đó được thêm vào danh sách bản dịch, bạn có thể thêm nữa sau.',
            'COMBOBOX' => [
                'PLACEHOLDER' => 'Chọn ngôn ngữ...',
            ],
            'STATUS' => [
                'LABEL' => 'Trạng thái',
                'OPTIONS' => [
                    'LIVE' => 'Đã phát hành',
                    'DRAFT' => 'Nháp',
                ],
            ],
            'API' => [
                'SUCCESS_MESSAGE' => 'Ngôn ngữ được thêm thành công',
                'ERROR_MESSAGE' => 'Không thể thêm ngôn ngữ. Vui lòng thử lại.',
            ],
        ],
    ],
    'EDIT_ARTICLE_PAGE' => [
        'HEADER' => [
            'STATUS' => [
                'SAVING' => 'Đang lưu...',
                'SAVED' => 'Đã lưu',
            ],
            'PREVIEW' => 'Xem trước',
            'PUBLISH' => 'Phát hành',
            'PUBLISH_CHANGES' => 'Xuất bản thay đổi',
            'PUBLISH_CHANGES_SUCCESS' => 'Đã xuất bản thay đổi',
            'PUBLISH_CHANGES_ERROR' => 'Không xuất bản được thay đổi',
            'SAVE_IN_PROGRESS' => 'Vẫn đang lưu thay đổi mới nhất — bạn hãy thử lại sau giây lát.',
            'DISCARD_CHANGES' => 'Bỏ thay đổi',
            'DISCARD_CHANGES_SUCCESS' => 'Đã bỏ thay đổi',
            'DISCARD_CHANGES_ERROR' => 'Không bỏ được thay đổi',
            'PENDING_CHANGES' => 'Thay đổi đang chờ',
            'VIEW_CHANGES' => 'Xem thay đổi chưa xuất bản',
            'DRAFT' => 'Nháp',
            'ARCHIVE' => 'Lưu trữ',
            'BACK_TO_ARTICLES' => 'Quay lại danh sách bài viết',
        ],
        'PENDING_CHANGES_POPOVER' => [
            'TITLE' => 'Thay đổi chưa xuất bản',
            'DESCRIPTION' => 'Bài viết này có bản nháp chưa lên bản chính. Bạn muốn áp dụng trước khi đổi trạng thái, hay bỏ đi?',
            'APPLY' => 'Áp dụng thay đổi',
            'DISCARD' => 'Bỏ thay đổi',
        ],
        'DIFF_DIALOG' => [
            'TITLE' => 'Thay đổi chưa xuất bản',
            'DESCRIPTION' => 'So bản nháp của bạn với bản đang chạy.',
            'TITLE_LABEL' => 'Tiêu đề',
        ],
        'EDIT_ARTICLE' => [
            'MORE_PROPERTIES' => 'Thêm thuộc tính',
            'UNCATEGORIZED' => 'Chưa được phân loại',
            'EDITOR_PLACEHOLDER' => 'Viết nội dung tại đây. Gõ "/" để mở tùy chọn định dạng.',
        ],
        'ARTICLE_PROPERTIES' => [
            'ARTICLE_PROPERTIES' => 'Thuộc tính bài viết',
            'META_DESCRIPTION' => 'Mô tả meta',
            'META_DESCRIPTION_PLACEHOLDER' => 'Thêm mô tả meta',
            'META_TITLE' => 'Tiêu đề meta',
            'META_TITLE_PLACEHOLDER' => 'Thêm tiêu đề meta',
            'META_TAGS' => 'Các thẻ meta',
            'META_TAGS_PLACEHOLDER' => 'Thêm thẻ meta',
        ],
        'API' => [
            'ERROR' => 'Lỗi khi lưu bài viết',
        ],
    ],
    'PORTAL_SWITCHER' => [
        'NEW_PORTAL' => 'Cổng trợ giúp mới',
        'PORTALS' => 'Cổng',
        'CREATE_PORTAL' => 'Tạo và quản lý nhiều cổng trợ giúp',
        'ARTICLES' => 'bài viết',
        'DOMAIN' => 'miền',
        'PORTAL_NAME' => 'Tên cổng',
    ],
    'CREATE_PORTAL_DIALOG' => [
        'TITLE' => 'Tạo cổng trợ giúp mới',
        'DESCRIPTION' => 'Đặt tên cho cổng trợ giúp và tạo một đường dẫn dễ đọc. Bạn có thể đổi cả hai trong phần cài đặt sau này.',
        'CONFIRM_BUTTON_LABEL' => 'Tạo',
        'NAME' => [
            'LABEL' => 'Tên',
            'PLACEHOLDER' => 'Hướng dẫn sử dụng | Chatwoot',
            'MESSAGE' => 'Hãy chọn tên cho cổng trợ giúp của bạn.',
            'ERROR' => 'Tên bắt buộc có',
        ],
        'SLUG' => [
            'LABEL' => 'Đường dẫn',
            'PLACEHOLDER' => 'huong-dan-su-dung',
            'ERROR' => 'Phải có Slug',
            'FORMAT_ERROR' => 'Bạn hãy nhập đường dẫn hợp lệ, ví dụ: huong-dan-su-dung',
        ],
    ],
    'PORTAL_SETTINGS' => [
        'FORM' => [
            'AVATAR' => [
                'LABEL' => 'Logo',
                'IMAGE_UPLOAD_ERROR' => 'Không tải được ảnh lên! Bạn hãy thử lại',
                'IMAGE_UPLOAD_SUCCESS' => 'Đã thêm ảnh. Hãy bấm lưu thay đổi để lưu logo',
                'IMAGE_DELETE_SUCCESS' => 'Đã xóa logo',
                'IMAGE_DELETE_ERROR' => 'Không xóa được logo',
                'IMAGE_UPLOAD_SIZE_ERROR' => 'Kích thước ảnh phải nhỏ hơn {size}MB',
            ],
            'NAME' => [
                'LABEL' => 'Tên',
                'PLACEHOLDER' => 'Tên cổng',
                'ERROR' => 'Tên bắt buộc có',
            ],
            'HEADER_TEXT' => [
                'LABEL' => 'Chữ ở phần đầu trang',
                'PLACEHOLDER' => 'Văn bản tiêu đề cổng thông tin',
            ],
            'PAGE_TITLE' => [
                'LABEL' => 'Tiêu đề trang',
                'PLACEHOLDER' => 'Tiêu đề trang cổng thông tin',
            ],
            'HOME_PAGE_LINK' => [
                'LABEL' => 'Liên kết trang chủ',
                'PLACEHOLDER' => 'Liên kế trang chủ cổng thông tin',
                'ERROR' => 'Hãy nhập URL hợp lệ. Liên kết trang chủ phải bắt đầu bằng "http://" hoặc "https://".',
            ],
            'SLUG' => [
                'LABEL' => 'Đường dẫn',
                'PLACEHOLDER' => 'Đường dẫn cổng trợ giúp',
            ],
            'BRAND_COLOR' => [
                'LABEL' => 'Màu thương hiệu',
            ],
            'SAVE_CHANGES' => 'Lưu thay đổi',
        ],
        'CONFIGURATION_FORM' => [
            'CUSTOM_DOMAIN' => [
                'HEADER' => 'Tên miền tuỳ chỉnh',
                'LABEL' => 'Tên miền tuỳ chỉnh:',
                'DESCRIPTION' => 'Bạn có thể đặt cổng trợ giúp trên tên miền riêng. Ví dụ website của bạn là tencuaban.com và bạn muốn cổng trợ giúp ở docs.tencuaban.com thì chỉ cần điền vào ô này.',
                'STATUS_DESCRIPTION' => 'Cổng trợ giúp riêng của bạn sẽ chạy ngay khi được xác minh.',
                'PLACEHOLDER' => 'Tên miền tuỳ biến cổng',
                'EDIT_BUTTON' => 'Chỉnh sửa',
                'ADD_BUTTON' => 'Thêm tên miền riêng',
                'STATUS' => [
                    'LIVE' => 'Trực tuyến',
                    'PENDING' => 'Đang chờ xác minh',
                    'ERROR' => 'Xác minh thất bại',
                ],
                'DIALOG' => [
                    'ADD_HEADER' => 'Thêm tên miền riêng',
                    'EDIT_HEADER' => 'Sửa tên miền riêng',
                    'ADD_CONFIRM_BUTTON_LABEL' => 'Thêm tên miền',
                    'EDIT_CONFIRM_BUTTON_LABEL' => 'Cập nhật tên miền',
                    'LABEL' => 'Tên miền tuỳ chỉnh',
                    'PLACEHOLDER' => 'Tên miền tuỳ biến cổng',
                    'ERROR' => 'Tên miền riêng là bắt buộc',
                    'FORMAT_ERROR' => 'Bạn hãy nhập URL tên miền hợp lệ, ví dụ docs.tencuaban.com',
                ],
                'DNS_CONFIGURATION_DIALOG' => [
                    'HEADER' => 'Cấu hình DNS',
                    'DESCRIPTION' => 'Đăng nhập vào tài khoản ở nhà cung cấp DNS của bạn và thêm bản ghi CNAME cho tên miền con, trỏ tới chatwoot.help',
                    'COPY' => 'Đã chép CNAME',
                    'SEND_INSTRUCTIONS' => [
                        'HEADER' => 'Gửi hướng dẫn',
                        'DESCRIPTION' => 'Nếu bạn muốn nhờ người bên đội kỹ thuật làm bước này, hãy nhập email của họ bên dưới, chúng tôi sẽ gửi hướng dẫn cần thiết.',
                        'PLACEHOLDER' => 'Nhập email của họ',
                        'ERROR' => 'Hãy nhập địa chỉ email hợp lệ',
                        'SEND_BUTTON' => 'Gửi',
                    ],
                ],
            ],
            'DELETE_PORTAL' => [
                'BUTTON' => 'Xóa {portalName}',
                'HEADER' => 'Xóa cổng thông tin',
                'DESCRIPTION' => 'Xóa vĩnh viễn cổng trợ giúp này. Không thể hoàn tác',
                'DIALOG' => [
                    'HEADER' => 'Bạn chắc chắn muốn xóa {portalName}?',
                    'DESCRIPTION' => 'Đây là thao tác vĩnh viễn, không thể hoàn tác.',
                    'CONFIRM_BUTTON_LABEL' => 'Xoá',
                ],
            ],
            'EDIT_CONFIGURATION' => 'Sửa cấu hình',
        ],
        'LAYOUT_CONTENT' => [
            'HEADER' => 'Giao diện',
            'DESCRIPTION' => 'Chọn bố cục hợp với cách khách của bạn đọc nội dung.',
            'LAYOUT' => [
                'CLASSIC' => [
                    'TITLE' => 'Cổ điển',
                    'DESCRIPTION' => 'Trang chủ thân thiện có ô tìm kiếm và các chủ đề nổi bật.',
                ],
                'SIDEBAR' => [
                    'TITLE' => 'Tài liệu',
                    'DESCRIPTION' => 'Điều hướng cạnh bên, mọi hướng dẫn chỉ cách một cú bấm.',
                ],
            ],
            'SOCIAL_LINKS' => [
                'HEADER' => 'Liên kết mạng xã hội',
                'DESCRIPTION' => 'Thêm tên tài khoản của từng mạng, trung tâm trợ giúp sẽ tự dựng liên kết đầy đủ. Hiện ở chân trang của bố cục tài liệu.',
                'PLACEHOLDER' => 'tên tài khoản',
                'ADD' => 'Thêm liên kết mạng xã hội',
                'REMOVE' => 'Xoá',
            ],
            'SAVE' => 'Lưu thay đổi',
        ],
        'INTEGRATIONS' => [
            'HEADER' => 'Tích hợp',
            'DESCRIPTION' => 'Kết nối các công cụ mở rộng khả năng của trung tâm trợ giúp.',
            'LIVE_CHAT' => [
                'TITLE' => 'Chat trực tuyến với Chatwoot',
                'DESCRIPTION' => 'Hiện widget chat trực tuyến trên trung tâm trợ giúp để khách hỏi ngay trong lúc đọc.',
                'PLACEHOLDER' => 'Chọn widget chat trực tuyến',
                'NONE_OPTION' => 'Không dùng widget',
            ],
            'GTM' => [
                'TITLE' => 'Google Tag Manager',
                'DESCRIPTION' => 'Thêm thẻ đo lường và tiếp thị bằng cách kết nối container Tag Manager của bạn.',
                'PLACEHOLDER' => 'GTM-XXXXXXX',
                'HELP' => 'Tìm mã này trong workspace Google Tag Manager của bạn. Để trống là tắt.',
                'INVALID' => 'Hãy nhập container ID hợp lệ, ví dụ GTM-XXXXXXX.',
            ],
            'GA4' => [
                'TITLE' => 'Google Analytics 4',
                'DESCRIPTION' => 'Đo lưu lượng và hành vi khách trên trung tâm trợ giúp bằng Google Analytics.',
                'PLACEHOLDER' => 'G-XXXXXXXXXX',
                'HELP' => 'Tìm measurement ID trong mục Admin → Data streams của Google Analytics. Để trống là tắt.',
                'INVALID' => 'Hãy nhập measurement ID hợp lệ, ví dụ G-XXXXXXXXXX.',
            ],
            'HOTJAR' => [
                'TITLE' => 'Hotjar',
                'DESCRIPTION' => 'Hiểu cách khách dùng trung tâm trợ giúp qua bản đồ nhiệt và bản ghi phiên.',
                'PLACEHOLDER' => '1234567',
                'HELP' => 'Tìm site ID trong mục Sites & organizations của Hotjar. Để trống là tắt.',
                'INVALID' => 'Hãy nhập Hotjar site ID dạng số.',
            ],
            'PLAUSIBLE' => [
                'TITLE' => 'Plausible',
                'DESCRIPTION' => 'Theo dõi lưu lượng trung tâm trợ giúp bằng Plausible Analytics, thân thiện quyền riêng tư.',
                'PLACEHOLDER' => 'example.com',
                'HELP' => 'Nhập tên miền đã cấu hình trong phần cài đặt site của Plausible. Để trống là tắt.',
                'INVALID' => 'Hãy nhập tên miền hợp lệ, ví dụ example.com.',
            ],
            'AMPLITUDE' => [
                'TITLE' => 'Amplitude',
                'DESCRIPTION' => 'Phân tích hành vi khách trên trung tâm trợ giúp bằng Amplitude.',
                'PLACEHOLDER' => '0123456789abcdef0123456789abcdef',
                'HELP' => 'Tìm API key trong phần cài đặt dự án Amplitude. Để trống là tắt.',
                'INVALID' => 'Hãy nhập Amplitude API key hợp lệ.',
            ],
            'CLARITY' => [
                'TITLE' => 'Microsoft Clarity',
                'DESCRIPTION' => 'Ghi bản đồ nhiệt và bản ghi phiên bằng Microsoft Clarity.',
                'PLACEHOLDER' => 'abcd1234ef',
                'HELP' => 'Tìm project ID trong phần cài đặt dự án Clarity. Để trống là tắt.',
                'INVALID' => 'Hãy nhập Clarity project ID hợp lệ.',
            ],
            'META_PIXEL' => [
                'TITLE' => 'Meta Pixel',
                'DESCRIPTION' => 'Đo chuyển đổi quảng cáo và dựng tệp khách hàng từ lượt xem trung tâm trợ giúp bằng Meta Pixel.',
                'PLACEHOLDER' => '123456789012345',
                'HELP' => 'Tìm pixel ID trong Meta Events Manager. Để trống là tắt.',
                'INVALID' => 'Hãy nhập pixel ID dạng số.',
            ],
            'SAVE' => 'Lưu thay đổi',
        ],
        'NAV' => [
            'GENERAL' => 'Chung',
            'DOMAIN' => 'Miền',
            'APPEARANCE' => 'Giao diện',
            'INTEGRATIONS' => 'Tích hợp',
        ],
        'API' => [
            'CREATE_PORTAL' => [
                'SUCCESS_MESSAGE' => 'Cổng thông tin được tạo thành công',
                'ERROR_MESSAGE' => 'Không tạo được cổng trợ giúp',
            ],
            'UPDATE_PORTAL' => [
                'SUCCESS_MESSAGE' => 'Cổng thông tin được cập nhật thành công',
                'ERROR_MESSAGE' => 'Không cập nhật được cổng trợ giúp',
            ],
        ],
    ],
    'PDF_UPLOAD' => [
        'TITLE' => 'Tải lên tài liệu PDF',
        'DESCRIPTION' => 'Tải lên tài liệu PDF để AI tự sinh câu hỏi thường gặp',
        'DRAG_DROP_TEXT' => 'Kéo thả tệp PDF vào đây, hoặc bấm để chọn',
        'SELECT_FILE' => 'Chọn tệp PDF',
        'ADDITIONAL_CONTEXT_LABEL' => 'Bối cảnh thêm (không bắt buộc)',
        'ADDITIONAL_CONTEXT_PLACEHOLDER' => 'Nhập thêm bối cảnh hoặc yêu cầu cho việc sinh câu hỏi thường gặp...',
        'UPLOADING' => 'Đang tải lên...',
        'UPLOAD' => 'Tải lên và xử lý',
        'CANCEL' => 'Huỷ',
        'ERROR_INVALID_TYPE' => 'Bạn hãy chọn một tệp PDF hợp lệ',
        'ERROR_FILE_TOO_LARGE' => 'Tệp phải nhỏ hơn 512MB',
        'ERROR_UPLOAD_FAILED' => 'Tải PDF lên thất bại. Bạn hãy thử lại.',
    ],
    'PDF_DOCUMENTS' => [
        'TITLE' => 'Tài liệu PDF',
        'DESCRIPTION' => 'Quản lý các tài liệu PDF đã tải lên và sinh câu hỏi thường gặp từ đó',
        'UPLOAD_PDF' => 'Tải PDF lên',
        'UPLOAD_FIRST_PDF' => 'Tải lên tệp PDF đầu tiên',
        'UPLOADED_BY' => 'Người tải lên',
        'GENERATE_FAQS' => 'Sinh câu hỏi thường gặp',
        'GENERATING' => 'Đang sinh...',
        'CONFIRM_DELETE' => 'Bạn chắc chắn muốn xóa {filename}?',
        'EMPTY_STATE' => [
            'TITLE' => 'Chưa có tài liệu PDF nào',
            'DESCRIPTION' => 'Tải tài liệu PDF lên để AI tự sinh câu hỏi thường gặp',
        ],
        'STATUS' => [
            'UPLOADED' => 'Sẵn sàng',
            'PROCESSING' => 'Đang xử lý',
            'PROCESSED' => 'Hoàn tất',
            'FAILED' => 'Thất bại',
        ],
    ],
    'CONTENT_GENERATION' => [
        'TITLE' => 'Sinh nội dung',
        'DESCRIPTION' => 'Tải tài liệu PDF lên để AI tự sinh nội dung câu hỏi thường gặp',
        'UPLOAD_TITLE' => 'Tải lên tài liệu PDF',
        'DRAG_DROP' => 'Kéo thả tệp PDF vào đây, hoặc bấm để chọn',
        'SELECT_FILE' => 'Chọn tệp PDF',
        'UPLOADING' => 'Đang xử lý tài liệu...',
        'UPLOAD_SUCCESS' => 'Đã xử lý xong tài liệu!',
        'UPLOAD_ERROR' => 'Tải tài liệu lên thất bại. Bạn hãy thử lại.',
        'INVALID_FILE_TYPE' => 'Bạn hãy chọn một tệp PDF hợp lệ',
        'FILE_TOO_LARGE' => 'Tệp phải nhỏ hơn 512MB',
        'GENERATED_CONTENT' => 'Nội dung câu hỏi thường gặp đã sinh',
        'PUBLISH_SELECTED' => 'Xuất bản mục đã chọn',
        'PUBLISHING' => 'Đang xuất bản...',
        'FROM_DOCUMENT' => 'Từ tài liệu',
        'NO_CONTENT' => 'Chưa có nội dung nào được sinh. Hãy tải lên một tài liệu PDF để bắt đầu.',
        'LOADING' => 'Đang tải nội dung đã sinh...',
    ],
];
