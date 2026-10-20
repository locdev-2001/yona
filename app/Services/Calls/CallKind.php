<?php

namespace App\Services\Calls;

// Loại cuộc gọi là chính sách trên cùng một lõi (xem CallPolicies), không phải hệ thống riêng.
enum CallKind: string
{
    case GroupRoom = 'group_room';
    case Direct = 'direct';
}
