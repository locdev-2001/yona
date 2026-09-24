<?php

use App\Models\Account;
use App\Models\Conversation;
use App\Models\Integrations\Hook;
use App\Models\Message;
use App\Models\User;
use App\Services\Integrations\Dyte\ProcessorService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\Http;

// Không có spec riêng ở bản gốc (chỉ có spec cho lib/dyte.rb + controller). Test qua
// hai luồng chính: tạo cuộc gọi, cấp token tham gia.
beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->agent = User::factory()->create(['name' => 'Agent Smith']);
    $this->conversation = Conversation::factory()->create(['account_id' => $this->account->id]);
});

function dyteHookFor(Account $account, array $settings = []): Hook
{
    return Hook::factory()->create([
        'account_id' => $account->id,
        'app_id' => 'dyte',
        'settings' => array_merge(['account_id' => 'cf_account', 'app_id' => 'cf_app', 'api_token' => 'cf_token'], $settings),
    ]);
}

// find_by! của bản gốc (account.hooks.find_by!(app_id: 'dyte')) văng
// RecordNotFound khi account chưa có hook Dyte — DyteController không catch,
// Rails trả 404 mặc định. Port giữ đúng: Hook::firstOrFail() văng
// ModelNotFoundException, Laravel handler tự trả 404 (xem DyteControllerTest).
it('văng ModelNotFoundException khi account chưa có hook dyte', function () {
    expect(fn () => (new ProcessorService($this->account, $this->conversation))->createAMeeting($this->agent))
        ->toThrow(ModelNotFoundException::class);
});

it('trả lỗi khi thiếu một phần credentials', function () {
    dyteHookFor($this->account, ['api_token' => '']);

    $response = (new ProcessorService($this->account, $this->conversation))->createAMeeting($this->agent);

    expect($response['error'])->toContain('Cloudflare RealtimeKit credentials are required');
});

it('tạo cuộc gọi và ghi tin nhắn integrations', function () {
    dyteHookFor($this->account);
    Http::fake([
        'https://api.cloudflare.com/client/v4/accounts/cf_account/realtime/kit/cf_app/meetings' => Http::response(
            ['success' => true, 'data' => ['id' => 'meeting_123']], 200
        ),
    ]);

    $response = (new ProcessorService($this->account, $this->conversation))->createAMeeting($this->agent);

    expect($response['content_attributes']['data']['meeting_id'])->toBe('meeting_123')
        ->and($response['content'])->toBe('Agent Smith has started a meeting');

    $message = $this->conversation->messages()->latest('created_at')->first();
    expect($message->content_type)->toBe(Message::CONTENT_TYPES['integrations'])
        ->and($message->sender_id)->toBe($this->agent->id);
});

it('cấp token tham gia cho participant mới', function () {
    dyteHookFor($this->account);
    $message = Message::factory()->create([
        'account_id' => $this->account->id,
        'conversation_id' => $this->conversation->id,
        'content_type' => Message::CONTENT_TYPES['integrations'],
        'content_attributes' => ['type' => 'dyte', 'data' => ['meeting_id' => 'meeting_123']],
    ]);
    Http::fake([
        'https://api.cloudflare.com/client/v4/accounts/cf_account/realtime/kit/cf_app/meetings/meeting_123/participants' => Http::response(
            ['success' => true, 'data' => ['id' => 'participant_1', 'token' => 'jwt-token']], 200
        ),
    ]);

    $response = (new ProcessorService($this->account, $this->conversation))
        ->addParticipantToMeeting('meeting_123', $this->agent, $message);

    expect($response)->toBe(['id' => 'participant_1', 'token' => 'jwt-token']);

    $clientId = 'App\\Models\\User:'.$this->agent->id;
    expect($message->fresh()->content_attributes['data']['participants'][$clientId])->toBe('participant_1');
});

it('cấp lại token cho participant đã có id lưu sẵn, không tạo participant mới', function () {
    dyteHookFor($this->account);
    $clientId = 'App\\Models\\User:'.$this->agent->id;
    $message = Message::factory()->create([
        'account_id' => $this->account->id,
        'conversation_id' => $this->conversation->id,
        'content_type' => Message::CONTENT_TYPES['integrations'],
        'content_attributes' => ['type' => 'dyte', 'data' => ['meeting_id' => 'meeting_123', 'participants' => [$clientId => 'participant_1']]],
    ]);
    Http::fake([
        'https://api.cloudflare.com/client/v4/accounts/cf_account/realtime/kit/cf_app/meetings/meeting_123/participants/participant_1/token' => Http::response(['success' => true, 'data' => ['token' => 'refreshed-token']], 200),
    ]);

    $response = (new ProcessorService($this->account, $this->conversation))
        ->addParticipantToMeeting('meeting_123', $this->agent, $message);

    expect($response)->toBe(['token' => 'refreshed-token']);
    Http::assertNotSent(fn ($request) => str_ends_with($request->url(), '/participants'));
});
