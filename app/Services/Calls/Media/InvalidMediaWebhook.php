<?php

namespace App\Services\Calls\Media;

use RuntimeException;

// Webhook không chứng minh được là của nhà cung cấp (thiếu/sai chữ ký, thân bị sửa).
final class InvalidMediaWebhook extends RuntimeException {}
