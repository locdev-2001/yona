<?php

namespace App\Services\Zalo\Exception;

// Ngắt mạch: bridge lỗi liên tục, dừng gửi để khỏi bị Zalo khóa tài khoản.
class ZaloCircuitOpenException extends \RuntimeException {}
