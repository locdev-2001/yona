<?php

namespace App\Messaging\Structured\Types;

use App\Messaging\Structured\AbstractStructuredType;
use App\Messaging\Structured\Action;
use App\Messaging\Structured\ActionKind;
use App\Messaging\Structured\PayloadContext;

/** Văn bản kèm 1–3 nút (trả lời, mở link, gọi, chép…). */
final class ButtonsType extends AbstractStructuredType
{
    public const MAX_ACTIONS = 3;

    public function contentType(): string
    {
        return 'buttons';
    }

    public function rules(): array
    {
        return [
            'content' => ['required', 'string', 'max:2000'],
            'actions' => ['required', 'array', 'list', 'min:1', 'max:'.self::MAX_ACTIONS],
        ];
    }

    public function normalize(array $attributes, PayloadContext $context): array
    {
        return ['actions' => array_map(fn (Action $action) => $action->toArray(), Action::list($attributes['actions'], self::MAX_ACTIONS))];
    }

    public function plainText(?string $content, array $attributes, ?string $pageUrl = null): string
    {
        $actions = Action::list($attributes['actions'], self::MAX_ACTIONS);

        return self::lines([$content, ...ActionText::lines($actions), $pageUrl]);
    }

    public function choices(array $attributes): array
    {
        return Action::replyChoices(Action::list($attributes['actions'], self::MAX_ACTIONS));
    }

    public function acceptSubmission(array $attributes, mixed $submitted): array
    {
        return self::acceptedChoice(self::pickChoice($this->choices($attributes), $submitted));
    }

    public function submissionText(array $accepted): string
    {
        return self::choiceLabel($accepted);
    }

    public function needsPublicPage(array $attributes): bool
    {
        return in_array(ActionKind::Webview->value, array_column($attributes['actions'], 'kind'), true);
    }
}
