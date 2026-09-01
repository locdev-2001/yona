<?php

namespace App\Exceptions;

use RuntimeException;

// Tương đương ActiveRecord::RecordInvalid khi save! message thất bại —
// controller bắt và trả 422 {error} như render_could_not_create_error.
class MessageValidationException extends RuntimeException {}
