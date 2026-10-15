<?php

namespace App\Agent\ValueObjects;

// Tập đóng lý do AI chuyển hội thoại cho người; giao diện hiện nhãn theo giá trị.
enum HandoffReason: string
{
    // Cần khẳng định ràng buộc (giá, chính sách, khuyến mãi, tồn kho) mà không có nguồn.
    case BindingInfoMissing = 'binding_info_missing';
    case CustomerRequestedHuman = 'customer_requested_human';
    case Complaint = 'complaint';
    case OutOfScope = 'out_of_scope';
    case Other = 'other';
}
