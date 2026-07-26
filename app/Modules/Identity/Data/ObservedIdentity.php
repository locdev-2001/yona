<?php

namespace App\Modules\Identity\Data;

/**
 * Một lần nhìn thấy ai đó — chưa biết là ai, chỉ biết vừa gặp bí danh này.
 *
 * Không mang gì của HTTP, không mang gì của một nhà cung cấp cụ thể: đây là
 * ngôn ngữ của tầng định danh, mọi nguồn dịch về đây.
 */
final readonly class ObservedIdentity
{
    /**
     * @param  string  $key  loại bí danh: phone · email · zalo_uid · messenger_psid · …
     * @param  string  $value  giá trị thô của bí danh
     * @param  string  $source  nơi biết được: zalo_personal · haravan · import_excel · manual
     * @param  list<string>  $channels  kênh người này đang dùng — sự thật phải kiểm chứng,
     *                                  KHÔNG suy ra được từ `key`
     * @param  array<string, mixed>  $attributes  phần còn lại, mỗi nguồn mỗi khác
     */
    public function __construct(
        public string $workspaceId,
        public string $key,
        public string $value,
        public string $source,
        public ?string $channelAccountId = null,
        public ?string $displayName = null,
        public ?string $avatarUrl = null,
        public array $channels = [],
        public array $attributes = [],
        public bool $isVerified = false,
    ) {}
}
