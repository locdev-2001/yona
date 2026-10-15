<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\User;
use App\Services\AiAgents\AiAgentService;
use App\Services\Conversations\AutoResponderStopReason;
use App\Services\Conversations\ConversationAutoResponder;

/** @return array{0: Account, 1: Inbox, 2: User} */
function aiFilterAccount(): array
{
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $aiAgent = app(AiAgentService::class)->create($account, 'Linh');
    app(AiAgentService::class)->assignInbox($inbox, $aiAgent);
    $admin = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $account->id, 'user_id' => $admin->id]);

    return [$account, $inbox, $admin];
}

function aiFilterConversation(Inbox $inbox): Conversation
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

/** @return list<int> display_id của hội thoại trong bộ lọc */
function aiFilterList(Account $account, User $user, string $type): array
{
    return collect(test()->actingAs($user)
        ->getJson("/api/v1/accounts/{$account->id}/conversations?conversation_type={$type}&assignee_type=all&status=all")
        ->assertOk()
        ->json('data.payload'))->pluck('id')->all();
}

it('bộ lọc "AI tự động" chỉ gồm hội thoại đang bật công tắc, có số đếm', function () {
    [$account, $inbox, $admin] = aiFilterAccount();
    $auto = aiFilterConversation($inbox);
    aiFilterConversation($inbox);
    app(ConversationAutoResponder::class)->enable($auto);

    $response = $this->actingAs($admin)
        ->getJson("/api/v1/accounts/{$account->id}/conversations/meta?conversation_type=ai_auto_reply&assignee_type=all&status=all")
        ->assertOk();

    expect(aiFilterList($account, $admin, 'ai_auto_reply'))->toBe([$auto->display_id])
        ->and($response->json('meta.all_count'))->toBe(1);
});

it('AI chuyển cho người hoặc lượt lỗi thì hội thoại vào bộ lọc "AI chuyển cho người"', function (AutoResponderStopReason $reason, bool $listed) {
    [$account, $inbox, $admin] = aiFilterAccount();
    $conversation = aiFilterConversation($inbox);
    app(ConversationAutoResponder::class)->enable($conversation);

    app(ConversationAutoResponder::class)->disable($conversation, $reason);

    expect(aiFilterList($account, $admin, 'ai_handed_off'))->toBe($listed ? [$conversation->display_id] : [])
        ->and($conversation->fresh()->ai_handed_off_at !== null)->toBe($listed);
})->with([
    'AI chuyển cho người' => [AutoResponderStopReason::HandedOff, true],
    'lượt AI lỗi' => [AutoResponderStopReason::AiTurnFailed, true],
    'nhân viên tự tắt' => [AutoResponderStopReason::Manual, false],
    'người tham gia trả lời' => [AutoResponderStopReason::HumanJoined, false],
]);

it('nhân viên tiếp nhận (gán cho mình) thì hội thoại ra khỏi bộ lọc', function () {
    [$account, $inbox, $admin] = aiFilterAccount();
    $conversation = aiFilterConversation($inbox);
    app(ConversationAutoResponder::class)->enable($conversation);
    app(ConversationAutoResponder::class)->disable($conversation, AutoResponderStopReason::HandedOff);

    $this->actingAs($admin)
        ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/assignments", ['assignee_id' => $admin->id])
        ->assertOk();

    expect(aiFilterList($account, $admin, 'ai_handed_off'))->toBe([])
        ->and($conversation->fresh()->ai_handed_off_at)->toBeNull()
        ->and($conversation->fresh()->assignee_id)->toBe($admin->id)
        ->and($conversation->messages()->where('content', 'like', '%'.$admin->name.'%')->exists())->toBeTrue();
});

it('bật lại AI thì hội thoại ra khỏi bộ lọc', function () {
    [$account, $inbox, $admin] = aiFilterAccount();
    $conversation = aiFilterConversation($inbox);
    $autoResponder = app(ConversationAutoResponder::class);
    $autoResponder->enable($conversation);
    $autoResponder->disable($conversation, AutoResponderStopReason::AiTurnFailed);

    $this->actingAs($admin)
        ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/auto_responder")
        ->assertOk()
        ->assertJsonPath('ai_handed_off_at', null);

    expect(aiFilterList($account, $admin, 'ai_handed_off'))->toBe([]);
});

it('account X không thấy hội thoại AI của account Y trong cả hai bộ lọc', function () {
    [$account, , $admin] = aiFilterAccount();
    [, $otherInbox] = aiFilterAccount();
    $foreignAuto = aiFilterConversation($otherInbox);
    $foreignHandedOff = aiFilterConversation($otherInbox);
    $autoResponder = app(ConversationAutoResponder::class);
    $autoResponder->enable($foreignAuto);
    $autoResponder->enable($foreignHandedOff);
    $autoResponder->disable($foreignHandedOff, AutoResponderStopReason::HandedOff);

    expect(aiFilterList($account, $admin, 'ai_auto_reply'))->toBe([])
        ->and(aiFilterList($account, $admin, 'ai_handed_off'))->toBe([]);
});
