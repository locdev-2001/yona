<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\AiAgent;
use App\Models\ApiLog;
use App\Models\Conversation;
use App\Models\SuperAdmin;
use App\Models\User;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Auth;

// Super Admin › Nhật ký AI: chỉ admin Yona xem được, doanh nghiệp không thấy các bước
// của AI hay chi phí. Khoá API không bao giờ xuất hiện, kể cả trong lệnh cURL.

/** @param  array<string, mixed>  $attributes */
function aiLog(Account $account, array $attributes = []): ApiLog
{
    return ApiLog::query()->create([
        'account_id' => $account->id,
        'provider' => 'anthropic',
        'model' => 'claude-sonnet-5',
        'http_status' => 200,
        'request' => ['model' => 'claude-sonnet-5', 'messages' => [['role' => 'user', 'content' => [['type' => 'text', 'text' => 'Váy này giá bao nhiêu?']]]]],
        'response' => ['stop_reason' => 'end_turn', 'content' => [['type' => 'text', 'text' => 'Dạ']]],
        'input_tokens' => 120,
        'output_tokens' => 8,
        'cost_micro_usd' => 450,
        'latency_ms' => 900,
        ...$attributes,
    ]);
}

describe('quyền xem', function () {
    it('tài khoản doanh nghiệp (kể cả quản trị viên account) không vào được', function () {
        $account = Account::factory()->create();
        $owner = User::factory()->create();
        AccountUser::factory()->administrator()->create(['account_id' => $account->id, 'user_id' => $owner->id]);
        aiLog($account);

        $this->actingAs($owner)->get('/admin/ai_logs')->assertRedirect('/admin/sign_in');
        $this->actingAs($owner)->getJson('/admin/ai_logs')->assertUnauthorized();
    });

    it('chưa đăng nhập thì về trang đăng nhập console', function () {
        $this->get('/admin/ai_logs')->assertRedirect('/admin/sign_in');
    });

    it('super admin thấy trang và mục Nhật ký AI trên thanh bên', function () {
        App::setLocale('vi');
        $this->actingAs(SuperAdmin::factory()->withMfa()->create(), 'super_admin');

        $this->get('/admin/ai_logs')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('superadmin/AiLogs', false)
                ->where('superAdmin.navGroups', fn ($groups) => collect($groups)
                    ->flatMap(fn ($group) => $group['items'])
                    ->contains(fn ($item) => $item['url'] === '/admin/ai_logs' && $item['label'] === 'Nhật ký AI')));
    });
});

describe('bảng và chi tiết', function () {
    beforeEach(function () {
        $this->actingAs(SuperAdmin::factory()->withMfa()->create(), 'super_admin');
    });

    it('lọc theo account, nhân viên AI, provider/model, kết quả và chữ trong request/response', function () {
        $account = Account::factory()->create();
        $other = Account::factory()->create();
        $aiAgent = AiAgent::factory()->create(['account_id' => $account->id, 'name' => 'Linh']);
        $ok = aiLog($account, ['ai_agent_id' => $aiAgent->id]);
        $failed = aiLog($account, ['provider' => 'openrouter', 'model' => 'anthropic/claude-sonnet-5', 'http_status' => 429, 'error_code' => 'retryable', 'response' => null]);
        $foreign = aiLog($other, ['request' => ['messages' => [['role' => 'user', 'content' => 'unsourced_claim ở đây']]]]);

        $ids = fn (string $query) => collect($this->get("/admin/ai_logs?{$query}")->assertOk()->viewData('page')['props']['logs'])->pluck('id')->all();

        expect($ids("account_id={$account->id}"))->toEqualCanonicalizing([$ok->id, $failed->id])
            ->and($ids("ai_agent_id={$aiAgent->id}"))->toBe([$ok->id])
            ->and($ids('route=openrouter|anthropic/claude-sonnet-5'))->toBe([$failed->id])
            ->and($ids('result=error'))->toBe([$failed->id])
            ->and($ids('result=ok&account_id='.$account->id))->toBe([$ok->id])
            ->and($ids('q=unsourced_claim'))->toBe([$foreign->id]);
    });

    it('mặc định chỉ 24 giờ qua, chọn "Tất cả" thì thấy cả dòng cũ', function () {
        $account = Account::factory()->create();
        $recent = aiLog($account);
        $old = aiLog($account);
        $old->forceFill(['created_at' => now()->subDays(3)])->save();

        $ids = fn (string $query) => collect($this->get("/admin/ai_logs?{$query}")->viewData('page')['props']['logs'])->pluck('id')->all();

        expect($ids(''))->toBe([$recent->id])
            ->and($ids('window=all'))->toEqualCanonicalizing([$recent->id, $old->id]);
    });

    it('tìm chữ chỉ quét tối đa 7 ngày gần nhất và báo cho giao diện khi đã thu khoảng thời gian', function (string $window, string $effective, bool $capped) {
        $account = Account::factory()->create();
        $needle = ['request' => ['messages' => [['role' => 'user', 'content' => 'unsourced_claim ở đây']]]];
        $recent = aiLog($account, $needle);
        $lastWeek = aiLog($account, $needle);
        $lastWeek->forceFill(['created_at' => now()->subDays(5)])->save();
        $old = aiLog($account, $needle);
        $old->forceFill(['created_at' => now()->subDays(10)])->save();

        $props = $this->get("/admin/ai_logs?q=unsourced_claim&window={$window}")->assertOk()->viewData('page')['props'];
        $expected = $effective === '24h' ? [$recent->id] : [$recent->id, $lastWeek->id];

        expect(collect($props['logs'])->pluck('id')->all())->toEqualCanonicalizing($expected)
            ->and($props['filters']->window)->toBe($effective)
            ->and($props['searchWindowCapped'])->toBe($capped);
    })->with([
        'tất cả' => ['all', '7d', true],
        '30 ngày' => ['30d', '7d', true],
        '7 ngày' => ['7d', '7d', false],
        '24 giờ' => ['24h', '24h', false],
    ]);

    it('không tìm chữ thì vẫn xem được 30 ngày và tất cả', function () {
        $account = Account::factory()->create();
        $old = aiLog($account);
        $old->forceFill(['created_at' => now()->subDays(10)])->save();

        $props = $this->get('/admin/ai_logs?window=30d')->assertOk()->viewData('page')['props'];

        expect(collect($props['logs'])->pluck('id')->all())->toBe([$old->id])
            ->and($props['filters']->window)->toBe('30d')
            ->and($props['searchWindowCapped'])->toBeFalse();
    });

    it('chi tiết có lời gọi công cụ kèm kết quả, các lần gọi cùng lượt, cURL không chứa khoá', function () {
        config(['agent.providers.anthropic.api_key' => 'sk-ant-secret-123']);
        $account = Account::factory()->create();
        $first = aiLog($account, [
            'response' => ['stop_reason' => 'tool_use', 'content' => [['type' => 'tool_use', 'id' => 'toolu_1', 'name' => 'search_knowledge', 'input' => ['query' => 'giá váy']]]],
        ]);
        $second = aiLog($account, [
            'request' => ['messages' => [
                ['role' => 'user', 'content' => [['type' => 'text', 'text' => 'Váy này giá bao nhiêu?']]],
                ['role' => 'assistant', 'content' => [['type' => 'tool_use', 'id' => 'toolu_1', 'name' => 'search_knowledge', 'input' => ['query' => 'giá váy']]]],
                ['role' => 'user', 'content' => [['type' => 'tool_result', 'tool_use_id' => 'toolu_1', 'content' => '{"ok":true,"data":[]}']]],
            ]],
            'response' => ['stop_reason' => 'tool_use', 'content' => [['type' => 'tool_use', 'id' => 'toolu_2', 'name' => 'handoff_to_human', 'input' => ['reason' => 'binding_info_missing']]]],
        ]);
        $conversationLess = [$first->id, $second->id];

        $selected = $this->get("/admin/ai_logs?log={$second->id}")->assertOk()->viewData('page')['props']['selected'];

        expect($selected['finishReason'])->toBe('tool_use')
            ->and($selected['toolCalls'])->toBe([
                ['id' => 'toolu_1', 'name' => 'search_knowledge', 'input' => ['query' => 'giá váy'], 'output' => ['ok' => true, 'data' => []], 'is_error' => false, 'pending' => false],
                ['id' => 'toolu_2', 'name' => 'handoff_to_human', 'input' => ['reason' => 'binding_info_missing'], 'output' => null, 'is_error' => false, 'pending' => true],
            ])
            ->and($selected['endpoint'])->toBe('https://api.anthropic.com/v1/messages')
            ->and($selected['curl'])->toContain("curl -X POST 'https://api.anthropic.com/v1/messages'")
            ->and($selected['curl'])->toContain('x-api-key: <API_KEY>')
            ->and($selected['curl'])->not->toContain('sk-ant-secret-123')
            ->and(collect($selected['turn']['calls'])->pluck('id')->all())->toBe([$second->id])
            ->and($conversationLess)->toContain($second->id);
    });

    it('các lần gọi liền nhau cùng hội thoại gom thành một lượt', function () {
        $account = Account::factory()->create();
        // Hook tạo hội thoại đọc người đăng nhập của guard mặc định: tạo dữ liệu dưới guard web.
        Auth::shouldUse('web');
        $conversation = Conversation::factory()->create(['account_id' => $account->id]);
        Auth::shouldUse('super_admin');
        $earlier = aiLog($account, ['conversation_id' => $conversation->id]);
        $earlier->forceFill(['created_at' => now()->subHour()])->save();
        $stepOne = aiLog($account, ['conversation_id' => $conversation->id]);
        $stepOne->forceFill(['created_at' => now()->subSeconds(10)])->save();
        $stepTwo = aiLog($account, ['conversation_id' => $conversation->id, 'cost_micro_usd' => 50]);

        $selected = $this->get("/admin/ai_logs?log={$stepTwo->id}")->viewData('page')['props']['selected'];

        expect(collect($selected['turn']['calls'])->pluck('id')->all())->toBe([$stepOne->id, $stepTwo->id])
            ->and($selected['turn']['costMicroUsd'])->toBe(500)
            ->and($selected['conversationUrl'])->toBe("/app/accounts/{$account->id}/conversations/{$conversation->display_id}");
    });
});
