<?php

namespace App\Messaging\Structured\Types;

use App\Messaging\Structured\Action;
use App\Messaging\Structured\ActionKind;

/** Nút → dòng chữ cho kênh không có nút: "Xem bộ sưu tập: https://…", "Gọi shop: 0901…". */
final class ActionText
{
    /**
     * @param  list<Action>  $actions
     * @return list<string>
     */
    public static function lines(array $actions): array
    {
        $lines = [];

        foreach ($actions as $action) {
            $target = match ($action->kind) {
                ActionKind::Link => $action->url,
                ActionKind::Call => $action->phone,
                ActionKind::Copy => $action->value,
                default => null,
            };

            if ($target !== null) {
                $lines[] = "{$action->label}: {$target}";
            }
        }

        return $lines;
    }
}
