<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;

// ActiveStorage của Chatwoot trả URL kết thúc bằng TÊN TỆP người dùng tải lên rồi
// 301 sang tệp thật; giao diện đọc tên hiển thị từ chính URL đó (payload không có
// trường filename). Đường dẫn trên đĩa là tên băm nên cần lớp chuyển hướng này.
//
// URL mang chữ ký HMAC ở đoạn giữa — tương đương `signed_id` của ActiveStorage:
// biết id (số tăng dần) và tên tệp gốc vẫn KHÔNG mở được tệp của người khác.
class AttachmentsController extends Controller
{
    public function show(Attachment $attachment, string $token, string $filename): RedirectResponse
    {
        abort_unless(Attachment::fileTokenIsValid($token, $attachment->id), 403);
        abort_unless($attachment->filename === $filename && $attachment->path !== null, 404);

        return redirect(Storage::disk($attachment->disk)->url($attachment->path), 301);
    }
}
