<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Inbox;
use App\Models\Integrations\Hook;
use App\Models\User;
use App\Services\Integrations\Dialogflow\EventProcessor;
use App\Support\Integrations\EventProcessorResolver;
use Illuminate\Support\Facades\Http;

// Bịt lỗ "container resolve ≠ registry": app($Driver::class) xanh không chứng
// minh driver đã cắm vào sổ config/integration/apps.php — hỏi thẳng
// EventProcessorResolver/HooksController như lõi thật sự dùng.
it('EventProcessorResolver trả đúng driver cho hook dialogflow', function () {
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $hook = Hook::factory()->create([
        'account_id' => $account->id,
        'inbox_id' => $inbox->id,
        'hook_type' => Hook::TYPE_INBOX,
        'app_id' => 'dialogflow',
    ]);

    expect(EventProcessorResolver::forHook($hook))->toBeInstanceOf(EventProcessor::class);
});

it('EventProcessorResolver trả đúng driver cho hook google_translate', function () {
    $account = Account::factory()->create();
    $hook = Hook::factory()->create(['account_id' => $account->id, 'app_id' => 'google_translate']);

    expect(EventProcessorResolver::forHook($hook))->toBeInstanceOf(App\Services\Integrations\GoogleTranslate\EventProcessor::class);
});

it('HooksController từ chối lưu hook openai khi api_key không hợp lệ (credential_validator thật)', function () {
    $account = Account::factory()->create();
    $admin = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $account->id, 'user_id' => $admin->id]);
    Http::fake(['https://api.openai.com/v1/models' => Http::response([], 401)]);

    $response = test()->actingAs($admin)
        ->postJson("/api/v1/accounts/{$account->id}/integrations/hooks", [
            'app_id' => 'openai',
            'settings' => ['api_key' => 'sk-invalid'],
        ]);

    $response->assertStatus(422);
    expect(Hook::query()->where('app_id', 'openai')->count())->toBe(0);
});

it('HooksController cho lưu hook openai khi api_key hợp lệ (credential_validator thật)', function () {
    $account = Account::factory()->create();
    $admin = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $account->id, 'user_id' => $admin->id]);
    Http::fake(['https://api.openai.com/v1/models' => Http::response([], 200)]);

    test()->actingAs($admin)
        ->postJson("/api/v1/accounts/{$account->id}/integrations/hooks", [
            'app_id' => 'openai',
            'settings' => ['api_key' => 'sk-valid'],
        ])
        ->assertOk();

    expect(Hook::query()->where('app_id', 'openai')->count())->toBe(1);
});
