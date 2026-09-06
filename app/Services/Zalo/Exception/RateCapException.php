<?php

namespace App\Services\Zalo\Exception;

// Vượt hạn mức tin CHỦ ĐỘNG mỗi số mỗi ngày.
class RateCapException extends \RuntimeException {}
