<?php

// Link mời tự phục vụ (Cài đặt > Nhân viên > Mời qua link) + trang công khai
// /invite/{token}. `accept.errors.*` dùng ở backend qua __(), phần còn lại
// dùng ở frontend qua t() (namespace INVITE_LINKS).

return [
    'accept' => [
        'errors' => [
            'not_found' => 'Đường dẫn mời này không tồn tại.',
            'revoked' => 'Đường dẫn mời này đã bị thu hồi.',
            'expired' => 'Đường dẫn mời này đã hết hạn.',
            'exhausted' => 'Đường dẫn mời này đã hết lượt sử dụng.',
        ],
    ],

    'PAGE' => [
        'TITLE' => 'Lời mời tham gia {account}',
        'ROLE_BADGE' => 'Vai trò: {role}',
        'JOIN' => [
            'BUTTON' => 'Tham gia ngay',
            'LOGGED_IN_AS' => 'Bạn đang đăng nhập với {email}.',
        ],
        'SIGNUP' => [
            'TITLE' => 'Tạo tài khoản để tham gia {account}',
            'NAME' => [
                'LABEL' => 'Tên của bạn',
                'PLACEHOLDER' => 'Nhập tên hiển thị',
            ],
            'EMAIL' => [
                'LABEL' => 'Email',
                'PLACEHOLDER' => 'Nhập địa chỉ email',
                'ERROR' => 'Bạn hãy nhập địa chỉ email hợp lệ.',
            ],
            'PASSWORD' => [
                'LABEL' => 'Mật khẩu',
                'PLACEHOLDER' => 'Đặt mật khẩu đăng nhập',
            ],
            'SUBMIT' => 'Tạo tài khoản và tham gia',
        ],
        'LOGIN_LINK' => 'Đã có tài khoản? Đăng nhập trước rồi mở lại đường dẫn này để tham gia.',
        'BACK_HOME' => 'Về trang chủ',
        'ERRORS' => [
            'NOT_FOUND' => [
                'TITLE' => 'Không tìm thấy lời mời',
                'DESC' => 'Đường dẫn mời này không tồn tại. Bạn hãy xin người quản trị gửi lại.',
            ],
            'REVOKED' => [
                'TITLE' => 'Lời mời đã bị thu hồi',
                'DESC' => 'Người quản trị đã thu hồi đường dẫn này. Bạn hãy xin một đường dẫn mới.',
            ],
            'EXPIRED' => [
                'TITLE' => 'Lời mời đã hết hạn',
                'DESC' => 'Đường dẫn mời này đã hết hạn sử dụng. Bạn hãy xin người quản trị gửi lại.',
            ],
            'EXHAUSTED' => [
                'TITLE' => 'Lời mời đã hết lượt dùng',
                'DESC' => 'Đường dẫn mời này đã dùng hết số lượt cho phép. Bạn hãy xin một đường dẫn mới.',
            ],
        ],
        'API' => [
            'ERROR_MESSAGE' => 'Không kết nối được máy chủ. Bạn hãy thử lại sau.',
        ],
    ],

    'MANAGE' => [
        'BUTTON' => 'Mời qua link',
        'TITLE' => 'Mời qua đường dẫn',
        'DESC' => 'Tạo đường dẫn để gửi tay qua Zalo. Người nhận tự tạo tài khoản hoặc tham gia một chạm nếu đã có tài khoản.',
        'CLOSE' => 'Đóng',
        'FORM' => [
            'ROLE' => [
                'LABEL' => 'Vai trò',
            ],
            'EXPIRES' => [
                'LABEL' => 'Hạn dùng',
                'OPTIONS' => [
                    'DAY_1' => '1 ngày',
                    'DAY_7' => '7 ngày',
                    'DAY_30' => '30 ngày',
                ],
            ],
            'MAX_USES' => [
                'LABEL' => 'Giới hạn số lượt dùng',
                'PLACEHOLDER' => 'Để trống = không giới hạn tới khi hết hạn',
            ],
            'SUBMIT' => 'Tạo đường dẫn',
        ],
        'CREATED' => [
            'TITLE' => 'Đã tạo đường dẫn mời',
            'HINT' => 'Đường dẫn này chỉ hiện đầy đủ một lần. Bạn hãy sao chép hoặc gửi ngay.',
            'COPY' => 'Sao chép',
            'COPIED' => 'Đã sao chép',
            'SHARE_ZALO' => 'Gửi qua Zalo',
        ],
        'LIST' => [
            'EMPTY' => 'Chưa có đường dẫn mời nào.',
            'ROLE_LABEL' => 'Vai trò {role}',
            'STATUS' => [
                'ACTIVE' => 'Đang hoạt động',
                'REVOKED' => 'Đã thu hồi',
                'EXPIRED' => 'Đã hết hạn',
                'EXHAUSTED' => 'Đã hết lượt',
            ],
            'USES_UNLIMITED' => '{used} lượt đã dùng (không giới hạn)',
            'USES_LIMITED' => '{used}/{max} lượt đã dùng',
            'EXPIRES_AT' => 'Hết hạn {date}',
            'CREATED_BY' => 'Tạo bởi {name}',
            'REVOKE' => [
                'BUTTON' => 'Thu hồi',
                'CONFIRM' => [
                    'TITLE' => 'Thu hồi đường dẫn mời',
                    'MESSAGE' => 'Đường dẫn này sẽ không dùng để tham gia được nữa. Bạn có chắc muốn thu hồi?',
                    'YES' => 'Thu hồi',
                    'NO' => 'Không, giữ lại',
                ],
            ],
        ],
        'API' => [
            'CREATE_SUCCESS' => 'Đã tạo đường dẫn mời',
            'CREATE_ERROR' => 'Không kết nối được máy chủ. Bạn hãy thử lại sau.',
            'REVOKE_SUCCESS' => 'Đã thu hồi đường dẫn mời',
            'REVOKE_ERROR' => 'Không kết nối được máy chủ. Bạn hãy thử lại sau.',
        ],
    ],
];
