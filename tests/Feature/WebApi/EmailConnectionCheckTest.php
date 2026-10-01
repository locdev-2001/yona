<?php

use App\Jobs\Inboxes\FetchImapEmailsJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Channel\Email;
use App\Models\Inbox;
use App\Models\User;
use App\Services\Email\MailServerException;
use App\Services\Imap\FetchEmailService;

// Việc #159: lỗi IMAP/SMTP phải tới tay người dùng — báo tại chỗ khi lưu cấu hình,
// và job quét thư gặp lỗi thì đánh dấu kênh để giao diện hiện cảnh báo.

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->admin = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $this->account->id, 'user_id' => $this->admin->id]);
    $this->inbox = Inbox::factory()->email()->create(['account_id' => $this->account->id]);
});

afterEach(function () {
    $this->inbox->channel->reauthorized();
});

function imapSettings(array $overrides = []): array
{
    return [
        'imap_enabled' => true,
        'imap_address' => 'imap.gmail.com',
        'imap_port' => 993,
        'imap_login' => 'shop@gmail.com',
        'imap_password' => 'mat-khau-google',
        'imap_enable_ssl' => true,
        ...$overrides,
    ];
}

it('lưu cấu hình IMAP sai mật khẩu Gmail thì báo lỗi tại ô mật khẩu kèm hướng dẫn App Password', function () {
    $this->mailServerProbe->rejectImap();

    $response = $this->actingAs($this->admin)
        ->patchJson("/api/v1/accounts/{$this->account->id}/inboxes/{$this->inbox->id}", ['channel' => imapSettings()])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['channel.imap_password']);

    expect($response->json('errors')['channel.imap_password'][0])->toContain('https://myaccount.google.com/apppasswords');

    expect($this->inbox->channel->refresh()->imap_enabled)->toBeFalse();
});

it('không tới được máy chủ thì báo lỗi kết nối, không nhắc App Password', function () {
    $this->mailServerProbe->rejectImap(MailServerException::CONNECTION);

    $response = $this->actingAs($this->admin)
        ->patchJson("/api/v1/accounts/{$this->account->id}/inboxes/{$this->inbox->id}", [
            'channel' => imapSettings(['imap_address' => 'imap.acme.test']),
        ])
        ->assertStatus(422);

    expect($response->json('errors')['channel.imap_password'][0])->toContain('imap.acme.test:993')
        ->not->toContain('apppasswords');
});

it('SMTP bị từ chối thì báo ở ô mật khẩu SMTP', function () {
    $this->mailServerProbe->rejectSmtp();

    $this->actingAs($this->admin)
        ->patchJson("/api/v1/accounts/{$this->account->id}/inboxes/{$this->inbox->id}", [
            'channel' => [
                'smtp_enabled' => true,
                'smtp_address' => 'smtp.gmail.com',
                'smtp_port' => 587,
                'smtp_login' => 'shop@gmail.com',
                'smtp_password' => 'sai',
            ],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['channel.smtp_password']);
});

it('cấu hình đúng thì lưu, đã thử đăng nhập đúng máy chủ và gỡ cờ lỗi cũ', function () {
    $this->inbox->channel->promptReauthorization();

    $this->actingAs($this->admin)
        ->patchJson("/api/v1/accounts/{$this->account->id}/inboxes/{$this->inbox->id}", ['channel' => imapSettings()])
        ->assertOk()
        ->assertJsonPath('reauthorization_required', false);

    expect($this->mailServerProbe->attempts)->toHaveCount(1)
        ->and($this->mailServerProbe->attempts[0])->toMatchArray(['protocol' => 'imap', 'host' => 'imap.gmail.com', 'port' => 993])
        ->and($this->inbox->channel->refresh()->reauthorizationRequired())->toBeFalse();
});

it('không thử kết nối khi chỉ đổi phần không liên quan tới máy chủ thư', function () {
    $this->actingAs($this->admin)
        ->patchJson("/api/v1/accounts/{$this->account->id}/inboxes/{$this->inbox->id}", ['name' => 'Hộp thư mới'])
        ->assertOk();

    expect($this->mailServerProbe->attempts)->toBe([]);
});

it('tạo hộp thư email kèm IMAP sai mật khẩu thì không tạo gì', function () {
    $this->mailServerProbe->rejectImap();

    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/inboxes", [
            'name' => 'Gmail cửa hàng',
            'channel' => ['type' => 'email', 'email' => 'shop@gmail.com', ...imapSettings()],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['channel.imap_password']);

    expect(Email::query()->where('email', 'shop@gmail.com')->exists())->toBeFalse();
});

function failingFetchService(MailServerException $exception): void
{
    app()->bind(FetchEmailService::class, fn () => new class($exception)
    {
        public function __construct(private MailServerException $exception) {}

        public function perform(): array
        {
            throw $this->exception;
        }
    });
}

it('job gặp lỗi xác thực thì đánh dấu kênh cần kết nối lại và API trả cờ cùng lời nhắn', function () {
    $channel = $this->inbox->channel;
    $channel->update(imapSettings());
    failingFetchService(new MailServerException(MailServerException::AUTHENTICATION, 'imap', 'imap.gmail.com', 993));

    (new FetchImapEmailsJob($channel))->handle();

    expect($channel->reauthorizationRequired())->toBeTrue();

    $response = $this->actingAs($this->admin)
        ->getJson("/api/v1/accounts/{$this->account->id}/inboxes/{$this->inbox->id}")
        ->assertOk()
        ->assertJsonPath('reauthorization_required', true);

    expect($response->json('connection_error'))->toContain('imap.gmail.com')
        ->toContain('https://myaccount.google.com/apppasswords');

    // Sidebar (prop Inertia `inboxes`) đọc cùng cờ.
    $this->actingAs($this->admin)->get("/app/accounts/{$this->account->id}/dashboard")
        ->assertInertia(fn ($page) => $page->where('inboxes.0.reauthorization_required', true));
});

it('job lỗi kết nối thì chỉ đếm, quá ngưỡng mới đánh dấu', function () {
    $channel = $this->inbox->channel;
    $channel->update(imapSettings());
    failingFetchService(new MailServerException(MailServerException::CONNECTION, 'imap', 'imap.gmail.com', 993));

    (new FetchImapEmailsJob($channel))->handle();

    expect($channel->reauthorizationRequired())->toBeFalse()
        ->and($channel->authorizationErrorCount())->toBe(1);

    foreach (range(2, Email::AUTHORIZATION_ERROR_THRESHOLD) as $_) {
        (new FetchImapEmailsJob($channel))->handle();
    }

    expect($channel->reauthorizationRequired())->toBeTrue();
});

it('lần quét thành công sau lỗi kết nối thì xoá bộ đếm', function () {
    $channel = $this->inbox->channel;
    $channel->update(imapSettings());
    $channel->authorizationError();
    app()->bind(FetchEmailService::class, fn () => new class
    {
        public function perform(): array
        {
            return [];
        }
    });

    (new FetchImapEmailsJob($channel))->handle();

    expect($channel->authorizationErrorCount())->toBe(0);
});
