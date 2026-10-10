<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Channel\Email;
use App\Models\Inbox;
use App\Models\User;

// Port phần kênh Email của spec/controllers/api/v1/accounts/inboxes_controller_spec.rb.

function emailChannelMemberOf(Account $account, int $role = AccountUser::ROLE_AGENT): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id, 'role' => $role]);

    return $user;
}

it('không tạo hộp Email bằng form khi mọi lựa chọn form đang sắp ra mắt hoặc đã bỏ', function () {
    $account = Account::factory()->create();
    $admin = emailChannelMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);

    $this->actingAs($admin)
        ->postJson("/api/v1/accounts/{$account->id}/inboxes", [
            'name' => 'Support Email',
            'channel' => ['type' => 'email', 'email' => 'care@acme.test', 'imap_password' => 'mat-khau-ung-dung'],
        ])
        ->assertUnprocessable()
        ->assertJson(['error' => __('errors.inboxes.connection_not_open')]);

    expect(Email::query()->where('email', 'care@acme.test')->exists())->toBeFalse()
        ->and($this->mailServerProbe->attempts)->toBe([]);
});

it('rejects an email inbox without an email address', function () {
    $account = Account::factory()->create();
    $admin = emailChannelMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);

    $this->actingAs($admin)
        ->postJson("/api/v1/accounts/{$account->id}/inboxes", [
            'name' => 'Support Email',
            'channel' => ['type' => 'email'],
        ])
        ->assertStatus(422);
});

it('updates the imap and smtp settings of an email inbox', function () {
    $account = Account::factory()->create();
    $admin = emailChannelMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
    $inbox = Inbox::factory()->email()->create(['account_id' => $account->id]);

    $response = $this->actingAs($admin)
        ->patchJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}", [
            'channel' => [
                'imap_enabled' => true,
                'imap_address' => 'imap.acme.test',
                'imap_port' => 993,
                'imap_login' => 'care@acme.test',
                'imap_password' => 'secret',
                'smtp_enabled' => true,
                'smtp_address' => 'smtp.acme.test',
                'smtp_port' => 587,
            ],
        ])
        ->assertOk();

    expect($response->json('imap_enabled'))->toBeTrue()
        ->and($response->json('imap_address'))->toBe('imap.acme.test')
        ->and($response->json('imap_port'))->toBe(993)
        ->and($response->json('imap_password'))->toBe('secret')
        ->and($response->json('smtp_enabled'))->toBeTrue()
        ->and($inbox->fresh()->channel->imap_password)->toBe('secret');
});

it('hides imap and smtp credentials from agents', function () {
    $account = Account::factory()->create();
    $agent = emailChannelMemberOf($account);
    $inbox = Inbox::factory()->email()->create(['account_id' => $account->id]);
    $inbox->inboxMembers()->create(['user_id' => $agent->id]);

    $response = $this->actingAs($agent)
        ->getJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}")
        ->assertOk();

    expect($response->json('email'))->toBe($inbox->channel->email)
        ->and($response->json())->not->toHaveKey('imap_password')
        ->and($response->json())->not->toHaveKey('smtp_password');
});

it('hides the forward to email when no inbound domain is configured', function () {
    config(['mail.inbound_email_domain' => null]);
    $account = Account::factory()->create();
    $admin = emailChannelMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
    $inbox = Inbox::factory()->email()->create(['account_id' => $account->id]);

    $response = $this->actingAs($admin)
        ->getJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}")
        ->assertOk();

    expect($response->json('forwarding_enabled'))->toBeFalse()
        ->and($response->json())->not->toHaveKey('forward_to_email');
});

// Nút "Update IMAP settings" gửi các ô còn trống dưới dạng chuỗi rỗng; middleware
// ConvertEmptyStringsToNull đổi thành null, cột NOT NULL phải nhận lại ''.
it('accepts blank strings for the imap and smtp settings', function () {
    $account = Account::factory()->create();
    $admin = emailChannelMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
    $inbox = Inbox::factory()->email()->create(['account_id' => $account->id]);

    $response = $this->actingAs($admin)
        ->patchJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}", [
            'channel' => [
                'imap_enabled' => true,
                'imap_address' => '',
                'imap_login' => '',
                'imap_authentication' => '',
                'smtp_address' => '',
                'smtp_login' => '',
                'smtp_domain' => '',
            ],
        ])
        ->assertOk();

    expect($response->json('imap_address'))->toBe('')
        ->and($response->json('imap_login'))->toBe('')
        ->and($response->json('imap_authentication'))->toBe('')
        ->and($response->json('smtp_domain'))->toBe('')
        ->and($inbox->fresh()->channel->smtp_address)->toBe('');
});

it('turns imap off with an empty address', function () {
    $account = Account::factory()->create();
    $admin = emailChannelMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
    $inbox = Inbox::factory()->email()->create([
        'account_id' => $account->id,
    ]);
    $inbox->channel->update(['imap_enabled' => true, 'imap_address' => 'imap.acme.test', 'smtp_enabled' => true]);

    $response = $this->actingAs($admin)
        ->patchJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}", [
            'channel' => ['imap_enabled' => false, 'imap_address' => '', 'imap_login' => '', 'smtp_enabled' => false],
        ])
        ->assertOk();

    expect($response->json('imap_enabled'))->toBeFalse()
        ->and($response->json('smtp_enabled'))->toBeFalse()
        ->and($response->json('imap_address'))->toBe('');
});

it('deletes the email channel with the inbox so the address can be reused', function () {
    $account = Account::factory()->create();
    $admin = emailChannelMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
    $inbox = Inbox::factory()->email()->create(['account_id' => $account->id]);
    $inbox->channel->update(['email' => 'care@acme.test']);

    $this->actingAs($admin)
        ->deleteJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}")
        ->assertOk();

    expect(Email::where('email', 'care@acme.test')->exists())->toBeFalse();

    Email::factory()->create(['account_id' => $account->id, 'email' => 'care@acme.test']);

    expect(Email::where('email', 'care@acme.test')->count())->toBe(1);
});
