<?php

namespace App\Services\Macros;

use App\Exceptions\MessageValidationException;
use App\Models\Attachment;
use App\Models\Macro;

// action_params của send_attachment nhận tham chiếu tệp đã ký (lần đầu) hoặc id
// tệp đã gắn sẵn vào macro (lần sửa sau); mọi giá trị khác là tệp không hợp lệ.
final class AttachmentActionPreparer
{
    public const INVALID_ERROR = 'Invalid attachment';

    /**
     * @param  mixed  $actions  payload thô của client
     * @return array{0: ?list<array<string, mixed>>, 1: list<array{index: int, attributes: array<string, mixed>}>, 2: ?string}
     */
    public function prepare(mixed $actions, int $accountId, ?Macro $macro = null): array
    {
        if (! is_array($actions) || $actions === []) {
            return [is_array($actions) ? [] : null, [], null];
        }

        $sanitized = [];
        $pending = [];

        foreach (array_values($actions) as $index => $action) {
            $action = is_array($action) ? $action : [];

            if (($action['action_name'] ?? null) !== 'send_attachment') {
                $sanitized[] = $action;

                continue;
            }

            $reference = collect($action['action_params'] ?? [])->first();
            $attributes = $this->resolveSigned($reference, $accountId);

            if ($attributes !== null) {
                $pending[] = ['index' => $index, 'attributes' => $attributes];
                $sanitized[] = [...$action, 'action_params' => []];

                continue;
            }

            if ($this->alreadyAttached($macro, $reference)) {
                $sanitized[] = [...$action, 'action_params' => [(int) $reference]];

                continue;
            }

            return [null, [], self::INVALID_ERROR];
        }

        return [$sanitized, $pending, null];
    }

    /**
     * Gắn tệp mới vào macro rồi vá lại id thật vào action tương ứng.
     *
     * @param  list<array<string, mixed>>  $actions
     * @param  list<array{index: int, attributes: array<string, mixed>}>  $pending
     * @return list<array<string, mixed>>
     */
    public function attach(Macro $macro, array $actions, array $pending): array
    {
        foreach ($pending as $item) {
            /** @var Attachment $file */
            $file = $macro->files()->create($item['attributes']);
            $actions[$item['index']]['action_params'] = [$file->id];
        }

        if ($pending !== []) {
            $macro->unsetRelation('files');
        }

        return $actions;
    }

    /** @return array<string, mixed>|null */
    private function resolveSigned(mixed $reference, int $accountId): ?array
    {
        if (! is_string($reference) || $reference === '' || is_numeric($reference)) {
            return null;
        }

        try {
            return Attachment::resolveSignedUpload($reference, $accountId);
        } catch (MessageValidationException) {
            return null;
        }
    }

    private function alreadyAttached(?Macro $macro, mixed $reference): bool
    {
        if ($macro === null || ! is_numeric($reference)) {
            return false;
        }

        return $macro->files()->whereKey((int) $reference)->exists();
    }
}
