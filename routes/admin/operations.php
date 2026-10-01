<?php

// Vận hành tenant và dữ liệu của console quản trị: sức khoẻ kênh, account 360,
// trình duyệt dữ liệu, tìm kiếm, nhật ký thao tác, kho sticker theo account.
// Nạp bên trong nhóm /admin đã qua auth:super_admin + bắt buộc 2FA ở routes/web.php.

use Illuminate\Support\Facades\Route;
