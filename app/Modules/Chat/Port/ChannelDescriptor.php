<?php

namespace App\Modules\Chat\Port;

use App\Enums\TenantPermission;

/**
 * Danh tính của một kênh, do chính phích cắm khai.
 *
 * Đây là thứ thay cho mọi literal tên kênh trong lõi và giao diện: lõi không hỏi
 * "kênh này có phải Zalo không", nó hỏi descriptor. Thêm kênh mới = khai một
 * descriptor, không sửa lõi.
 */
final readonly class ChannelDescriptor
{
    public function __construct(
        /** Khóa định danh kênh, cũng là khóa dùng trong DB và hạn mức. */
        public string $key,
        /** Tên hiển thị cho người dùng cuối. */
        public string $label,
        /** Nhóm chức năng trên trang tích hợp: 'chat' · 'payment' · … */
        public string $category,
        public string $logo,
        /** Ký hiệu ngắn vẽ trên thanh tài khoản của inbox. */
        public string $badge,
        /**
         * Tên route tới trang kết nối của kênh. `null` = kênh không có trang
         * riêng (kênh nội bộ), giao diện phải ẩn nút thay vì gọi `route()` —
         * route của phích cắm ngoài chỉ tồn tại khi kênh đó được bật.
         */
        public ?string $connectRouteName,
        /**
         * Quyền quản trị kênh — kiểu ENUM, không phải chuỗi tự do.
         *
         * Để driver tự khai một chuỗi là để nó tự cấp quyền cho mình: khai đại
         * một quyền ai cũng có thì cửa quản trị mở toang, mà không test nào bắt
         * được vì admin của workspace vốn đi qua mọi kiểm tra.
         */
        public TenantPermission $managePermission,
    ) {}

    /**
     * Khóa hạn mức của kênh.
     *
     * Là method DẪN XUẤT chứ không phải trường khai báo: `EntitlementService`
     * dựng khóa theo đúng công thức này. Cho driver tự khai là đẻ ra nguồn sự
     * thật thứ hai, khai lệch một ký tự thì giao diện hiện hạn mức của kênh khác.
     */
    public function quotaKey(): string
    {
        return 'quota.conversations.'.$this->key;
    }

    /** @return array<string, string|null> */
    public function toArray(): array
    {
        return [
            'key' => $this->key,
            'label' => $this->label,
            'category' => $this->category,
            'logo' => $this->logo,
            'badge' => $this->badge,
            'connectRouteName' => $this->connectRouteName,
            'quotaKey' => $this->quotaKey(),
        ];
    }
}
