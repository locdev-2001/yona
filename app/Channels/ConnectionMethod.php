<?php

namespace App\Channels;

/**
 * Cách người dùng nối một kênh vào Yona — mỗi driver kênh khai đúng MỘT cách
 * (DeclaresConnection). Giá trị chuỗi là hợp đồng với màn "Thêm kênh" và API.
 */
enum ConnectionMethod: string
{
    // Quét mã QR bằng app của nền tảng (Zalo cá nhân).
    case Qr = 'qr';
    // Chuyển trang sang nhà cung cấp rồi quay lại callback (Google, Microsoft…).
    case OauthRedirect = 'oauth_redirect';
    // Cửa sổ đăng nhập bật lên bằng SDK của nền tảng (Facebook).
    case OauthPopup = 'oauth_popup';
    // Dán một mã do nền tảng cấp, kèm hướng dẫn lấy mã (Telegram, LINE).
    case Token = 'token';
    // Điền form thông số (widget website, máy chủ thư, nhà cung cấp tự quản).
    case Form = 'form';
    // Đăng nhập nhiều bước bằng tài khoản của nền tảng (mật khẩu, 2FA, duyệt thiết bị)
    // qua dịch vụ riêng; Yona không giữ mật khẩu (Messenger cá nhân).
    case Credentials = 'credentials';

    /** Năng lực phiên mà kênh phải khai để khớp với cách kết nối này. */
    public function sessionCapability(): ?Capability
    {
        return match ($this) {
            self::Qr => Capability::SessionQr,
            self::OauthRedirect, self::OauthPopup => Capability::SessionOauth,
            self::Token => Capability::SessionToken,
            self::Credentials => Capability::SessionReauth,
            self::Form => null,
        };
    }
}
