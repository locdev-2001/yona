<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\AiAgent;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\User;
use App\Services\AiAgents\AiAgentService;
use App\Services\Conversations\ConversationAutoResponder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

function aiAgentsAccountMember(Account $account, int $role): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id, 'role' => $role]);

    return $user;
}

function aiAgentsUrl(Account $account, string $path = ''): string
{
    return "/api/v1/accounts/{$account->id}/ai_agents{$path}";
}

function aiAgentsConversation(Inbox $inbox): Conversation
{
    $contact = Contact::factory()->create(['account_id' => $inbox->account_id]);
    $contactInbox = ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $inbox->id]);

    return Conversation::factory()->create([
        'account_id' => $inbox->account_id,
        'inbox_id' => $inbox->id,
        'contact_id' => $contact->id,
        'contact_inbox_id' => $contactInbox->id,
    ]);
}

describe('quyền vào màn nhân viên AI', function () {
    it('quản trị viên mở được trang, nhân viên bị đưa về dashboard', function () {
        $account = Account::factory()->create();
        $admin = aiAgentsAccountMember($account, AccountUser::ROLE_ADMINISTRATOR);
        $agent = aiAgentsAccountMember($account, AccountUser::ROLE_AGENT);

        $this->actingAs($admin)->get("/app/accounts/{$account->id}/settings/ai-agents")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/agent/Index'));

        $this->actingAs($agent)->get("/app/accounts/{$account->id}/settings/ai-agents")
            ->assertRedirect("/app/accounts/{$account->id}/dashboard");
    });

    it('nhân viên không gọi được API quản lý nhân viên AI', function (string $method, string $path) {
        $account = Account::factory()->create();
        $agent = aiAgentsAccountMember($account, AccountUser::ROLE_AGENT);
        $aiAgent = AiAgent::factory()->create(['account_id' => $account->id]);
        $inbox = Inbox::factory()->create(['account_id' => $account->id]);
        $path = str_replace(['{ai}', '{inbox}'], [$aiAgent->id, $inbox->id], $path);

        $this->actingAs($agent)->json($method, "/api/v1/accounts/{$account->id}{$path}", ['name' => 'Linh', 'ai_agent_id' => null])
            ->assertUnauthorized();
    })->with([
        'xem' => ['GET', '/ai_agents'],
        'tạo' => ['POST', '/ai_agents'],
        'sửa' => ['PATCH', '/ai_agents/{ai}'],
        'xoá' => ['DELETE', '/ai_agents/{ai}'],
        'gắn kênh' => ['PUT', '/inboxes/{inbox}/ai_agent'],
    ]);
});

describe('account X không đụng được AI của account Y', function () {
    it('sửa, xoá, gỡ ảnh AI của account khác trả 404 và không đổi gì', function (string $method, string $path) {
        $account = Account::factory()->create();
        $admin = aiAgentsAccountMember($account, AccountUser::ROLE_ADMINISTRATOR);
        $foreign = AiAgent::factory()->create(['name' => 'Của người khác']);

        $this->actingAs($admin)->json($method, aiAgentsUrl($account, str_replace('{ai}', (string) $foreign->id, $path)), ['name' => 'Đổi'])
            ->assertNotFound();

        expect($foreign->fresh())->not->toBeNull()
            ->and($foreign->fresh()->name)->toBe('Của người khác');
    })->with([
        'sửa' => ['PATCH', '/{ai}'],
        'xoá' => ['DELETE', '/{ai}'],
        'gỡ ảnh' => ['DELETE', '/{ai}/avatar'],
    ]);

    it('không gắn được AI của account khác cho kênh, cũng không gắn AI cho kênh của account khác', function () {
        $account = Account::factory()->create();
        $admin = aiAgentsAccountMember($account, AccountUser::ROLE_ADMINISTRATOR);
        $ownInbox = Inbox::factory()->create(['account_id' => $account->id]);
        $foreignAiAgent = AiAgent::factory()->create();
        $foreignInbox = Inbox::factory()->create();
        $ownAiAgent = AiAgent::factory()->create(['account_id' => $account->id]);

        $this->actingAs($admin)->putJson("/api/v1/accounts/{$account->id}/inboxes/{$ownInbox->id}/ai_agent", ['ai_agent_id' => $foreignAiAgent->id])
            ->assertNotFound();
        $this->actingAs($admin)->putJson("/api/v1/accounts/{$account->id}/inboxes/{$foreignInbox->id}/ai_agent", ['ai_agent_id' => $ownAiAgent->id])
            ->assertNotFound();
        $this->actingAs($admin)->postJson(aiAgentsUrl($account), ['name' => 'Linh', 'inbox_ids' => [$foreignInbox->id]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('inbox_ids');

        expect($ownInbox->fresh()->ai_agent_id)->toBeNull()
            ->and($foreignInbox->fresh()->ai_agent_id)->toBeNull()
            ->and(AiAgent::query()->where('account_id', $account->id)->count())->toBe(1);
    });

    it('danh sách chỉ có AI và kênh của account đang mở', function () {
        $account = Account::factory()->create();
        $admin = aiAgentsAccountMember($account, AccountUser::ROLE_ADMINISTRATOR);
        $own = AiAgent::factory()->create(['account_id' => $account->id, 'name' => 'Linh']);
        AiAgent::factory()->create(['name' => 'Người ngoài']);
        $inbox = Inbox::factory()->create(['account_id' => $account->id]);
        Inbox::factory()->create();

        $response = $this->actingAs($admin)->getJson(aiAgentsUrl($account))->assertOk();

        expect(collect($response->json('payload'))->pluck('id')->all())->toBe([$own->id])
            ->and(collect($response->json('inboxes'))->pluck('id')->all())->toBe([$inbox->id]);
    });
});

describe('tạo, sửa, xoá nhân viên AI', function () {
    it('tạo đúng một dòng ai_agents, bật sẵn, gắn các kênh đã chọn', function () {
        $account = Account::factory()->create();
        $admin = aiAgentsAccountMember($account, AccountUser::ROLE_ADMINISTRATOR);
        [$first, $second, $third] = Inbox::factory()->count(3)->create(['account_id' => $account->id])->all();

        $response = $this->actingAs($admin)->postJson(aiAgentsUrl($account), [
            'name' => '  Linh ',
            'persona' => 'Xưng em, gọi khách anh/chị.',
            'instructions' => null,
            'inbox_ids' => [$first->id, $second->id],
        ])->assertOk();

        $aiAgent = AiAgent::query()->where('account_id', $account->id)->sole();

        expect($response->json())->toMatchArray([
            'id' => $aiAgent->id,
            'name' => 'Linh',
            'persona' => 'Xưng em, gọi khách anh/chị.',
            'instructions' => null,
            'enabled' => true,
            'inbox_ids' => [$first->id, $second->id],
            'auto_reply_conversations_count' => 0,
        ])
            ->and($response->json())->not->toHaveKeys(['cost_micro_usd', 'cost'])
            ->and($third->fresh()->ai_agent_id)->toBeNull();
    });

    it('mỗi kênh một AI: gắn kênh đang có AI khác thì AI cũ bị thay', function () {
        $account = Account::factory()->create();
        $admin = aiAgentsAccountMember($account, AccountUser::ROLE_ADMINISTRATOR);
        $inbox = Inbox::factory()->create(['account_id' => $account->id]);
        $minh = app(AiAgentService::class)->create($account, 'Minh');
        app(AiAgentService::class)->assignInbox($inbox, $minh);

        $linhId = $this->actingAs($admin)->postJson(aiAgentsUrl($account), ['name' => 'Linh', 'inbox_ids' => [$inbox->id]])
            ->assertOk()
            ->json('id');

        expect($inbox->fresh()->ai_agent_id)->toBe($linhId)
            ->and($minh->inboxes()->count())->toBe(0);

        $this->actingAs($admin)->putJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}/ai_agent", ['ai_agent_id' => $minh->id])
            ->assertOk()
            ->assertJson(['id' => $inbox->id, 'ai_agent_id' => $minh->id]);

        $this->actingAs($admin)->putJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}/ai_agent", ['ai_agent_id' => null])
            ->assertOk();

        expect($inbox->fresh()->ai_agent_id)->toBeNull();
    });

    it('sửa đổi tên, persona, bật/tắt và đặt lại đúng tập kênh', function () {
        $account = Account::factory()->create();
        $admin = aiAgentsAccountMember($account, AccountUser::ROLE_ADMINISTRATOR);
        [$kept, $dropped, $added] = Inbox::factory()->count(3)->create(['account_id' => $account->id])->all();
        $aiAgent = app(AiAgentService::class)->create($account, 'Linh');
        app(AiAgentService::class)->syncInboxes($aiAgent, [$kept->id, $dropped->id]);

        $this->actingAs($admin)->patchJson(aiAgentsUrl($account, "/{$aiAgent->id}"), [
            'name' => 'Linh Chi',
            'persona' => 'Lịch sự',
            'enabled' => false,
            'inbox_ids' => [$kept->id, $added->id],
        ])->assertOk()
            ->assertJson(['name' => 'Linh Chi', 'persona' => 'Lịch sự', 'enabled' => false, 'inbox_ids' => [$kept->id, $added->id]]);

        expect($dropped->fresh()->ai_agent_id)->toBeNull();

        $this->actingAs($admin)->patchJson(aiAgentsUrl($account, "/{$aiAgent->id}"), ['enabled' => true])
            ->assertOk()
            ->assertJson(['enabled' => true, 'inbox_ids' => [$kept->id, $added->id]]);
    });

    it('xoá AI gỡ AI khỏi kênh, hội thoại giữ công tắc nhưng không còn AI trả lời', function () {
        $account = Account::factory()->create();
        $admin = aiAgentsAccountMember($account, AccountUser::ROLE_ADMINISTRATOR);
        $inbox = Inbox::factory()->create(['account_id' => $account->id]);
        $aiAgent = app(AiAgentService::class)->create($account, 'Linh');
        app(AiAgentService::class)->assignInbox($inbox, $aiAgent);
        $conversation = aiAgentsConversation($inbox);
        app(ConversationAutoResponder::class)->enable($conversation);

        expect($this->actingAs($admin)->getJson(aiAgentsUrl($account))->json('payload.0.auto_reply_conversations_count'))->toBe(1);

        $this->actingAs($admin)->deleteJson(aiAgentsUrl($account, "/{$aiAgent->id}"))->assertOk();

        expect(AiAgent::query()->find($aiAgent->id))->toBeNull()
            ->and($inbox->fresh()->ai_agent_id)->toBeNull()
            ->and($conversation->fresh()->ai_auto_reply)->toBeTrue()
            ->and($inbox->fresh()->replyingAiAgent()->first())->toBeNull();
    });

    it('tải và gỡ ảnh đại diện', function () {
        Storage::fake('public');
        $account = Account::factory()->create();
        $admin = aiAgentsAccountMember($account, AccountUser::ROLE_ADMINISTRATOR);
        $aiAgent = app(AiAgentService::class)->create($account, 'Linh');

        $avatarUrl = $this->actingAs($admin)
            ->post(aiAgentsUrl($account, "/{$aiAgent->id}/avatar"), ['avatar' => UploadedFile::fake()->image('linh.png')], ['Accept' => 'application/json'])
            ->assertOk()
            ->json('avatar_url');

        expect($avatarUrl)->not->toBe('');

        $this->actingAs($admin)->deleteJson(aiAgentsUrl($account, "/{$aiAgent->id}/avatar"))
            ->assertOk()
            ->assertJson(['avatar_url' => '']);
    });

    it('từ chối tên trống', function () {
        $account = Account::factory()->create();
        $admin = aiAgentsAccountMember($account, AccountUser::ROLE_ADMINISTRATOR);

        $this->actingAs($admin)->postJson(aiAgentsUrl($account), ['name' => '   '])->assertUnprocessable();

        expect(AiAgent::query()->where('account_id', $account->id)->count())->toBe(0);
    });
});

it('prop inboxes dùng chung mang AI của kênh kể cả khi AI đang tắt', function () {
    $account = Account::factory()->create();
    $admin = aiAgentsAccountMember($account, AccountUser::ROLE_ADMINISTRATOR);
    $withAi = Inbox::factory()->create(['account_id' => $account->id, 'name' => 'A kênh có AI']);
    $withoutAi = Inbox::factory()->create(['account_id' => $account->id, 'name' => 'B kênh trống']);
    $aiAgent = app(AiAgentService::class)->create($account, 'Linh');
    app(AiAgentService::class)->assignInbox($withAi, $aiAgent);
    app(AiAgentService::class)->update($aiAgent, ['enabled' => false]);

    $this->actingAs($admin)->get("/app/accounts/{$account->id}/settings/ai-agents")
        ->assertInertia(fn ($page) => $page
            ->where('inboxes.0.id', $withAi->id)
            ->where('inboxes.0.ai_agent', ['id' => $aiAgent->id, 'name' => 'Linh', 'enabled' => false])
            ->where('inboxes.1.id', $withoutAi->id)
            ->where('inboxes.1.ai_agent', null));
});
