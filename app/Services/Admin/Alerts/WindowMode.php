<?php

namespace App\Services\Admin\Alerts;

// Nghĩa của "cửa sổ đánh giá" với từng loại chỉ số.
enum WindowMode: string
{
    // Đếm sự kiện trong N phút vừa qua (job lỗi): vượt ngưỡng là mở sự cố ngay.
    case Lookback = 'lookback';

    // Giá trị tức thời (kênh lỗi, hàng đợi): phải vượt ngưỡng liên tục N phút mới
    // mở sự cố, để một nhịp chập chờn không thành thông báo.
    case Sustain = 'sustain';
}
