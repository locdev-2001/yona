<?php

use App\Agent\Contracts\Ports\EphemeralStore;
use App\Agent\Persistence\CacheEphemeralStore;
use App\Models\AiAgent;
use App\Models\AiUsageAnalytic;
use App\Models\Message;
use Illuminate\Support\Facades\Http;
use Tests\Feature\Agent\Runtime\ScriptedLanguageModel as Model;
use Tests\Feature\Agent\Runtime\TurnKit;

// Mỗi lượt đã bắt đầu cộng đúng một `turns` vào số liệu tổng kết của nhân viên AI, cùng
// đúng một kết quả theo kết cục của lượt (hoặc không gì cả).

beforeEach(function () {
    TurnKit::boot();
    Http::preventStrayRequests();
});

const TURN_COUNTERS = ['turns', 'replies', 'handoffs', 'failed_turns'];

/** @return array<string, int> */
function turnUsage(AiAgent $aiAgent): array
{
    $rows = AiUsageAnalytic::query()->where('account_id', $aiAgent->account_id)->where('ai_agent_id', $aiAgent->id)->get();

    return array_combine(TURN_COUNTERS, array_map(fn (string $counter) => (int) $rows->sum($counter), TURN_COUNTERS));
}

/** @param  array<string, int>  $counts */
function expectedTurnUsage(array $counts): array
{
    return [...array_fill_keys(TURN_COUNTERS, 0), ...$counts];
}

it('counts each turn end once with its outcome', function (Closure $script, array $expected) {
    ['conversation' => $conversation, 'aiAgent' => $aiAgent] = TurnKit::autoConversation();
    TurnKit::model($script($conversation));

    TurnKit::customerSays($conversation, 'Shop ơi áo còn không?');
    TurnKit::runPendingTurns();

    expect(turnUsage($aiAgent))->toBe(expectedTurnUsage($expected));
})->with([
    'replied' => [fn () => [Model::call('reply', ['text' => 'Dạ áo còn ạ.'])], ['turns' => 1, 'replies' => 1]],
    'handed off' => [fn () => [Model::call('handoff_to_human', ['reason' => 'complaint', 'note' => 'Khách phàn nàn giao chậm.'])], ['turns' => 1, 'handoffs' => 1]],
    'waited for the customer' => [fn () => [Model::call('wait_for_customer', ['reason' => 'Khách cảm ơn.'])], ['turns' => 1]],
    'interrupted by the owner on the channel app' => [fn ($conversation) => [
        function () use ($conversation) {
            TurnKit::ownerEchoes($conversation, 'Chị nhắn anh qua Zalo nhé.');

            return Model::call('search_knowledge', ['query' => 'áo']);
        },
        Model::call('reply', ['text' => 'Không được gửi.']),
    ], ['turns' => 1]],
    'text only twice' => [fn () => [Model::text('Dạ áo còn ạ.'), Model::text('Dạ áo vẫn còn ạ.')], ['turns' => 1, 'failed_turns' => 1]],
    'every model route failed' => [fn () => [Model::failure()], ['turns' => 1, 'failed_turns' => 1]],
    'model refused' => [fn () => [Model::refusal()], ['turns' => 1, 'failed_turns' => 1]],
    'turn job crashed' => [fn () => [fn () => throw new RuntimeException('worker blew up')], ['turns' => 1, 'failed_turns' => 1]],
]);

it('counts a turn without an outcome when the channel window is already closed at wake-up', function () {
    ['conversation' => $conversation, 'aiAgent' => $aiAgent] = TurnKit::autoConversation();
    $conversation->inbox->channel->forceFill(['additional_attributes' => ['agent_reply_time_window' => 1]])->save();
    TurnKit::model([]);

    TurnKit::customerSays($conversation, 'Shop ơi');
    Message::query()->where('conversation_id', $conversation->id)->update(['created_at' => now()->subHours(2)]);
    TurnKit::runPendingTurns();

    expect(turnUsage($aiAgent))->toBe(expectedTurnUsage(['turns' => 1]));
});

it('counts nothing for a turn that never started', function () {
    ['conversation' => $conversation, 'aiAgent' => $aiAgent] = TurnKit::autoConversation();
    TurnKit::model([Model::call('reply', ['text' => 'Dạ còn ạ.'])]);

    TurnKit::customerSays($conversation, 'Shop ơi');
    $conversation->forceFill(['ai_auto_reply' => false])->save();
    TurnKit::runPendingTurns();

    expect(AiUsageAnalytic::query()->where('ai_agent_id', $aiAgent->id)->exists())->toBeFalse();
});

it('counts a turn once when marking the handled message fails after the turn ended', function () {
    ['conversation' => $conversation, 'aiAgent' => $aiAgent] = TurnKit::autoConversation();
    app()->instance(EphemeralStore::class, new class(app(CacheEphemeralStore::class)) implements EphemeralStore
    {
        public function __construct(private readonly EphemeralStore $inner) {}

        public function add(string $key, int $value, int $ttlSeconds): bool
        {
            return $this->inner->add($key, $value, $ttlSeconds);
        }

        public function put(string $key, int $value, int $ttlSeconds): void
        {
            if (str_starts_with($key, 'turn-handled:')) {
                throw new RuntimeException('store unavailable');
            }

            $this->inner->put($key, $value, $ttlSeconds);
        }

        public function get(string $key): ?int
        {
            return $this->inner->get($key);
        }
    });
    TurnKit::model([Model::call('reply', ['text' => 'Dạ áo còn ạ.'])]);

    TurnKit::customerSays($conversation, 'Shop ơi áo còn không?');
    TurnKit::runPendingTurns();

    expect(turnUsage($aiAgent))->toBe(expectedTurnUsage(['turns' => 1, 'failed_turns' => 1]));
});
