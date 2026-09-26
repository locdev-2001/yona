<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\CannedResponse;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\PaymentAccount;
use App\Models\User;

// Chọn một câu trả lời mẫu có thẻ trong hộp thư mở lại đúng thẻ đó rồi gửi:
// phía máy chủ, việc "gửi lại" chỉ là một tin nhắn bình thường mang đúng
// content_type/content_attributes đã lưu trong câu trả lời mẫu.

function cannedCardConversation(): array
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
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $agent->id, 'role' => AccountUser::ROLE_ADMINISTRATOR]);
    $inbox->addMembers([$agent->id]);

    return [$account, $inbox, $conversation, $agent];
}

it('gửi câu trả lời mẫu mang thẻ chuyển khoản: máy chủ tự tra lại số tài khoản thật', function () {
    [$account, , $conversation, $agent] = cannedCardConversation();
    $paymentAccount = PaymentAccount::factory()->create([
        'account_id' => $account->id,
        'bank_bin' => '970436',
        'account_number' => '1023456789',
        'account_name' => 'HKD GOM MOC',
    ]);
    $canned = CannedResponse::query()->create([
        'account_id' => $account->id,
        'short_code' => 'ck-tra-truoc',
        'content_type' => 'bank_transfer',
        'content_attributes' => ['payment_account_id' => $paymentAccount->id, 'amount' => 480000, 'memo' => 'GM1024'],
    ]);

    $response = $this->actingAs($agent)->postJson(
        "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages",
        ['content' => $canned->content, 'content_type' => $canned->content_type, 'content_attributes' => $canned->content_attributes],
    )->assertOk();

    expect($response->json('content_attributes.account_number'))->toBe('1023456789')
        ->and($response->json('content_attributes.account_name'))->toBe('HKD GOM MOC')
        ->and($response->json('content_attributes.qr_payload'))->toContain('1023456789')
        ->and($response->json('content_attributes.amount.amount'))->toBe(480000);
});

it('gửi câu trả lời mẫu mang thẻ trả lời nhanh: đúng danh sách lựa chọn đã lưu', function () {
    [$account, , $conversation, $agent] = cannedCardConversation();
    $canned = CannedResponse::query()->create([
        'account_id' => $account->id,
        'short_code' => 'hoi-gio-nhan',
        'content' => 'Bạn muốn nhận hàng khi nào ạ?',
        'content_type' => 'input_select',
        'content_attributes' => ['items' => [['title' => 'Sáng', 'value' => 'Sáng'], ['title' => 'Tối', 'value' => 'Tối']]],
    ]);

    $response = $this->actingAs($agent)->postJson(
        "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages",
        ['content' => $canned->content, 'content_type' => $canned->content_type, 'content_attributes' => $canned->content_attributes],
    )->assertOk();

    $message = Message::find($response->json('id'));
    expect($message->content)->toBe('Bạn muốn nhận hàng khi nào ạ?')
        ->and($message->content_attributes['items'])->toBe([
            ['title' => 'Sáng', 'value' => 'Sáng'],
            ['title' => 'Tối', 'value' => 'Tối'],
        ]);
});
