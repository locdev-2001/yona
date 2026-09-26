<?php

use App\Builders\Messages\MessageBuilder;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\PaymentAccount;
use App\Models\User;

function markPaidFixtures(): array
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
    $paymentAccount = PaymentAccount::factory()->create(['account_id' => $account->id]);

    $message = (new MessageBuilder(User::factory()->create(), $conversation, [
        'content_type' => 'bank_transfer',
        'content_attributes' => ['payment_account_id' => $paymentAccount->id],
    ]))->perform();

    return [$account, $inbox, $conversation, $message];
}

function markPaidAgentOf(Account $account, Inbox $inbox): User
{
    $agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $agent->id, 'role' => AccountUser::ROLE_AGENT]);
    $inbox->addMembers([$agent->id]);

    return $agent;
}

it('nhân viên có quyền trên hội thoại đánh dấu đã nhận tiền', function () {
    [$account, $inbox, $conversation, $message] = markPaidFixtures();
    $agent = markPaidAgentOf($account, $inbox);

    $response = $this->actingAs($agent)->postJson(
        "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages/{$message->id}/mark_bank_transfer_paid",
    )->assertOk();

    expect($response->json('content_attributes.paid_at'))->not->toBeNull()
        ->and($response->json('content_attributes.paid_by'))->toBe($agent->id);
});

it('bấm lại không đổi ai/lúc nào (idempotent)', function () {
    [$account, $inbox, $conversation, $message] = markPaidFixtures();
    $agent = markPaidAgentOf($account, $inbox);
    $otherAgent = markPaidAgentOf($account, $inbox);

    $first = $this->actingAs($agent)->postJson(
        "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages/{$message->id}/mark_bank_transfer_paid",
    )->assertOk();

    $second = $this->actingAs($otherAgent)->postJson(
        "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages/{$message->id}/mark_bank_transfer_paid",
    )->assertOk();

    expect($second->json('content_attributes.paid_at'))->toBe($first->json('content_attributes.paid_at'))
        ->and($second->json('content_attributes.paid_by'))->toBe($agent->id);
});

it('nhân viên không có quyền trên hội thoại (không phải thành viên hộp thư) bị từ chối', function () {
    [$account, , $conversation, $message] = markPaidFixtures();
    $outsider = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $outsider->id, 'role' => AccountUser::ROLE_AGENT]);

    $this->actingAs($outsider)->postJson(
        "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages/{$message->id}/mark_bank_transfer_paid",
    )->assertUnauthorized();
});

it('không cho đánh dấu tin không phải thẻ chuyển khoản', function () {
    [$account, $inbox, $conversation] = markPaidFixtures();
    $agent = markPaidAgentOf($account, $inbox);
    $textMessage = (new MessageBuilder($agent, $conversation, ['content' => 'Xin chào']))->perform();

    $this->actingAs($agent)->postJson(
        "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages/{$textMessage->id}/mark_bank_transfer_paid",
    )->assertStatus(422);
});
