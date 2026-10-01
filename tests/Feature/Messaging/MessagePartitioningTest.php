<?php

use App\Models\AutomationRule;
use App\Models\AutomationRulePendingExecution;
use App\Models\Conversation;
use App\Models\CsatSurveyResponse;
use App\Models\Message;
use App\Models\MessageAccessToken;
use App\Services\Messaging\PublicFlowService;
use Illuminate\Support\Facades\DB;

function partitionNames(): array
{
    return collect(DB::select("SELECT inhrelid::regclass::text AS name FROM pg_inherits WHERE inhparent = 'messages'::regclass"))
        ->pluck('name')->sort()->values()->all();
}

function partitionedMessage(array $attributes = []): Message
{
    $conversation = Conversation::factory()->create();

    return Message::factory()->create([
        'account_id' => $conversation->account_id,
        'conversation_id' => $conversation->id,
        ...$attributes,
    ]);
}

it('chia messages theo tháng với khoá chính (id, created_at) và partition DEFAULT', function () {
    expect(DB::scalar("SELECT partstrat FROM pg_partitioned_table WHERE partrelid = 'messages'::regclass"))->toBe('r')
        ->and(DB::scalar("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'messages_pkey'"))->toBe('PRIMARY KEY (id, created_at)')
        ->and(DB::scalar("SELECT pg_get_serial_sequence('messages', 'id')"))->toBe('public.messages_id_seq');

    $month = now()->startOfMonth();
    $expected = collect(range(0, 3))->map(fn (int $i) => 'messages_p'.$month->copy()->addMonths($i)->format('Y_m'));

    expect(partitionNames())->toContain('messages_default', ...$expected->all());
});

it('lệnh tạo partition chạy lại không tạo thêm gì', function () {
    $this->artisan('messages:create-partitions', ['--months' => 5])->assertSuccessful();
    $after = partitionNames();

    $this->artisan('messages:create-partitions', ['--months' => 5])
        ->expectsOutputToContain('Không cần tạo partition mới')
        ->assertSuccessful();

    expect(partitionNames())->toBe($after)
        ->toContain('messages_p'.now()->startOfMonth()->addMonths(5)->format('Y_m'));
});

it('bỏ qua tháng đang có tin nằm ở DEFAULT và báo lỗi, các tháng khác vẫn tạo', function () {
    $farMonth = now()->startOfMonth()->addMonths(6);
    $message = partitionedMessage(['created_at' => $farMonth->copy()->addDays(2)]);

    $this->artisan('messages:create-partitions', ['--months' => 6])
        ->expectsOutputToContain('messages_p'.$farMonth->format('Y_m'))
        ->assertFailed();

    expect(partitionNames())->not->toContain('messages_p'.$farMonth->format('Y_m'))
        ->toContain('messages_p'.$farMonth->copy()->subMonth()->format('Y_m'))
        ->and(DB::scalar('SELECT tableoid::regclass::text FROM messages WHERE id = ?', [$message->id]))->toBe('messages_default');
});

it('ghi message_created_at khi tạo vé, phiếu CSAT và lượt chờ automation', function () {
    $message = partitionedMessage();
    DB::table('messages')->where('id', $message->id)->update(['created_at' => '2026-03-05 10:11:12.345678']);
    $message = Message::query()->findOrFail($message->id);

    app(PublicFlowService::class)->issue($message, 'schedule');
    $csat = CsatSurveyResponse::factory()->create(['account_id' => $message->account_id, 'message_id' => $message->id]);
    $rule = AutomationRule::factory()->create(['account_id' => $message->account_id]);
    $pending = AutomationRulePendingExecution::schedule($rule, $message->conversation, $message);

    $stored = fn (string $table) => DB::table($table)->where('message_id', $message->id)->value('message_created_at');

    expect($stored('message_access_tokens'))->toBe('2026-03-05 10:11:12.345678')
        ->and($stored('csat_survey_responses'))->toBe('2026-03-05 10:11:12.345678')
        ->and($stored('automation_rule_pending_executions'))->toBe('2026-03-05 10:11:12.345678')
        ->and($csat->message->is($message))->toBeTrue()
        ->and($pending->message->is($message))->toBeTrue();
});

it('xoá tin thì xoá phiếu CSAT, vé truy cập và bỏ trỏ ở lượt chờ automation', function () {
    $message = partitionedMessage();
    app(PublicFlowService::class)->issue($message, 'schedule');
    CsatSurveyResponse::factory()->create(['account_id' => $message->account_id, 'message_id' => $message->id]);
    $rule = AutomationRule::factory()->create(['account_id' => $message->account_id]);
    $pending = AutomationRulePendingExecution::schedule($rule, $message->conversation, $message);

    Message::query()->findOrFail($message->id)->delete();

    expect(MessageAccessToken::query()->count())->toBe(0)
        ->and(CsatSurveyResponse::query()->count())->toBe(0)
        ->and(DB::table('automation_rule_pending_executions')->where('id', $pending->id)->first())
        ->message_id->toBeNull()
        ->message_created_at->toBeNull();
});

it('đổi created_at của tin sang tháng khác vẫn giữ liên kết ở bảng trỏ vào', function () {
    $message = partitionedMessage();
    CsatSurveyResponse::factory()->create(['account_id' => $message->account_id, 'message_id' => $message->id]);

    $message->forceFill(['created_at' => now()->subMonths(14)])->save();

    expect(DB::scalar('SELECT tableoid::regclass::text FROM messages WHERE id = ?', [$message->id]))->toBe('messages_default')
        ->and(CsatSurveyResponse::query()->sole()->message_created_at)->toBe($message->fresh()->getRawOriginal('created_at'));
});

it('tìm tin theo id và route model binding vẫn chạy với khoá chính ghép', function () {
    $message = partitionedMessage();

    expect(Message::find($message->id)?->is($message))->toBeTrue()
        ->and((new Message)->resolveRouteBinding($message->id)?->is($message))->toBeTrue()
        ->and(DB::scalar('SELECT created_at IS NOT NULL FROM messages WHERE id = ?', [$message->id]))->toBeTrue();
});
