<?php

use App\Services\Integrations\Dyte\Client;
use Illuminate\Support\Facades\Http;

// Port từ refs/chatwoot/spec/lib/dyte_spec.rb.
it('báo lỗi khi thiếu account_id, app_id hoặc api_token', function () {
    expect(fn () => new Client(null, null, null))->toThrow(InvalidArgumentException::class);
});

it('createAMeeting trả dữ liệu khi API thành công', function () {
    Http::fake([
        'https://api.cloudflare.com/client/v4/accounts/account_id/realtime/kit/app_id/meetings' => Http::response(
            ['success' => true, 'data' => ['id' => 'meeting_id']], 200
        ),
    ]);

    $response = (new Client('account_id', 'app_id', 'api_token'))->createAMeeting('title_of_the_meeting');

    expect($response)->toBe(['id' => 'meeting_id']);
});

it('createAMeeting trả error + error_code khi API trả lỗi', function () {
    Http::fake([
        'https://api.cloudflare.com/client/v4/accounts/account_id/realtime/kit/app_id/meetings' => Http::response(
            ['message' => 'Title is required'], 422
        ),
    ]);

    $response = (new Client('account_id', 'app_id', 'api_token'))->createAMeeting('');

    expect($response)->toBe(['error' => ['message' => 'Title is required'], 'error_code' => 422]);
});

it('createAMeeting trả unexpected_response khi thành công nhưng không có data', function () {
    Http::fake([
        'https://api.cloudflare.com/client/v4/accounts/account_id/realtime/kit/app_id/meetings' => Http::response(
            ['success' => true, 'data' => null], 200
        ),
    ]);

    $response = (new Client('account_id', 'app_id', 'api_token'))->createAMeeting('title_of_the_meeting');

    expect($response)->toBe(['error' => 'unexpected_response', 'error_code' => 200]);
});

it('addParticipantToMeeting báo lỗi khi thiếu thông tin', function () {
    expect(fn () => (new Client('account_id', 'app_id', 'api_token'))->addParticipantToMeeting('', '', '', ''))
        ->toThrow(InvalidArgumentException::class);
});

it('addParticipantToMeeting trả dữ liệu khi thành công', function () {
    $url = 'https://api.cloudflare.com/client/v4/accounts/account_id/realtime/kit/app_id/meetings/m_id/participants';
    Http::fake([
        $url => Http::response(['success' => true, 'data' => ['id' => 'random_uuid', 'token' => 'json-web-token']], 200),
    ]);

    $response = (new Client('account_id', 'app_id', 'api_token'))
        ->addParticipantToMeeting('m_id', 'c_id', 'name', 'https://avatar.url');

    expect($response)->toBe(['id' => 'random_uuid', 'token' => 'json-web-token']);
    Http::assertSent(fn ($request) => ($request->data()['preset_name'] ?? null) === 'group-call-host');
});

it('addParticipantToMeeting thử lại với preset cũ khi preset mặc định không tồn tại', function () {
    $url = 'https://api.cloudflare.com/client/v4/accounts/account_id/realtime/kit/app_id/meetings/m_id/participants';
    $callCount = 0;

    Http::fake(function ($request) use (&$callCount) {
        $callCount++;
        $presetName = $request->data()['preset_name'] ?? null;

        if ($presetName === 'group-call-host') {
            return Http::response([
                'success' => false,
                'error' => ['code' => 404, 'message' => 'ResourceNotFound: No preset found with name group-call-host'],
            ], 404);
        }

        return Http::response(['success' => true, 'data' => ['id' => 'random_uuid', 'token' => 'json-web-token']], 200);
    });

    $response = (new Client('account_id', 'app_id', 'api_token'))
        ->addParticipantToMeeting('m_id', 'c_id', 'name', 'https://avatar.url');

    expect($response)->toBe(['id' => 'random_uuid', 'token' => 'json-web-token'])
        ->and($callCount)->toBe(2);
});

it('refreshParticipantToken trả token mới', function () {
    Http::fake([
        'https://api.cloudflare.com/client/v4/accounts/account_id/realtime/kit/app_id/meetings/m_id/participants/participant_id/token' => Http::response(['success' => true, 'data' => ['token' => 'refreshed-json-web-token']], 200),
    ]);

    $response = (new Client('account_id', 'app_id', 'api_token'))->refreshParticipantToken('m_id', 'participant_id');

    expect($response)->toBe(['token' => 'refreshed-json-web-token']);
});

it('fetchParticipants trả danh sách participants', function () {
    Http::fake([
        'https://api.cloudflare.com/client/v4/accounts/account_id/realtime/kit/app_id/meetings/m_id/participants' => Http::response(['success' => true, 'data' => [['id' => 'participant_id', 'custom_participant_id' => 'c_id']]], 200),
    ]);

    $response = (new Client('account_id', 'app_id', 'api_token'))->fetchParticipants('m_id');

    expect($response)->toBe([['id' => 'participant_id', 'custom_participant_id' => 'c_id']]);
});
