<?php

use App\Agent\Contracts\Ports\ApiCallLog;
use App\Agent\ValueObjects\ApiCallRecord;
use App\Builders\Messages\MessageBuilder;
use App\Events\DomainEvent;
use App\Events\EventType;
use App\Exceptions\Conversations\AutoResponderUnavailable;
use App\Exceptions\Conversations\ConversationFloorHeld;
use App\Http\Resources\MessageResource;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\AiAgent;
use App\Models\ApiLog;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use App\Services\AiAgents\AiAgentService;
use App\Services\ConversationActions\ActionExecutor;
use App\Services\Conversations\AutoResponderStopReason;
use App\Services\Conversations\ConversationAutoResponder;
use App\Services\Conversations\ConversationFloor;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/** @return array{0: Account, 1: Inbox, 2: Conversation, 3: User} */
function autoResponderFixtures(): array
{
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $contact = Contact::factory()->create(['account_id' => $account->id]);
    $contactInbox = ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $inbox->id]);
    $conversation = Conversation::factory()->create([
        'account_id' => $account->id,
        'inbox_id' => $inbox->id,
        'contact_id' => $contact->id,
        'contact_inbox_id' => $contactInbox->id,
    ]);
    $agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $agent->id, 'role' => AccountUser::ROLE_AGENT]);
    $inbox->addMembers([$agent->id]);

    return [$account, $inbox, $conversation, $agent];
}

function autoResponderUrl(Account $account, Conversation $conversation, string $path = 'auto_responder'): string
{
    return "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/{$path}";
}

/** AI agent mới, gắn phụ trách inbox của hội thoại. */
function inboxAiAgent(Conversation $conversation, string $name = 'Lan'): AiAgent
{
    $service = app(AiAgentService::class);
    $aiAgent = $service->create($conversation->account, $name);
    $service->assignInbox($conversation->inbox, $aiAgent);

    return $aiAgent;
}

/** Bật tự động + AI của inbox giữ quyền nói 60 giây. */
function holdFloor(Conversation $conversation, AiAgent $aiAgent): void
{
    app(ConversationAutoResponder::class)->enable($conversation);
    expect(app(ConversationFloor::class)->acquire($conversation, $aiAgent, now()->addMinute()))->toBeTrue();
}

describe('công tắc tự động trả lời', function () {
    it('bật được khi account có AI mặc định đang bật, ở inbox bất kỳ', function () {
        [$account, , $conversation, $agent] = autoResponderFixtures();
        $aiAgent = inboxAiAgent($conversation);

        $this->actingAs($agent)->postJson(autoResponderUrl($account, $conversation))
            ->assertOk()
            ->assertJsonPath('auto_responder.enabled', true)
            ->assertJsonPath('auto_responder.ai_agent', ['id' => $aiAgent->id, 'name' => 'Lan']);

        expect($conversation->refresh()->ai_auto_reply)->toBeTrue();
    });

    it('từ chối bằng 422 no_replying_ai_agent khi inbox không có AI trả lời', function (Closure $prepare) {
        [$account, , $conversation, $agent] = autoResponderFixtures();
        $prepare($conversation);

        $this->actingAs($agent)->postJson(autoResponderUrl($account, $conversation))
            ->assertUnprocessable()
            ->assertJsonPath('error', AutoResponderUnavailable::CODE)
            ->assertJsonValidationErrors('ai_auto_reply');

        expect($conversation->refresh()->ai_auto_reply)->toBeFalse();
    })->with([
        'inbox chưa gắn AI' => fn (Conversation $conversation) => app(AiAgentService::class)->create($conversation->account, 'Lan'),
        'AI của inbox đang tắt' => fn (Conversation $conversation) => app(AiAgentService::class)->update(inboxAiAgent($conversation), ['enabled' => false]),
        'AI gắn inbox khác' => function (Conversation $conversation) {
            $otherInbox = Inbox::factory()->create(['account_id' => $conversation->account_id]);
            app(AiAgentService::class)->assignInbox($otherInbox, app(AiAgentService::class)->create($conversation->account, 'Lan'));
        },
    ]);

    it('phát conversation.updated mang ai_auto_reply khi bật và khi tắt', function () {
        [$account, , $conversation, $agent] = autoResponderFixtures();
        inboxAiAgent($conversation);
        Event::fake([DomainEvent::class]);

        $this->actingAs($agent)->postJson(autoResponderUrl($account, $conversation))->assertOk();
        $this->actingAs($agent)->deleteJson(autoResponderUrl($account, $conversation))
            ->assertOk()
            ->assertJsonPath('auto_responder.enabled', false);

        $changes = collect(Event::dispatched(DomainEvent::class))
            ->map(fn (array $call) => $call[0])
            ->filter(fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_UPDATED)
            ->map(fn (DomainEvent $event) => $event->data['changed_attributes']['ai_auto_reply'] ?? null)
            ->filter()
            ->values()
            ->all();

        expect($changes)->toBe([[false, true], [true, false]]);
    });

    it('ghi dòng hoạt động khi bật và khi tắt', function () {
        [$account, , $conversation, $agent] = autoResponderFixtures();
        inboxAiAgent($conversation, 'Lan');
        $autoResponder = app(ConversationAutoResponder::class);

        $autoResponder->enable($conversation, $agent);
        $autoResponder->disable($conversation, AutoResponderStopReason::Manual, $agent);

        $activities = $conversation->messages()->where('message_type', Message::TYPE_ACTIVITY)->reorder('id')->pluck('content')->all();

        expect($activities)->toBe([
            "{$agent->name} turned on automatic replies by Lan",
            "{$agent->name} turned off automatic replies",
        ]);
    });
});

describe('AI agent của inbox', function () {
    it('một AI agent gắn được nhiều inbox, mỗi inbox một AI', function () {
        [$account, $inbox, $conversation] = autoResponderFixtures();
        $service = app(AiAgentService::class);
        $first = $service->create($account, 'An');
        $second = $service->create($account, 'Binh');
        $otherInbox = Inbox::factory()->create(['account_id' => $account->id]);

        $service->assignInbox($inbox, $first);
        $service->assignInbox($otherInbox, $first);
        $service->assignInbox($inbox, $second);

        expect($inbox->refresh()->ai_agent_id)->toBe($second->id)
            ->and($otherInbox->refresh()->ai_agent_id)->toBe($first->id)
            ->and($first->inboxes()->pluck('id')->all())->toBe([$otherInbox->id]);
    });

    it('từ chối gắn AI agent của account khác vào inbox', function () {
        [, $inbox] = autoResponderFixtures();

        app(AiAgentService::class)->assignInbox($inbox, AiAgent::factory()->create());
    })->throws(ValidationException::class);

    it('gỡ, đổi, tắt hay xoá AI thì hội thoại giữ công tắc nhưng không còn AI trả lời', function (string $change) {
        [$account, $inbox, $conversation, $agent] = autoResponderFixtures();
        $aiAgent = inboxAiAgent($conversation);
        app(ConversationAutoResponder::class)->enable($conversation);
        $service = app(AiAgentService::class);

        $expectedAiAgent = match ($change) {
            'gỡ khỏi inbox' => $service->assignInbox($inbox, null),
            'tắt' => $service->update($aiAgent, ['enabled' => false]),
            'xoá' => $service->delete($aiAgent),
            'đổi AI khác' => $service->assignInbox($inbox, $successor = $service->create($account, 'Binh')),
        };

        $payload = $this->actingAs($agent)->getJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}")
            ->assertOk()
            ->json('auto_responder');

        expect($conversation->refresh()->ai_auto_reply)->toBeTrue()
            ->and($payload['enabled'])->toBeTrue()
            ->and($payload['ai_agent'])->toBe($change === 'đổi AI khác' ? ['id' => $successor->id, 'name' => 'Binh'] : null)
            ->and(app(ConversationFloor::class)->acquire($conversation, $aiAgent, now()->addMinute()))->toBeFalse();
    })->with(['gỡ khỏi inbox', 'tắt', 'xoá', 'đổi AI khác']);
});

describe('quyền nói của AI', function () {
    it('chặn tin công khai của người bằng 409 floor_held qua phiên và qua api_access_token', function (bool $viaToken) {
        [$account, , $conversation, $agent] = autoResponderFixtures();
        holdFloor($conversation, inboxAiAgent($conversation));

        $request = $viaToken
            ? $this->withHeaders(['api_access_token' => $agent->accessToken->token])
            : $this->actingAs($agent);

        $request->postJson(autoResponderUrl($account, $conversation, 'messages'), ['content' => 'Chào chị'])
            ->assertStatus(409)
            ->assertJsonPath('error', ConversationFloorHeld::CODE);

        expect($conversation->messages()->where('message_type', Message::TYPE_OUTGOING)->exists())->toBeFalse();
    })->with(['phiên dashboard' => false, 'api_access_token' => true]);

    it('vẫn cho ghi chú riêng, automation và chính AI đang giữ lượt', function () {
        [$account, , $conversation, $agent] = autoResponderFixtures();
        $aiAgent = inboxAiAgent($conversation);
        holdFloor($conversation, $aiAgent);

        $this->actingAs($agent)->postJson(autoResponderUrl($account, $conversation, 'messages'), ['content' => 'ghi chú', 'private' => true])
            ->assertOk();
        (new ActionExecutor($conversation))->execute('send_message', ['tin tự động']);
        $fromAi = (new MessageBuilder($aiAgent, $conversation, ['content' => 'Dạ em chào chị']))->perform();

        expect($conversation->messages()->where('message_type', Message::TYPE_OUTGOING)->count())->toBe(3)
            ->and($fromAi->sender_type)->toBe('AiAgent')
            ->and($conversation->refresh()->ai_auto_reply)->toBeTrue();
    });

    it('chặn AI không phải AI trả lời của account', function () {
        [$account, , $conversation] = autoResponderFixtures();
        holdFloor($conversation, inboxAiAgent($conversation));
        $otherAiAgent = app(AiAgentService::class)->create($account, 'Binh');

        (new MessageBuilder($otherAiAgent, $conversation, ['content' => 'xin chào']))->perform();
    })->throws(ConversationFloorHeld::class);

    it('không ghi log lỗi khi macro bị chặn vì đang giữ lượt', function () {
        [$account, , $conversation] = autoResponderFixtures();
        holdFloor($conversation, inboxAiAgent($conversation));
        Log::spy();

        report(new ConversationFloorHeld(now()->addMinute()));

        Log::shouldNotHaveReceived('error');
    });

    it('cho người gửi khi lượt hết hạn hoặc đã nhả', function (string $how) {
        [$account, , $conversation, $agent] = autoResponderFixtures();
        $aiAgent = inboxAiAgent($conversation);
        holdFloor($conversation, $aiAgent);

        match ($how) {
            'hết hạn' => $this->travel(61)->seconds(),
            'nhả' => app(ConversationFloor::class)->release($conversation, $aiAgent),
        };

        $this->actingAs($agent)->postJson(autoResponderUrl($account, $conversation, 'messages'), ['content' => 'Chào chị'])
            ->assertOk();
    })->with(['hết hạn', 'nhả']);

    it('chỉ giữ được lượt khi hội thoại đang tự động, và có trần thời gian giữ', function () {
        [$account, , $conversation] = autoResponderFixtures();
        $aiAgent = inboxAiAgent($conversation);
        $floor = app(ConversationFloor::class);

        expect($floor->acquire($conversation, $aiAgent, now()->addMinute()))->toBeFalse();

        app(ConversationAutoResponder::class)->enable($conversation);

        expect($floor->acquire($conversation, app(AiAgentService::class)->create($account, 'Binh'), now()->addMinute()))->toBeFalse()
            ->and($floor->acquire($conversation, $aiAgent, now()->addHour()))->toBeTrue()
            ->and($conversation->refresh()->floor_held_until->lte(now()->addSeconds(ConversationFloor::MAX_HOLD_SECONDS)))->toBeTrue();
    });

    it('chỉ phát conversation.floor_changed khi giữ và khi nhả, không phát conversation.updated', function () {
        [$account, , $conversation] = autoResponderFixtures();
        $aiAgent = inboxAiAgent($conversation);
        app(ConversationAutoResponder::class)->enable($conversation);
        Event::fake([DomainEvent::class]);
        $floor = app(ConversationFloor::class);

        $floor->acquire($conversation, $aiAgent, now()->addMinute());
        $floor->release($conversation, $aiAgent);
        $floor->release($conversation, $aiAgent);

        $types = collect(Event::dispatched(DomainEvent::class))->map(fn (array $call) => $call[0]->type)->all();

        expect($types)->toBe([EventType::CONVERSATION_FLOOR_CHANGED, EventType::CONVERSATION_FLOOR_CHANGED]);
    });

    it('trả mốc giữ lượt trong payload hội thoại', function () {
        [$account, , $conversation, $agent] = autoResponderFixtures();
        holdFloor($conversation, inboxAiAgent($conversation));

        $heldUntil = $this->actingAs($agent)->getJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}")
            ->assertOk()
            ->json('floor_held_until');

        expect($heldUntil)->toBe($conversation->refresh()->floor_held_until->toISOString());
    });
});

describe('tự chuyển sang thủ công', function () {
    it('tắt tự động khi nhân viên gửi tin công khai sau lượt', function () {
        [$account, , $conversation, $agent] = autoResponderFixtures();
        inboxAiAgent($conversation);
        app(ConversationAutoResponder::class)->enable($conversation);

        $this->actingAs($agent)->postJson(autoResponderUrl($account, $conversation, 'messages'), ['content' => 'Để em hỗ trợ chị'])
            ->assertOk();

        expect($conversation->refresh()->ai_auto_reply)->toBeFalse()
            ->and($conversation->messages()->where('message_type', Message::TYPE_ACTIVITY)->reorder('id', 'desc')->value('content'))
            ->toBe("Switched to manual replies because {$agent->name} replied to the customer");
    });

    it('tắt tự động khi có tin echo từ ứng dụng của kênh', function () {
        [$account, , $conversation] = autoResponderFixtures();
        inboxAiAgent($conversation);
        app(ConversationAutoResponder::class)->enable($conversation);

        Message::factory()->create([
            'account_id' => $account->id,
            'inbox_id' => $conversation->inbox_id,
            'conversation_id' => $conversation->id,
            'message_type' => Message::TYPE_OUTGOING,
            'content' => 'chủ shop trả lời trên điện thoại',
            'content_attributes' => ['external_echo' => true],
        ]);

        expect($conversation->refresh()->ai_auto_reply)->toBeFalse();
    });

    it('giữ tự động với tin của chính AI, ghi chú riêng và automation', function () {
        [$account, , $conversation, $agent] = autoResponderFixtures();
        $aiAgent = inboxAiAgent($conversation);
        app(ConversationAutoResponder::class)->enable($conversation);

        (new MessageBuilder($aiAgent, $conversation, ['content' => 'Dạ em chào chị']))->perform();
        (new MessageBuilder($agent, $conversation, ['content' => 'ghi chú', 'private' => true]))->perform();
        (new ActionExecutor($conversation))->execute('send_message', ['tin tự động']);

        expect($conversation->refresh()->ai_auto_reply)->toBeTrue();
    });
});

describe('AI là người gửi tin', function () {
    it('mang tên và loại ai_agent trong payload realtime và webhook', function () {
        [$account, , $conversation] = autoResponderFixtures();
        $aiAgent = inboxAiAgent($conversation, 'Lan');
        app(ConversationAutoResponder::class)->enable($conversation);

        $message = (new MessageBuilder($aiAgent, $conversation, ['content' => 'Dạ em chào chị']))->perform()->fresh();

        expect(MessageResource::pushEventData($message)['sender'])->toMatchArray(['id' => $aiAgent->id, 'name' => 'Lan', 'type' => 'ai_agent'])
            ->and(MessageResource::webhookData($message)['sender'])->toBe(['id' => $aiAgent->id, 'name' => 'Lan', 'type' => 'ai_agent']);
    });

    it('không tính là phản hồi đầu, và không chặn phản hồi đầu của nhân viên sau đó', function () {
        [$account, , $conversation, $agent] = autoResponderFixtures();
        $aiAgent = inboxAiAgent($conversation);
        app(ConversationAutoResponder::class)->enable($conversation);

        (new MessageBuilder($aiAgent, $conversation, ['content' => 'Dạ em chào chị']))->perform();
        (new MessageBuilder($aiAgent, $conversation, ['content' => 'Chị cần tư vấn mẫu nào ạ?']))->perform();

        expect($conversation->refresh()->first_reply_created_at)->toBeNull()
            ->and($conversation->waiting_since)->not->toBeNull();

        $staffReply = (new MessageBuilder($agent, $conversation, ['content' => 'Em gửi chị bảng giá']))->perform();

        expect($conversation->refresh()->first_reply_created_at?->equalTo($staffReply->created_at))->toBeTrue();
    });
});

it('ghi nhật ký gọi API mô hình qua Port, và xoá dòng quá 30 ngày', function () {
    [$account, , $conversation] = autoResponderFixtures();
    $aiAgent = inboxAiAgent($conversation);
    $record = fn () => app(ApiCallLog::class)->record(new ApiCallRecord(
        $account->id, $conversation->id, $aiAgent->id, 'anthropic', 'model-x', 200, null,
        ['messages' => [['role' => 'user', 'content' => 'Áo size M còn không?']]], ['stop_reason' => 'end_turn'],
        inputTokens: 1200, outputTokens: 80, cacheReadTokens: 1000, costMicroUsd: 950, latencyMs: 1400,
    ));

    $this->travel(-31)->days();
    $record();
    $this->travelBack();
    $record();

    expect(ApiLog::query()->count())->toBe(2);

    $this->artisan('model:prune', ['--model' => [ApiLog::class]])->assertSuccessful();

    $kept = ApiLog::query()->sole();

    expect($kept->only(['account_id', 'conversation_id', 'ai_agent_id', 'provider', 'input_tokens', 'cost_micro_usd', 'latency_ms']))
        ->toBe(['account_id' => $account->id, 'conversation_id' => $conversation->id, 'ai_agent_id' => $aiAgent->id, 'provider' => 'anthropic', 'input_tokens' => 1200, 'cost_micro_usd' => 950, 'latency_ms' => 1400])
        ->and($kept->request['messages'][0]['content'])->toBe('Áo size M còn không?');
});
