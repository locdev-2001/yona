<?php

namespace App\Agent\ValueObjects;

// Mức tin cậy của một đoạn văn bản đưa vào prompt. Chỉ `directive` là chỉ thị; còn lại là dữ liệu.
enum Provenance: string
{
    case Directive = 'directive';
    // Dữ liệu doanh nghiệp (Help Center, câu trả lời mẫu, kho tri thức): nguồn chuẩn cho khẳng định.
    case Business = 'business';
    // Ghi chú riêng của nhân viên người.
    case Staff = 'staff';
    // Lời khách và mọi thứ dẫn xuất từ lời khách.
    case Customer = 'customer';
}
