<?php

// Bản dịch tiếng Việt của lang/en/security_settings.php.
// Nguồn: bản dịch `vi` của Chatwoot v4.17.1 (dashboard/widget/survey + config/locales/vi.yml);
// khóa Chatwoot chưa dịch và khóa riêng Yona được dịch mới trong đợt G3.

return [
    'TITLE' => 'Bảo mật',
    'DESCRIPTION' => 'Quản lý thiết lập bảo mật cho tài khoản của bạn.',
    'LINK_TEXT' => 'Tìm hiểu thêm về SAML SSO',
    'SAML_DISABLED_MESSAGE' => 'SAML SSO đang tắt. Bạn hãy liên hệ quản trị viên để bật tính năng này.',
    'SAML' => [
        'TITLE' => 'SAML SSO',
        'NOTE' => 'Cấu hình đăng nhập một lần bằng SAML cho tài khoản của bạn. Người dùng sẽ xác thực qua nhà cung cấp danh tính thay vì dùng email/mật khẩu.',
        'ACS_URL' => [
            'LABEL' => 'ACS URL',
            'TOOLTIP' => 'Assertion Consumer Service URL — cấu hình URL này trong IdP làm đích nhận phản hồi SAML',
        ],
        'SSO_URL' => [
            'LABEL' => 'SSO URL',
            'HELP' => 'URL nhận yêu cầu xác thực SAML',
            'PLACEHOLDER' => 'https://your-idp.com/saml/sso',
        ],
        'CERTIFICATE' => [
            'LABEL' => 'Chứng chỉ ký dạng PEM',
            'HELP' => 'Chứng chỉ công khai của nhà cung cấp danh tính, dùng để xác minh phản hồi SAML',
            'PLACEHOLDER' => '-----BEGIN CERTIFICATE-----
MIIC...',
        ],
        'FINGERPRINT' => [
            'LABEL' => 'Vân tay chứng chỉ',
            'TOOLTIP' => 'Vân tay SHA-1 của chứng chỉ — dùng để đối chiếu chứng chỉ trong cấu hình IdP của bạn',
        ],
        'COPY_SUCCESS' => 'Đã chép',
        'SP_ENTITY_ID' => [
            'LABEL' => 'SP Entity ID',
            'HELP' => 'Mã định danh riêng của ứng dụng này với vai trò nhà cung cấp dịch vụ (tự sinh).',
            'TOOLTIP' => 'Mã định danh riêng của Chatwoot với vai trò nhà cung cấp dịch vụ — cấu hình giá trị này trong IdP của bạn',
        ],
        'IDP_ENTITY_ID' => [
            'LABEL' => 'Entity ID của nhà cung cấp danh tính',
            'HELP' => 'Mã định danh riêng của nhà cung cấp danh tính (thường có trong cấu hình IdP)',
            'PLACEHOLDER' => 'https://your-idp.com/saml',
        ],
        'UPDATE_BUTTON' => 'Cập nhật thiết lập SAML',
        'API' => [
            'SUCCESS' => 'Đã cập nhật thiết lập SAML',
            'ERROR' => 'Cập nhật thiết lập SAML thất bại',
            'ERROR_LOADING' => 'Không tải được thiết lập SAML',
            'DISABLED' => 'Đã tắt thiết lập SAML',
        ],
        'VALIDATION' => [
            'REQUIRED_FIELDS' => 'SSO URL, Entity ID của nhà cung cấp danh tính và Chứng chỉ là các trường bắt buộc',
            'SSO_URL_ERROR' => 'Bạn hãy nhập SSO URL hợp lệ',
            'CERTIFICATE_ERROR' => 'Chứng chỉ là bắt buộc',
            'IDP_ENTITY_ID_ERROR' => 'Entity ID của nhà cung cấp danh tính là bắt buộc',
        ],
        'ENTERPRISE_PAYWALL' => [
            'AVAILABLE_ON' => 'Tính năng SAML SSO chỉ có ở gói Enterprise.',
            'UPGRADE_PROMPT' => 'Hãy nâng cấp lên gói Enterprise để dùng đăng nhập một lần bằng SAML và các tính năng bảo mật nâng cao khác.',
            'ASK_ADMIN' => 'Bạn hãy liên hệ quản trị viên để nâng cấp.',
        ],
        'PAYWALL' => [
            'TITLE' => 'Nâng cấp để bật SAML SSO',
            'AVAILABLE_ON' => 'Tính năng SAML SSO chỉ có ở gói Enterprise.',
            'UPGRADE_PROMPT' => 'Hãy nâng cấp gói để dùng đăng nhập một lần bằng SAML và các tính năng nâng cao khác.',
            'UPGRADE_NOW' => 'Nâng cấp ngay',
            'CANCEL_ANYTIME' => 'Bạn có thể đổi hoặc hủy gói bất cứ lúc nào',
        ],
        'ATTRIBUTE_MAPPING' => [
            'TITLE' => 'Thiết lập thuộc tính SAML',
            'DESCRIPTION' => 'Bạn cần cấu hình các ánh xạ thuộc tính sau trong nhà cung cấp danh tính',
        ],
        'INFO_SECTION' => [
            'TITLE' => 'Thông tin nhà cung cấp dịch vụ',
            'TOOLTIP' => 'Chép những giá trị này và cấu hình trong nhà cung cấp danh tính để thiết lập kết nối SAML',
        ],
    ],
];
