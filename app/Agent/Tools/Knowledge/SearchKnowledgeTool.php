<?php

namespace App\Agent\Tools\Knowledge;

use App\Agent\Contracts\Extensions\Tool;
use App\Agent\Contracts\Ports\KnowledgeReader;
use App\Agent\ValueObjects\KnowledgeHit;
use App\Agent\ValueObjects\ToolCall;
use App\Agent\ValueObjects\ToolErrorCode;
use App\Agent\ValueObjects\ToolKind;
use App\Agent\ValueObjects\ToolResult;
use App\Agent\ValueObjects\ToolSpec;
use App\Agent\ValueObjects\TurnContext;
use Throwable;

// Tra dữ liệu của shop qua Port KnowledgeReader; luôn khoá theo account của lượt.
final class SearchKnowledgeTool implements Tool
{
    public const NAME = 'search_knowledge';

    private const DEFAULT_LIMIT = 5;

    private const MAX_LIMIT = 10;

    private const EMPTY_HINT = 'nothing found; do not guess, use handoff_to_human for binding claims';

    public function __construct(private readonly KnowledgeReader $knowledge) {}

    public function spec(): ToolSpec
    {
        return new ToolSpec(
            self::NAME,
            'Search the business data (help center articles and saved replies) for facts: prices, policies, '
            .'promotions, stock, shipping, product details. Use short keyword queries in the customer\'s language; '
            .'search again with other keywords if nothing relevant comes back. Results are the only source you may '
            .'quote for binding information.',
            [
                'type' => 'object',
                'properties' => [
                    'query' => ['type' => 'string', 'minLength' => 1, 'maxLength' => 200, 'description' => 'A few keywords to look up.'],
                    'limit' => ['type' => 'integer', 'minimum' => 1, 'maximum' => self::MAX_LIMIT, 'description' => 'How many results, default '.self::DEFAULT_LIMIT.'.'],
                ],
                'required' => ['query'],
                'additionalProperties' => false,
            ],
            ToolKind::Read,
        );
    }

    public function run(ToolCall $call, TurnContext $context): ToolResult
    {
        try {
            $hits = $this->knowledge->search(
                $context->conversation->accountId,
                (string) $call->args['query'],
                (int) ($call->args['limit'] ?? self::DEFAULT_LIMIT),
            );
        } catch (Throwable) {
            return ToolResult::failure(ToolErrorCode::SourceUnavailable, 'The knowledge source is unavailable right now; do not guess, use handoff_to_human.', retryable: true);
        }

        if ($hits === []) {
            return ToolResult::success([], self::EMPTY_HINT);
        }

        return ToolResult::success(array_map(fn (KnowledgeHit $hit) => [
            'ref' => $hit->ref,
            'kind' => $hit->kind,
            'title' => $hit->title,
            'excerpt' => $hit->excerpt,
            'provenance' => $hit->provenance->value,
        ], $hits));
    }
}
