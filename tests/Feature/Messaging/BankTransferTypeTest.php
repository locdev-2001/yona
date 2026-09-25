<?php

use App\Messaging\Structured\StructuredTypeRegistry;
use App\Messaging\Structured\Types\BankTransferType;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\PaymentAccount;
use App\Models\User;

// Thẻ chuyển khoản: agent chỉ chọn một `PaymentAccount` có sẵn, server luôn tự
// tra ngân hàng/số tài khoản thật — KHÔNG bao giờ tin dữ liệu do phía gửi khai.

function bankTransferFixtures(): array
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

    return [$account, $inbox, $conversation];
}

function bankTransferUserOf(Account $account, Inbox $inbox, int $role): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id, 'role' => $role]);
    $inbox->addMembers([$user->id]);

    return $user;
}

it('admin gửi thẻ chuyển khoản: server tự tra ngân hàng thật, không tin dữ liệu client khai', function () {
    [$account, $inbox, $conversation] = bankTransferFixtures();
    $admin = bankTransferUserOf($account, $inbox, AccountUser::ROLE_ADMINISTRATOR);
    $paymentAccount = PaymentAccount::factory()->create([
        'account_id' => $account->id,
        'bank_bin' => '970436',
        'account_number' => '1023456789',
        'account_name' => 'HKD GOM MOC',
    ]);

    $response = $this->actingAs($admin)->postJson(
        "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages",
        [
            'content_type' => 'bank_transfer',
            'content_attributes' => [
                'payment_account_id' => $paymentAccount->id,
                'amount' => 480000,
                // client tự khai số tài khoản giả — phải bị bỏ qua hoàn toàn.
                'account_number' => 'FAKE999999',
                'account_name' => 'KE GIAN',
            ],
        ],
    )->assertOk();

    expect($response->json('content_attributes.account_number'))->toBe('1023456789')
        ->and($response->json('content_attributes.account_name'))->toBe('HKD GOM MOC')
        ->and($response->json('content_attributes.bank_name'))->toBe('Vietcombank')
        ->and($response->json('content_attributes.amount.amount'))->toBe(480000)
        ->and($response->json('content_attributes.qr_payload'))->toContain('1023456789');
});

it('agent gửi payment_account_id của tenant khác thì bị từ chối 422', function () {
    [$account, $inbox, $conversation] = bankTransferFixtures();
    $admin = bankTransferUserOf($account, $inbox, AccountUser::ROLE_ADMINISTRATOR);
    $otherAccount = Account::factory()->create();
    $foreignPaymentAccount = PaymentAccount::factory()->create(['account_id' => $otherAccount->id]);

    $this->actingAs($admin)->postJson(
        "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages",
        ['content_type' => 'bank_transfer', 'content_attributes' => ['payment_account_id' => $foreignPaymentAccount->id]],
    )->assertStatus(422);
});

it('agent không được gửi khi allow_all_agents tắt, quản trị viên vẫn gửi được', function () {
    [$account, $inbox, $conversation] = bankTransferFixtures();
    $agent = bankTransferUserOf($account, $inbox, AccountUser::ROLE_AGENT);
    $admin = bankTransferUserOf($account, $inbox, AccountUser::ROLE_ADMINISTRATOR);
    $paymentAccount = PaymentAccount::factory()->create(['account_id' => $account->id, 'allow_all_agents' => false]);

    $this->actingAs($agent)->postJson(
        "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages",
        ['content_type' => 'bank_transfer', 'content_attributes' => ['payment_account_id' => $paymentAccount->id]],
    )->assertStatus(422);

    $this->actingAs($admin)->postJson(
        "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages",
        ['content_type' => 'bank_transfer', 'content_attributes' => ['payment_account_id' => $paymentAccount->id]],
    )->assertOk();
});

it('agent gửi được khi allow_all_agents bật', function () {
    [$account, $inbox, $conversation] = bankTransferFixtures();
    $agent = bankTransferUserOf($account, $inbox, AccountUser::ROLE_AGENT);
    $paymentAccount = PaymentAccount::factory()->create(['account_id' => $account->id, 'allow_all_agents' => true]);

    $this->actingAs($agent)->postJson(
        "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages",
        ['content_type' => 'bank_transfer', 'content_attributes' => ['payment_account_id' => $paymentAccount->id]],
    )->assertOk();
});

it('không tìm thấy tài khoản nhận tiền thì 422', function () {
    [$account, $inbox, $conversation] = bankTransferFixtures();
    $admin = bankTransferUserOf($account, $inbox, AccountUser::ROLE_ADMINISTRATOR);

    $this->actingAs($admin)->postJson(
        "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages",
        ['content_type' => 'bank_transfer', 'content_attributes' => ['payment_account_id' => 999999]],
    )->assertStatus(422);
});

it('plainText mang đủ thông tin để khách chuyển khoản bằng tay trên kênh không vẽ được thẻ', function () {
    $type = app(BankTransferType::class);

    $text = $type->plainText(null, [
        'bank_name' => 'Vietcombank',
        'account_number' => '1023456789',
        'account_name' => 'HKD GOM MOC',
        'amount' => ['amount' => 480000, 'currency' => 'VND'],
        'memo' => 'GM1024',
    ]);

    expect($text)->toContain('Vietcombank')
        ->toContain('1023456789')
        ->toContain('HKD GOM MOC')
        ->toContain('480.000đ')
        ->toContain('GM1024');
});

it('cần một trang công khai cho kênh không vẽ được thẻ', function () {
    expect(app(BankTransferType::class)->needsPublicPage([]))->toBeTrue();
});

it('thẻ đã gửi giữ nguyên số tài khoản đã gửi dù quản trị viên sửa hay xoá tài khoản sau đó; client không tự đặt được qr_payload', function () {
    [$account, $inbox, $conversation] = bankTransferFixtures();
    $admin = bankTransferUserOf($account, $inbox, AccountUser::ROLE_ADMINISTRATOR);
    $paymentAccount = PaymentAccount::factory()->create(['account_id' => $account->id, 'bank_bin' => '970436', 'account_number' => '1023456789']);

    $id = $this->actingAs($admin)->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages", [
        'content_type' => 'bank_transfer',
        'content_attributes' => ['payment_account_id' => $paymentAccount->id, 'amount' => 480000, 'qr_payload' => 'QR-GIA-MAO'],
    ])->assertOk()->json('id');

    $message = Message::find($id);
    $sentQr = $message->content_attributes['qr_payload'];
    expect($sentQr)->not->toBe('QR-GIA-MAO')->and($sentQr)->toContain('1023456789');

    $paymentAccount->update(['account_number' => '9999999999']);
    expect(app(StructuredTypeRegistry::class)->read($message->fresh()))
        ->toMatchArray(['account_number' => '1023456789', 'qr_payload' => $sentQr]);

    $paymentAccount->delete();
    expect(app(StructuredTypeRegistry::class)->read($message->fresh()))
        ->toMatchArray(['account_number' => '1023456789']);
});
