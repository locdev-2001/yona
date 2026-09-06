<?php

namespace App\Support;

use Illuminate\Http\Request;

// Nguồn duy nhất trả lời "request này thuộc phiên nào" cho mọi lối dùng
// user_sessions (danh sách, thu hồi, cập nhật hoạt động).
//
// Giá trị được ghi vào payload phiên lúc đăng nhập thay vì đọc thẳng
// session()->getId() ở từng chỗ: id phiên xoay khi regenerate (đăng nhập, đổi
// mật khẩu) nên đọc trực tiếp sẽ trỏ nhầm sang phiên khác.
class CurrentUserSession
{
    public const SESSION_KEY = 'user_session_client_id';

    public static function remember(Request $request, string $clientId): void
    {
        $request->session()->put(self::SESSION_KEY, $clientId);
    }

    public static function clientId(Request $request): ?string
    {
        return $request->session()->get(self::SESSION_KEY);
    }
}
