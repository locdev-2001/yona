<?php

namespace App\Agent\ValueObjects;

enum DeliveryFailure: string
{
    // Lượt không còn giữ quyền nói (hết hạn hoặc đã nhả).
    case FloorLost = 'floor_lost';
    // Hội thoại đã về thủ công.
    case AutoResponderOff = 'auto_responder_off';
    // Cửa sổ trả lời của kênh đã đóng.
    case WindowClosed = 'window_closed';
    // Lõi từ chối nội dung (quá dài, sai định dạng…).
    case Rejected = 'rejected';
    // Thứ được nhắc tới (sản phẩm, nhãn…) không có trong account.
    case NotFound = 'not_found';
    // Shop chưa cho AI dùng thứ đó (vd không tài khoản nhận tiền nào mở cho AI).
    case NotPermitted = 'not_permitted';
}
