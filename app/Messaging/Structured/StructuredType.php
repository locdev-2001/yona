<?php

namespace App\Messaging\Structured;

/**
 * Một loại tin có cấu trúc (thẻ, trả lời nhanh, đơn hàng…). Đây là nơi DUY NHẤT
 * biết hình dạng `content_attributes` của loại đó: kiểm tra đầu vào, chuẩn hoá,
 * hạ cấp thành chữ thuần, liệt kê lựa chọn và nhận câu trả lời của khách.
 *
 * Thêm loại mới = một class hiện thực interface này + một dòng trong
 * `config/messaging.php`. Widget, hộp thư và adapter kênh chỉ hỏi registry,
 * không rẽ nhánh theo `content_type`.
 */
interface StructuredType
{
    /** Tên trong `Message::CONTENT_TYPES`. */
    public function contentType(): string;

    /** @return list<int> Các `Message::TYPE_*` được phép mang loại tin này. */
    public function allowedMessageTypes(): array;

    /**
     * Luật Laravel trên `content_attributes` cộng khoá `content` (chữ đi kèm).
     * Khoá gốc (bỏ `.*`) cũng là danh sách khoá loại này sở hữu.
     *
     * @return array<string, mixed>
     */
    public function rules(): array;

    /**
     * Payload đã qua `rules()` → dạng lưu. Phải idempotent: chuẩn hoá lại
     * dạng đã lưu cho ra đúng nó.
     *
     * @throws InvalidStructuredPayload
     */
    public function normalize(array $attributes, PayloadContext $context): array;

    /** Chữ thuần cho kênh không hiển thị được payload và cho trình đọc màn hình. */
    public function plainText(?string $content, array $attributes, ?string $pageUrl = null): string;

    /** Dòng xem trước trong danh sách hội thoại, thông báo đẩy, email. */
    public function previewText(?string $content, array $attributes): string;

    /** @return list<Choice> Lựa chọn khách trả lời được; rỗng nếu không có. */
    public function choices(array $attributes): array;

    /**
     * Kiểm câu trả lời của khách với payload đã lưu, trả về `submitted_values`.
     *
     * @throws InvalidStructuredPayload
     */
    public function acceptSubmission(array $attributes, mixed $submitted): array;

    /** Nội dung tin khách sinh ra từ câu trả lời, để nhân viên và automation đọc. */
    public function submissionText(array $accepted): string;

    /** Có cần trang công khai (form dài, chọn lịch…) thay vì thao tác ngay trong tin. */
    public function needsPublicPage(array $attributes): bool;
}
