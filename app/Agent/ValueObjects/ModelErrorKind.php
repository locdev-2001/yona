<?php

namespace App\Agent\ValueObjects;

// Phân loại lỗi gọi mô hình, quyết định có đổi tuyến hay dừng.
enum ModelErrorKind: string
{
    // 429, 5xx, quá tải, đứt kết nối, quá giờ: thử tuyến kế.
    case Retryable = 'retryable';
    // Prompt vượt cửa sổ ngữ cảnh: dừng, đổi tuyến không chữa được.
    case ContextExceeded = 'context_exceeded';
    // Request sai (400): dừng.
    case InvalidRequest = 'invalid_request';
    // Khoá sai hoặc bị thu hồi: thử tuyến kế, kèm cảnh báo.
    case Auth = 'auth';
    // Không còn tuyến nào dùng được (thiếu khoá, tuyến đang bị ngắt).
    case Unavailable = 'unavailable';
}
