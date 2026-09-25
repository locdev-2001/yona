<?php

namespace App\Messaging\Structured;

use App\Models\Message;
use Illuminate\Contracts\Validation\Factory as ValidationFactory;
use InvalidArgumentException;

/**
 * content_type → StructuredType, và là cửa duy nhất để kiểm, chuẩn hoá, đọc lại
 * payload. Danh sách loại nằm ở `config/messaging.php`.
 */
final class StructuredTypeRegistry
{
    /** @var array<string, StructuredType> */
    private array $types = [];

    /** @param iterable<StructuredType> $types */
    public function __construct(iterable $types, private readonly ValidationFactory $validator)
    {
        foreach ($types as $type) {
            if (! array_key_exists($type->contentType(), Message::CONTENT_TYPES)) {
                throw new InvalidArgumentException("Unknown content_type '{$type->contentType()}'");
            }

            $this->types[$type->contentType()] = $type;
        }
    }

    public function for(?string $contentType): ?StructuredType
    {
        return $contentType === null ? null : ($this->types[$contentType] ?? null);
    }

    /** @return list<string> */
    public function contentTypes(): array
    {
        return array_keys($this->types);
    }

    /**
     * Kiểm và chuẩn hoá payload lúc tạo tin. Loại không đăng ký thì trả nguyên.
     * Khoá không thuộc loại (in_reply_to, email…) được giữ lại.
     *
     * @throws InvalidStructuredPayload
     */
    public function prepare(?string $contentType, ?string $content, array $attributes, PayloadContext $context): array
    {
        $type = $this->for($contentType);

        if ($type === null) {
            return $attributes;
        }

        if (! in_array($context->messageType, $type->allowedMessageTypes(), true)) {
            throw InvalidStructuredPayload::notAllowed($type->contentType());
        }

        $rules = $type->rules();
        $validation = $this->validator->make([...$attributes, 'content' => $content], $rules);

        if ($validation->fails()) {
            throw new InvalidStructuredPayload($validation->errors()->first());
        }

        $owned = array_flip(self::ownedKeys($rules));

        return [...array_diff_key($attributes, $owned), ...$type->normalize(array_intersect_key($attributes, $owned), $context)];
    }

    /**
     * Payload đã lưu của một tin, đọc dễ dãi: tin tạo trước khi có lõi có thể sai
     * schema — khi đó trả null để nơi gọi rơi về cách xử lý chữ thường.
     */
    public function read(Message $message): ?array
    {
        $type = $this->for($message->contentTypeName());

        if ($type === null) {
            return null;
        }

        try {
            $context = new PayloadContext($message->conversation, $type->allowedMessageTypes()[0], fromStorage: true);

            return $this->prepare($type->contentType(), $message->content, $message->content_attributes ?? [], $context);
        } catch (InvalidStructuredPayload) {
            return null;
        }
    }

    /** @return list<string> */
    private static function ownedKeys(array $rules): array
    {
        $keys = array_map(fn (string $key) => explode('.', $key)[0], array_keys($rules));

        return array_values(array_unique(array_diff($keys, ['content'])));
    }
}
