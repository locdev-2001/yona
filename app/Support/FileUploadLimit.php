<?php

namespace App\Support;

/**
 * Nguồn duy nhất của hạn mức kích thước tệp, dùng chung cho đường upload
 * (`Attachment::validateFileSize`) và đường máy chủ tự tải tệp của kênh về
 * (`RemoteAttachmentDownloader`).
 *
 * Port `SafeFetch::RequestOptions#default_max_bytes` của bản gốc: đọc
 * `MAXIMUM_FILE_UPLOAD_SIZE` (đơn vị MB), giá trị <= 0 rơi về hằng 40MB.
 * Đọc `config()` lúc gọi chứ không chốt lúc nạp cấu hình, để một lần đổi hạn
 * mức có hiệu lực ở cả hai đường.
 */
final class FileUploadLimit
{
    public const DEFAULT_MEGABYTES = 40;

    public static function maxMegabytes(): int
    {
        $configured = (int) config('limits.maximum_file_upload_size');

        return $configured <= 0 ? self::DEFAULT_MEGABYTES : $configured;
    }

    public static function maxBytes(): int
    {
        return self::maxMegabytes() * 1024 * 1024;
    }
}
