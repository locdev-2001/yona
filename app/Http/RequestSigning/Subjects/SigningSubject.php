<?php

namespace App\Http\RequestSigning\Subjects;

use Illuminate\Http\Request;

// "Ai đang gọi" theo từng bề mặt: khoá phiên cấp cho subject nào thì chỉ dùng được bởi đúng subject đó.
interface SigningSubject
{
    // Request không thuộc diện ký (vd Application API bằng token): chỉ giới hạn nhịp.
    public function exempt(Request $request): bool;

    public function identify(Request $request): ?string;
}
