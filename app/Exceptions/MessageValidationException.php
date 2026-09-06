<?php

namespace App\Exceptions;

// Tương đương ActiveRecord::RecordInvalid khi save! message thất bại —
// controller bắt và trả 422 {error} như render_could_not_create_error.
class MessageValidationException extends RecordInvalidException {}
