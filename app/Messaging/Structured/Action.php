<?php

namespace App\Messaging\Structured;

/**
 * Một nút trên thẻ, dùng chung cho mọi loại tin. Nhận cả dạng đời cũ
 * `{type: link|postback, text, uri, payload}` mà bot và API đang gửi.
 */
final readonly class Action
{
    public const MAX_LABEL = 40;

    private function __construct(
        public ActionKind $kind,
        public string $label,
        public ?string $value = null,
        public ?string $url = null,
        public ?string $page = null,
        public ?string $phone = null,
        public ?string $payload = null,
    ) {}

    /** @throws InvalidStructuredPayload */
    public static function fromArray(mixed $raw): self
    {
        if (! is_array($raw)) {
            throw InvalidStructuredPayload::because('invalid_action');
        }

        $kind = ActionKind::tryFrom((string) ($raw['kind'] ?? $raw['type'] ?? ''));
        $label = trim((string) ($raw['label'] ?? $raw['text'] ?? ''));

        if ($kind === null || $label === '' || mb_strlen($label) > self::MAX_LABEL) {
            throw InvalidStructuredPayload::because('invalid_action');
        }

        return match ($kind) {
            ActionKind::Reply => new self($kind, $label, value: self::required($raw['value'] ?? $label, 200)),
            ActionKind::Link => new self($kind, $label, url: self::url($raw['url'] ?? $raw['uri'] ?? null)),
            ActionKind::Webview => new self($kind, $label, page: self::required($raw['page'] ?? null, 40)),
            ActionKind::Order => new self($kind, $label),
            ActionKind::Copy => new self($kind, $label, value: self::required($raw['value'] ?? null, 200)),
            ActionKind::Call => new self($kind, $label, phone: self::phone($raw['phone'] ?? null)),
            ActionKind::Postback => new self($kind, $label, payload: self::required($raw['payload'] ?? null, 1000)),
        };
    }

    /**
     * @return list<self>
     *
     * @throws InvalidStructuredPayload
     */
    public static function list(mixed $raw, int $max): array
    {
        if ($raw === null) {
            return [];
        }

        if (! is_array($raw) || ! array_is_list($raw) || count($raw) > $max) {
            throw InvalidStructuredPayload::because('invalid_action');
        }

        return array_map(self::fromArray(...), $raw);
    }

    /** Link http(s) duy nhất được nhận; chặn `javascript:`, `data:`… */
    public static function url(mixed $url): string
    {
        $url = trim((string) $url);
        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));

        if (! in_array($scheme, ['http', 'https'], true) || filter_var($url, FILTER_VALIDATE_URL) === false || strlen($url) > 2000) {
            throw InvalidStructuredPayload::because('invalid_url');
        }

        return $url;
    }

    public function toArray(): array
    {
        return array_filter([
            'kind' => $this->kind->value,
            'label' => $this->label,
            'value' => $this->value,
            'url' => $this->url,
            'page' => $this->page,
            'phone' => $this->phone,
            'payload' => $this->payload,
        ], fn (?string $field) => $field !== null);
    }

    /**
     * @param  list<self>  $actions
     * @return list<Choice>
     */
    public static function replyChoices(array $actions): array
    {
        return array_values(array_map(
            fn (self $action) => new Choice((string) $action->value, $action->label),
            array_filter($actions, fn (self $action) => $action->kind === ActionKind::Reply),
        ));
    }

    private static function required(mixed $value, int $max): string
    {
        $value = is_scalar($value) ? trim((string) $value) : '';

        if ($value === '' || mb_strlen($value) > $max) {
            throw InvalidStructuredPayload::because('invalid_action');
        }

        return $value;
    }

    private static function phone(mixed $phone): string
    {
        $phone = trim((string) $phone);

        if (preg_match('/^\+?[0-9][0-9 .-]{6,18}[0-9]$/', $phone) !== 1) {
            throw InvalidStructuredPayload::because('invalid_phone');
        }

        return $phone;
    }
}
