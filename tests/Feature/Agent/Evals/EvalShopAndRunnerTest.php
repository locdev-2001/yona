<?php

use App\Agent\Boundary\Evals\EvalConversations;
use App\Agent\Boundary\Evals\EvalShopSeeder;
use App\Agent\Contracts\Ports\LanguageModel;
use App\Agent\Evals\EvalModel;
use App\Agent\Evals\EvalRunner;
use App\Agent\Evals\Judge;
use App\Agent\Evals\Outcome;
use App\Agent\Evals\ShopFixture;
use App\Agent\Evals\SimulatedCustomer;
use App\Agent\Evals\Speaker;
use App\Agent\Evals\TurnPump;
use App\Agent\Runtime\TurnSettings;
use App\Agent\Tools\Runner\Registry;
use App\Agent\ValueObjects\ModelRequest;
use App\Builders\Messages\MessageBuilder;
use App\Models\Account;
use App\Models\AiAgent;
use App\Models\Article;
use App\Models\CannedResponse;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\PaymentAccount;
use Tests\Feature\Agent\Evals\EvalFixtures;
use Tests\Feature\Agent\Runtime\ScriptedLanguageModel;

test('dựng shop mẫu chạy lại không nhân đôi và đúng dữ liệu tệp', function () {
    $fixture = ShopFixture::fromFile();
    $seeder = app(EvalShopSeeder::class);

    $first = $seeder->seed($fixture);
    $second = $seeder->seed($fixture);

    expect($second)->toEqual($first)
        ->and($seeder->find($fixture))->toEqual($first)
        ->and(Account::query()->where("custom_attributes->{$fixture->marker}", true)->count())->toBe(1)
        ->and(Inbox::query()->where('account_id', $first->accountId)->count())->toBe(1)
        ->and(Inbox::query()->find($first->inboxId)->ai_agent_id)->toBe($first->aiAgentId)
        ->and(AiAgent::query()->find($first->aiAgentId)->instructions)->toBe($fixture->aiAgent['instructions'])
        ->and(CannedResponse::query()->where('account_id', $first->accountId)->count())->toBe(count($fixture->cannedResponses) + count($fixture->products))
        ->and(Article::query()->where('account_id', $first->accountId)->published()->count())->toBe(count($fixture->articles))
        ->and(PaymentAccount::query()->where('account_id', $first->accountId)->where('is_default', true)->where('allow_all_agents', true)->count())->toBe(1);

    $card = CannedResponse::query()->where('account_id', $first->accountId)->where('short_code', 'sp-vay-hoa-nhi')->first();
    expect($card->content_type)->toBe('cards')
        ->and($card->content_attributes['items'][0]['price'])->toBe(['amount' => 189000, 'currency' => 'VND'])
        ->and($card->content_attributes['items'][0]['variants'][0]['options'][1]['label'])->toBe('M');
});

test('mục bị gỡ khỏi tệp thì biến mất khỏi shop mẫu ở lần dựng sau', function () {
    $fixture = ShopFixture::fromFile();
    $shop = app(EvalShopSeeder::class)->seed($fixture);
    CannedResponse::query()->create(['account_id' => $shop->accountId, 'short_code' => 'cu-da-bo', 'content' => 'Cũ']);

    app(EvalShopSeeder::class)->seed($fixture);

    expect(CannedResponse::query()->where('account_id', $shop->accountId)->where('short_code', 'cu-da-bo')->exists())->toBeFalse();
});

test('chạy một kịch bản đi đúng đường lõi: tin khách thật, AI trả lời qua runtime, khách giả kết thúc, giám khảo chấm', function () {
    config(['agent.turn.enabled' => true, 'agent.turn.daily_budget_usd' => 0]);
    app()->forgetInstance(TurnSettings::class);

    $fixture = ShopFixture::fromFile();
    $shop = app(EvalShopSeeder::class)->seed($fixture);
    $scenario = EvalFixtures::scenario(['history' => [['speaker' => 'customer', 'text' => 'Hôm trước chị hỏi váy', 'days_ago' => 3]]]);

    $model = new ScriptedLanguageModel([
        function (ModelRequest $request) {
            expect($request->modelAlias)->toBeNull();

            return ScriptedLanguageModel::call(Registry::REPLY, ['text' => 'Dạ chị ơi, váy hoa nhí bên em đây ạ.']);
        },
        function (ModelRequest $request) {
            expect($request->modelAlias)->toBe(EvalModel::CUSTOMER_ALIAS)
                ->and($request->aiAgentId)->toBeNull();

            return ScriptedLanguageModel::text('{"message": "", "end": "goal_met", "why": "đủ rồi"}');
        },
        fn (ModelRequest $request) => ScriptedLanguageModel::text('không phải JSON'),
        function (ModelRequest $request) {
            expect($request->modelAlias)->toBe(EvalModel::JUDGE_ALIAS);

            return ScriptedLanguageModel::text(json_encode(EvalFixtures::judgeJson([], ['states-price' => false])));
        },
    ]);
    app()->instance(LanguageModel::class, $model);

    $runner = new EvalRunner(
        app(EvalConversations::class),
        new TurnPump(app('queue.worker'), app('queue'), null, 'agent-eval-test'),
        app(SimulatedCustomer::class),
        app(Judge::class),
    );

    $run = $runner->run($scenario, $fixture, $shop);
    $conversation = Conversation::query()->find($run->conversationId);
    $speakers = array_map(fn ($line) => $line->speaker, $run->transcript);

    expect($run->error)->toBeNull()
        ->and($run->outcome)->toBe(Outcome::GoalMet)
        ->and($conversation->account_id)->toBe($shop->accountId)
        ->and($conversation->ai_auto_reply)->toBeTrue()
        ->and($conversation->additional_attributes[EvalConversations::SCENARIO_ATTRIBUTE])->toBe('ask-price')
        ->and($speakers)->toContain(Speaker::Customer, Speaker::Ai)
        ->and($run->transcript[0]->text)->toBe('Hôm trước chị hỏi váy')
        ->and($run->transcript[0]->at->getTimestamp())->toBeLessThan(now()->subDays(2)->getTimestamp())
        ->and($run->turns)->toHaveCount(1)
        ->and($run->turns[0]->replied)->toBeTrue()
        ->and($run->verdict?->passedAll())->toBeFalse()
        ->and($model->requests)->toHaveCount(4)
        ->and(Message::query()->where('conversation_id', $run->conversationId)->where('message_type', Message::TYPE_INCOMING)->count())->toBe(2);

    expect(app(EvalConversations::class)->purge($shop))->toBe(1)
        ->and(Conversation::query()->where('account_id', $shop->accountId)->count())->toBe(0);
});

test('bộ chấm hỏng giữa chừng thành một lần chạy lỗi, vẫn giữ hội thoại đã diễn ra', function () {
    config(['agent.turn.enabled' => true, 'agent.turn.daily_budget_usd' => 0]);
    app()->forgetInstance(TurnSettings::class);

    $fixture = ShopFixture::fromFile();
    $shop = app(EvalShopSeeder::class)->seed($fixture);
    app()->instance(LanguageModel::class, new ScriptedLanguageModel([
        ScriptedLanguageModel::call(Registry::REPLY, ['text' => 'Dạ em chào chị ạ.']),
        ScriptedLanguageModel::failure(),
    ]));

    $run = (new EvalRunner(app(EvalConversations::class), new TurnPump(app('queue.worker'), app('queue'), null, 'agent-eval-test'), app(SimulatedCustomer::class), app(Judge::class)))
        ->run(EvalFixtures::scenario(), $fixture, $shop);

    expect($run->outcome)->toBe(Outcome::EvalError)
        ->and($run->verdict)->toBeNull()
        ->and($run->error)->toContain('eval_customer failed')
        ->and(array_map(fn ($line) => $line->speaker, $run->transcript))->toContain(Speaker::Ai);
});

test('thẻ sản phẩm AI gửi đọc thành chữ theo ngôn ngữ của account, không theo ngôn ngữ của CLI', function () {
    app()->setLocale('en');
    $shop = app(EvalShopSeeder::class)->seed(ShopFixture::fromFile());
    $conversations = app(EvalConversations::class);
    $conversationId = $conversations->open($shop, 'ask-price', 'Thu Trang', []);
    $card = CannedResponse::query()->where('account_id', $shop->accountId)->where('short_code', 'sp-quan-jean-ong-suong')->first();

    (new MessageBuilder(AiAgent::query()->find($shop->aiAgentId), Conversation::query()->find($conversationId), [
        'content' => 'Mẫu quần chị hỏi ạ',
        'content_type' => 'cards',
        'content_attributes' => $card->content_attributes,
        'private' => true,
    ]))->perform();

    $line = collect($conversations->linesAfter($shop, $conversationId, 0))->last();

    expect($line->text)->toContain('giá cũ 399.000đ')
        ->and($line->text)->not->toContain('was ');
});
