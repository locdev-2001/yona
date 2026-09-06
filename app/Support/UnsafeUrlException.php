<?php

namespace App\Support;

use RuntimeException;

// SafeFetch::UnsafeUrlError / InvalidUrlError của bản gốc gộp làm một.
class UnsafeUrlException extends RuntimeException {}
