<?php

namespace App\Modules\Chat\Port;

use Illuminate\Support\Manager;
use InvalidArgumentException;

/**
 * Sổ đăng ký kênh nhắn tin.
 *
 * Có HAI mức, cố ý tách rời:
 *   - `declare()` — kênh này TỒN TẠI trong bản dựng. Khai vô điều kiện.
 *   - `extend()`  — kênh này CẮM ĐƯỢC ngay bây giờ. Chỉ khi cổng config bật.
 *
 * Tách ra vì trang tích hợp phải hiện cả kênh đang tắt — đó chính là chỗ để
 * người dùng bật nó lên; gộp hai mức thì tắt kênh là mất luôn đường bật lại.
 * Đường gửi/nhận chỉ nhìn mức thứ hai.
 *
 * Lõi gọi `driver()` và không import class driver nào.
 */
class ChannelRegistry extends Manager
{
    /** @var array<string, ChannelDescriptor> */
    private array $declared = [];

    /**
     * Khai một kênh tồn tại, bất kể nó có đang bật hay không.
     */
    public function declare(ChannelDescriptor $descriptor): void
    {
        $this->declared[$descriptor->key] = $descriptor;
    }

    /**
     * Trả về ChannelDriver theo key kênh.
     *
     * @throws InvalidArgumentException nếu driver chưa đăng ký
     */
    public function driver(mixed $driver = null): ChannelDriver
    {
        /** @var ChannelDriver */
        return parent::driver($driver);
    }

    /**
     * Kiểm tra có ít nhất 1 driver được đăng ký hay chưa.
     * Dùng để hiển thị empty state khi tất cả channel driver tắt.
     */
    public function hasAny(): bool
    {
        return ! empty($this->customCreators);
    }

    /**
     * Mọi driver đã đăng ký, theo key.
     *
     * Dựng instance cho TẤT CẢ key nên kéo theo toàn bộ dependency chain —
     * đừng gọi trong middleware chạy mọi request.
     *
     * @return array<string, ChannelDriver>
     */
    public function all(): array
    {
        $drivers = [];
        foreach (array_keys($this->customCreators) as $key) {
            $drivers[$key] = $this->driver($key);
        }

        return $drivers;
    }

    /**
     * Danh tính của một kênh — kể cả kênh đang tắt.
     *
     * @throws InvalidArgumentException kênh không tồn tại trong bản dựng
     */
    public function descriptor(string $key): ChannelDescriptor
    {
        return $this->descriptors()[$key]
            ?? throw new InvalidArgumentException("Kênh [{$key}] không tồn tại.");
    }

    /**
     * Danh tính của MỌI kênh trong bản dựng, theo khóa.
     *
     * Gồm cả kênh đã khai nhưng đang tắt. Driver nào cắm vào bằng `extend()` mà
     * chưa khai thì lấy descriptor từ chính nó — đó là đường của driver dựng
     * lúc chạy (mock trong test), và nó phải dựng driver lên để hỏi.
     *
     * @return array<string, ChannelDescriptor>
     */
    public function descriptors(): array
    {
        $derived = [];

        // Chỉ dựng driver cho những kênh CHƯA khai — kênh đã khai thì lấy thẳng
        // descriptor, không kéo theo chuỗi phụ thuộc của nó.
        foreach (array_keys(array_diff_key($this->customCreators, $this->declared)) as $key) {
            $derived[$key] = $this->driver($key)->descriptor();
        }

        return [...$this->declared, ...$derived];
    }

    /**
     * Lọc driver theo diện tương tác chúng hỗ trợ.
     *
     * Thay cho việc lõi hardcode `driver('zalo_personal')` khi cần "kênh nào
     * làm được việc X" — đó chính là literal tên kênh mà grep gate không bắt
     * được vì nó là chuỗi, không phải tên class.
     *
     * @param  class-string  $capability
     * @return array<string, ChannelDriver>
     */
    public function supporting(string $capability): array
    {
        return array_filter($this->all(), fn (ChannelDriver $driver) => $driver instanceof $capability);
    }

    /**
     * Lớp cha đòi một driver mặc định — trả '' để báo "không có mặc định".
     * Caller nên gọi driver('zalo_personal') tường minh.
     */
    public function getDefaultDriver(): string
    {
        return '';
    }
}
