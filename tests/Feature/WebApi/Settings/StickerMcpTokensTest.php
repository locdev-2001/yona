<?php

use App\Mcp\Prompts\DesignStickerPackPrompt;
use App\Mcp\Servers\StickerLibraryServer;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\StickerMcpToken;
use App\Models\User;
use App\Services\Stickers\StickerPackSkill;
use Tests\Support\YonaStickers;

// Token MCP kho sticker trong Cài đặt: tạo, liệt kê, thu hồi theo đúng phạm vi
// mà người dùng đang được dùng.

function mcpTokenMember(Account $account, int $role = AccountUser::ROLE_ADMINISTRATOR): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id, 'role' => $role]);

    return $user;
}

beforeEach(function () {
    config(['yona.system_admin_emails' => '', 'app.url' => 'https://yona.test']);
    $this->account = Account::factory()->create();
    $this->admin = mcpTokenMember($this->account);
    $this->api = "/api/v1/accounts/{$this->account->id}/sticker_mcp_tokens";
});

it('chưa có quyền dùng kho nào thì mọi thao tác trả 403 và không tạo token', function () {
    $this->actingAs($this->admin);

    $this->getJson($this->api)->assertForbidden();
    $this->postJson($this->api, ['name' => 'Lén', 'scope' => StickerMcpToken::SCOPE_ACCOUNT])->assertForbidden();

    expect(StickerMcpToken::query()->count())->toBe(0);
});

it('nhân viên không phải quản trị viên nhận 401', function () {
    YonaStickers::enableCustomStickers($this->account);

    $this->actingAs(mcpTokenMember($this->account, AccountUser::ROLE_AGENT))->getJson($this->api)->assertUnauthorized();
});

it('cờ bật: tạo token kho riêng, token thô hiện đúng một lần, bảng chỉ giữ hash', function () {
    YonaStickers::enableCustomStickers($this->account);
    $this->actingAs($this->admin);

    $created = $this->postJson($this->api, ['name' => ' Claude của shop ', 'scope' => StickerMcpToken::SCOPE_ACCOUNT])
        ->assertCreated()
        ->assertJsonPath('name', 'Claude của shop')
        ->assertJsonPath('scope', StickerMcpToken::SCOPE_ACCOUNT)
        ->assertJsonPath('created_by', $this->admin->name)
        ->assertJsonPath('last_used_at', null)
        ->assertJsonPath('mcp_url', 'https://yona.test'.StickerLibraryServer::PATH);
    $plainTextToken = $created->json('token');
    $stored = StickerMcpToken::query()->sole();

    expect($plainTextToken)->toBeString()->not->toBeEmpty()
        ->and($stored->token_hash)->toBe(hash('sha256', $plainTextToken))
        ->and($stored->getAttributes())->not->toContain($plainTextToken)
        ->and($stored->user_id)->toBe($this->admin->id);

    $this->getJson($this->api)
        ->assertOk()
        ->assertJsonPath('payload.0.id', $stored->id)
        ->assertJsonMissingPath('payload.0.token')
        ->assertJsonMissingPath('payload.0.token_hash')
        ->assertJsonPath('meta.usable_scopes', [StickerMcpToken::SCOPE_ACCOUNT])
        ->assertJsonPath('meta.skill', ['name' => StickerPackSkill::NAME, 'prompt' => DesignStickerPackPrompt::NAME])
        ->assertDontSee($plainTextToken);
});

it('không có quyền hệ thống thì không tạo được token kho nền tảng', function () {
    YonaStickers::enableCustomStickers($this->account);

    $this->actingAs($this->admin)
        ->postJson($this->api, ['name' => 'Lén', 'scope' => StickerMcpToken::SCOPE_PLATFORM])
        ->assertForbidden();

    expect(StickerMcpToken::query()->count())->toBe(0);
});

it('người có quyền hệ thống tạo được cả hai phạm vi', function () {
    YonaStickers::grantSystemAdmin($this->admin);
    $this->actingAs($this->admin);

    $this->postJson($this->api, ['name' => 'Riêng', 'scope' => StickerMcpToken::SCOPE_ACCOUNT])->assertCreated();
    $this->postJson($this->api, ['name' => 'Nền tảng', 'scope' => StickerMcpToken::SCOPE_PLATFORM])->assertCreated();

    expect(array_column($this->getJson($this->api)->assertOk()->json('payload'), 'scope'))
        ->toBe([StickerMcpToken::SCOPE_PLATFORM, StickerMcpToken::SCOPE_ACCOUNT]);
});

it('dữ liệu sai thì 422', function (array $payload, string $field) {
    YonaStickers::grantSystemAdmin($this->admin);

    $this->actingAs($this->admin)->postJson($this->api, $payload)->assertUnprocessable()->assertJsonValidationErrors($field);
})->with([
    'thiếu tên' => [['scope' => StickerMcpToken::SCOPE_ACCOUNT], 'name'],
    'tên quá dài' => [fn () => ['name' => str_repeat('a', StickerMcpToken::MAX_NAME_LENGTH + 1), 'scope' => StickerMcpToken::SCOPE_ACCOUNT], 'name'],
    'phạm vi lạ' => [['name' => 'X', 'scope' => 'everything'], 'scope'],
]);

it('quản trị viên chỉ có kho riêng không thấy, không thu hồi được token kho nền tảng', function () {
    $systemAdmin = mcpTokenMember($this->account);
    YonaStickers::grantSystemAdmin($systemAdmin);
    YonaStickers::enableCustomStickers($this->account);
    $platformToken = StickerMcpToken::issue($this->account, $systemAdmin, 'Nền tảng', StickerMcpToken::SCOPE_PLATFORM)['token'];
    $accountToken = StickerMcpToken::issue($this->account, $systemAdmin, 'Riêng', StickerMcpToken::SCOPE_ACCOUNT)['token'];
    $this->actingAs($this->admin);

    expect(array_column($this->getJson($this->api)->assertOk()->json('payload'), 'id'))->toBe([$accountToken->id]);
    $this->deleteJson("{$this->api}/{$platformToken->id}")->assertForbidden();
    $this->deleteJson("{$this->api}/{$accountToken->id}")->assertOk();

    expect(StickerMcpToken::query()->pluck('id')->all())->toBe([$platformToken->id]);
});

it('không thấy, không thu hồi được token của account khác', function () {
    YonaStickers::enableCustomStickers($this->account);
    $otherAccount = Account::factory()->create();
    $foreign = StickerMcpToken::issue($otherAccount, mcpTokenMember($otherAccount), 'Của người khác', StickerMcpToken::SCOPE_ACCOUNT)['token'];
    $this->actingAs($this->admin);

    expect($this->getJson($this->api)->assertOk()->json('payload'))->toBe([]);
    $this->deleteJson("{$this->api}/{$foreign->id}")->assertNotFound();

    expect($foreign->fresh())->not->toBeNull();
});

it('tải SKILL.md tạo bộ sticker: ai dùng được token MCP thì tải được, chưa có quyền kho nào thì 403', function () {
    $skillUrl = "/api/v1/accounts/{$this->account->id}/sticker_library_skill";
    $this->actingAs($this->admin);

    $this->get($skillUrl)->assertForbidden();

    YonaStickers::enableCustomStickers($this->account);
    $response = $this->get($skillUrl)->assertOk()->assertDownload(StickerPackSkill::DOWNLOAD_NAME);

    expect($response->headers->get('Content-Type'))->toStartWith('text/markdown')
        ->and(file_get_contents($response->baseResponse->getFile()->getPathname()))->toBe(app(StickerPackSkill::class)->document());
});
