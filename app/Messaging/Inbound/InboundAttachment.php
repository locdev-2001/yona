<?php

namespace App\Messaging\Inbound;

/**
 * Một đính kèm theo cách kênh mô tả, chưa có I/O. Driver chọn đúng một cách dựng:
 *   - `download()`  : lõi tải về đĩa (URL có token/hết hạn, hoặc kênh muốn giữ bản sao);
 *   - `external()`  : trỏ thẳng CDN công khai không hết hạn, không tải;
 *   - `location()` / `contactCard()` / `fallback()`: không có tệp.
 */
final class InboundAttachment
{
    /**
     * @param  array<string, string>  $headers
     * @param  array{0: string, 1: string}|null  $basicAuth
     * @param  array<string, mixed>  $meta
     * @param  list<string>  $alternativeUrls
     */
    private function __construct(
        public readonly AttachmentKind $kind,
        public readonly ?string $downloadUrl = null,
        public readonly ?string $externalUrl = null,
        public readonly ?string $filename = null,
        public readonly array $headers = [],
        public readonly ?array $basicAuth = null,
        public readonly bool $urlIsPublic = false,
        public readonly ?float $latitude = null,
        public readonly ?float $longitude = null,
        public readonly ?string $title = null,
        public readonly array $meta = [],
        public readonly bool $trustedService = false,
        public readonly array $alternativeUrls = [],
    ) {}

    /**
     * `$urlIsPublic`: URL mở được từ trình duyệt mà không cần token → khi tải hỏng, lõi
     * giữ liên kết trong fallback và tự tải lại nền. Mặc định suy từ việc có header/basic
     * auth hay không; kênh nhúng token vào URL (Telegram) phải nói rõ `false`.
     * `$alternativeUrls`: bản khác của cùng tệp, lõi thử lần lượt khi `$url` tải hỏng.
     *
     * @param  array<string, string>  $headers
     * @param  array{0: string, 1: string}|null  $basicAuth
     * @param  list<string>  $alternativeUrls
     */
    public static function download(
        string $url,
        AttachmentKind $kind = AttachmentKind::File,
        ?string $filename = null,
        array $headers = [],
        ?array $basicAuth = null,
        ?bool $urlIsPublic = null,
        array $alternativeUrls = [],
    ): self {
        return new self(
            kind: $kind,
            downloadUrl: $url,
            filename: $filename,
            headers: $headers,
            basicAuth: $basicAuth,
            urlIsPublic: $urlIsPublic ?? ($headers === [] && $basicAuth === null),
            alternativeUrls: $alternativeUrls,
        );
    }

    /**
     * Tệp nằm trên dịch vụ cầu nối của chính Yona (sidecar kênh, thường ở 127.0.0.1) nên
     * lõi bỏ qua hàng rào "chỉ mạng công cộng". Driver PHẢI đối chiếu URL với địa chỉ cấu
     * hình của dịch vụ trước khi dùng — URL lạ đi đường này là SSRF. Luôn cần bí mật nên
     * không bao giờ lộ ra trình duyệt.
     *
     * @param  array<string, string>  $headers
     */
    public static function fromTrustedService(string $url, AttachmentKind $kind, ?string $filename, array $headers): self
    {
        return new self(
            kind: $kind,
            downloadUrl: $url,
            filename: $filename,
            headers: $headers,
            urlIsPublic: false,
            trustedService: true,
        );
    }

    public static function external(string $url, AttachmentKind $kind): self
    {
        return new self(kind: $kind, externalUrl: $url, urlIsPublic: true);
    }

    public static function location(float $latitude, float $longitude, ?string $title = null, ?string $url = null): self
    {
        return new self(kind: AttachmentKind::Location, externalUrl: $url, latitude: $latitude, longitude: $longitude, title: $title);
    }

    /** @param array<string, mixed> $meta tên, họ… theo khoá kênh đã dùng (giao diện đọc `first_name`/`firstName`) */
    public static function contactCard(?string $phone, array $meta = []): self
    {
        return new self(kind: AttachmentKind::ContactCard, title: $phone, meta: $meta);
    }

    public static function fallback(?string $title = null, ?string $url = null): self
    {
        return new self(kind: AttachmentKind::Fallback, externalUrl: $url, title: $title);
    }
}
