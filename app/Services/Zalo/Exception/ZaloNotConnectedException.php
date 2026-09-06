<?php

namespace App\Services\Zalo\Exception;

// Phiên Zalo không dùng được: chưa quét QR, mất phiên, hoặc bridge không trả lời.
class ZaloNotConnectedException extends \RuntimeException {}
