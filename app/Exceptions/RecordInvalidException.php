<?php

namespace App\Exceptions;

use RuntimeException;

// Tương đương ActiveRecord::RecordInvalid: model từ chối lưu vì dữ liệu sai.
// Lớp cha chung cho mọi ngoại lệ kiểu đó — controller bắt loại cụ thể khi cần
// thông điệp riêng, bắt lớp này khi chỉ cần biết "bản ghi không hợp lệ".
class RecordInvalidException extends RuntimeException {}
