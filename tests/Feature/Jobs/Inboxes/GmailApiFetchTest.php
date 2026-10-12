<?php

use App\Jobs\Inboxes\FetchImapEmailsJob;
use App\Models\Account;
use App\Models\Channel\Email;
use App\Models\Inbox;
use App\Services\Email\Fetch\GmailApiFetcher;
use App\Services\Email\Fetch\MailboxFetchers;
use App\Services\Imap\FetchEmailService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('public');
    $this->account = Account::factory()->create();
    $this->channel = Email::factory()->create([
        'account_id' => $this->account->id,
        'email' => 'shop@gmail.com',
        'provider' => 'google',
        'imap_enabled' => true,
        'imap_address' => 'imap.gmail.com',
        'provider_config' => ['access_token' => 'test-token', 'refresh_token' => 'test-refresh', 'expires_at' => now()->addHour()->toIso8601String()],
    ]);
    Inbox::factory()->create(['account_id' => $this->account->id, 'channel_id' => $this->channel->id, 'channel_type' => 'Channel::Email']);
    $this->gmail = ['history' => [], 'messages' => [], 'historyStatus' => 200, 'failWith' => null];
});

function gmailRawMail(string $id): string
{
    $raw = "From: Khach <khach-{$id}@example.com>\r\nTo: shop@gmail.com\r\nSubject: Hoi gia {$id}\r\n"
        ."Message-ID: <{$id}@example.com>\r\nDate: ".now()->toRfc2822String()."\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\nCho minh hoi gia {$id}\r\n";

    return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
}

function fakeGmailApi(object $test): void
{
    Http::fake(function (Request $request) use ($test) {
        $path = parse_url($request->url(), PHP_URL_PATH);
        parse_str((string) parse_url($request->url(), PHP_URL_QUERY), $query);

        if ($test->gmail['failWith'] !== null) {
            return Http::response(['error' => 'test'], $test->gmail['failWith']);
        }

        return match (true) {
            str_ends_with($path, '/profile') => Http::response(['historyId' => '100']),
            str_ends_with($path, '/history') => $test->gmail['historyStatus'] === 404
                ? Http::response(['error' => 'not found'], 404)
                : Http::response(['historyId' => '200', 'history' => [['messagesAdded' => array_map(
                    fn (string $id) => ['message' => ['id' => $id, 'labelIds' => ['INBOX', 'UNREAD']]],
                    $test->gmail['history'],
                )]]]),
            str_ends_with($path, '/messages') => Http::response(['messages' => array_map(fn (string $id) => ['id' => $id], $test->gmail['messages'])]),
            default => Http::response(['id' => basename($path), 'raw' => gmailRawMail(basename($path))]),
        };
    });
}

it('hộp Gmail kéo thư bằng Gmail API, hộp thư khác vẫn qua IMAP', function () {
    $imapChannel = Email::factory()->create(['account_id' => $this->account->id, 'email' => 'care@example.com']);

    expect(app(MailboxFetchers::class)->for($this->channel))->toBeInstanceOf(GmailApiFetcher::class)
        ->and(app(MailboxFetchers::class)->for($imapChannel))->toBeInstanceOf(FetchEmailService::class);
});

it('lần đầu nhập thư INBOX trong cửa sổ gần đây rồi lưu mốc lịch sử lấy trước khi liệt kê', function () {
    $this->gmail['messages'] = ['m2', 'm1'];
    fakeGmailApi($this);

    (new FetchImapEmailsJob($this->channel))->handle();

    expect($this->channel->inbox->messages()->pluck('source_id')->all())->toEqualCanonicalizing(['m1@example.com', 'm2@example.com'])
        ->and($this->channel->fresh()->imap_sync_state)->toBe(['driver' => 'gmail_api', 'history_id' => '100', 'pending_ids' => []]);
});

it('lượt sau chỉ hỏi lịch sử từ mốc đã lưu và không nhập lại thư đã có', function () {
    $this->gmail['messages'] = ['m1'];
    fakeGmailApi($this);
    (new FetchImapEmailsJob($this->channel))->handle();

    $this->gmail['history'] = ['m1', 'm3'];
    (new FetchImapEmailsJob($this->channel->fresh()))->handle();

    expect($this->channel->inbox->messages()->pluck('source_id')->all())->toEqualCanonicalizing(['m1@example.com', 'm3@example.com'])
        ->and($this->channel->fresh()->imap_sync_state['history_id'])->toBe('200');
    Http::assertSent(fn (Request $request) => str_contains($request->url(), '/history?') && str_contains($request->url(), 'startHistoryId=100'));
});

it('Gmail không còn giữ lịch sử từ mốc cũ thì đồng bộ lại cửa sổ gần đây', function () {
    $this->channel->forceFill(['imap_sync_state' => ['driver' => 'gmail_api', 'history_id' => '5', 'pending_ids' => []]])->save();
    $this->gmail['historyStatus'] = 404;
    $this->gmail['messages'] = ['m9'];
    fakeGmailApi($this);

    (new FetchImapEmailsJob($this->channel))->handle();

    expect($this->channel->inbox->messages()->pluck('source_id')->all())->toBe(['m9@example.com'])
        ->and($this->channel->fresh()->imap_sync_state['history_id'])->toBe('100');
});

it('Gmail API từ chối quyền thì đòi kết nối lại, trục trặc tạm thời thì không', function (int $status, bool $reauthorize) {
    $this->gmail['failWith'] = $status;
    fakeGmailApi($this);

    (new FetchImapEmailsJob($this->channel))->handle();

    expect($this->channel->fresh()->reauthorizationRequired())->toBe($reauthorize)
        ->and($this->channel->fresh()->imap_sync_state)->toBeNull();
})->with([
    'thu hồi quyền' => [401, true],
    'quá hạn mức' => [429, false],
    'Google lỗi' => [503, false],
]);
