<?php

use App\Channels\Capability;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Models\User;
use App\Services\Stickers\YonaStickerCatalog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\Support\YonaStickers;

// Gợi ý sticker khi agent gõ: chỉ kho Yona (không hỏi bridge Zalo), khớp nhãn hoặc
// từ khoá bằng / bắt đầu bằng từ gõ / có một chữ bắt đầu bằng từ gõ, không dấu,
// không phân biệt hoa thường (luật chi tiết: StickerKeywordMatchTest).

function suggestionsUrl(Account $account, Conversation $conversation, string $query): string
{
    return "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/stickers/suggestions?".http_build_query(['q' => $query]);
}

/** @return list<string> */
function suggestedIds(TestResponse $response): array
{
    return array_column($response->assertOk()->json('stickers'), 'id');
}

beforeEach(function () {
    Storage::fake(Sticker::DISK);
    Http::fake();
    $this->inbox = Inbox::factory()->zalo()->create();
    $this->account = Account::find($this->inbox->account_id);
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id, 'role' => AccountUser::ROLE_AGENT]);
    $this->inbox->addMembers([$this->agent->id]);
    $this->conversation = Conversation::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $this->inbox->id]);
    $this->pack = StickerPack::factory()->create(['position' => 0]);
    $this->actingAs($this->agent);
});

it('khớp từ khoá bắt đầu bằng từ gõ, trả đúng shape của bảng chọn và không gọi bridge', function () {
    $thanks = YonaStickers::ready($this->pack, ['label' => 'Mèo', 'keywords' => ['cảm ơn', 'thanks'], 'position' => 1]);
    YonaStickers::ready($this->pack, ['label' => 'Chó', 'keywords' => ['xin chào'], 'position' => 2]);

    $this->getJson(suggestionsUrl($this->account, $this->conversation, 'cảm'))
        ->assertOk()
        ->assertExactJson(['stickers' => [[
            'id' => "yona:{$thanks->id}",
            'image_url' => $thanks->image_url,
            'pack_id' => "yona:{$this->pack->id}",
            'label' => 'Mèo',
        ]]]);

    expect($this->inbox->supports(Capability::OutboundSticker))->toBeTrue();
    Http::assertNothingSent();
});

it('không dấu và không phân biệt hoa thường, khớp cả nhãn', function () {
    $thanks = YonaStickers::ready($this->pack, ['keywords' => ['cảm ơn'], 'position' => 1]);
    $morning = YonaStickers::ready($this->pack, ['label' => 'Chào buổi sáng', 'position' => 2]);
    $roadDog = YonaStickers::ready($this->pack, ['keywords' => ['đường'], 'position' => 3]);

    expect(suggestedIds($this->getJson(suggestionsUrl($this->account, $this->conversation, 'cam on'))))->toBe(["yona:{$thanks->id}"])
        ->and(suggestedIds($this->getJson(suggestionsUrl($this->account, $this->conversation, 'CẢM Ơ'))))->toBe(["yona:{$thanks->id}"])
        ->and(suggestedIds($this->getJson(suggestionsUrl($this->account, $this->conversation, 'chao buoi'))))->toBe(["yona:{$morning->id}"])
        ->and(suggestedIds($this->getJson(suggestionsUrl($this->account, $this->conversation, 'duong'))))->toBe(["yona:{$roadDog->id}"]);
});

it('khớp đầu nhãn, đầu từ khoá hoặc đầu một chữ, không khớp giữa chữ', function () {
    YonaStickers::ready($this->pack, ['label' => 'Mèo cảm ơn', 'keywords' => ['cảm ơn']]);

    expect(suggestedIds($this->getJson(suggestionsUrl($this->account, $this->conversation, 'eo'))))->toBe([])
        ->and(suggestedIds($this->getJson(suggestionsUrl($this->account, $this->conversation, 'am on'))))->toBe([])
        ->and(suggestedIds($this->getJson(suggestionsUrl($this->account, $this->conversation, 'cảm'))))->toHaveCount(1)
        ->and(suggestedIds($this->getJson(suggestionsUrl($this->account, $this->conversation, 'ơn'))))->toHaveCount(1);
});

it('cùng luật với widget: gạch nối là khoảng trắng, chữ giữa nhãn cũng gợi ý', function () {
    $thankYou = YonaStickers::ready($this->pack, ['keywords' => ['thank-you'], 'position' => 1]);
    $cat = YonaStickers::ready($this->pack, ['label' => 'Mèo cảm ơn', 'position' => 2]);

    expect(suggestedIds($this->getJson(suggestionsUrl($this->account, $this->conversation, 'thank you'))))->toBe(["yona:{$thankYou->id}"])
        ->and(suggestedIds($this->getJson(suggestionsUrl($this->account, $this->conversation, 'cam'))))->toBe(["yona:{$cat->id}"]);
});

it('khớp trọn, rồi đầu nhãn hay từ khoá, rồi đầu một chữ; cùng hạng theo thứ tự kho', function () {
    $wordPrefix = YonaStickers::ready($this->pack, ['label' => 'Cười ha hả', 'position' => 1]);
    $prefix = YonaStickers::ready($this->pack, ['keywords' => ['haha'], 'position' => 2]);
    $exact = YonaStickers::ready($this->pack, ['keywords' => ['ha'], 'position' => 3]);

    expect(suggestedIds($this->getJson(suggestionsUrl($this->account, $this->conversation, 'ha'))))
        ->toBe(["yona:{$exact->id}", "yona:{$prefix->id}", "yona:{$wordPrefix->id}"]);
});

it('khớp trọn đứng trước khớp tiền tố, sau đó theo thứ tự kho', function () {
    $okela = YonaStickers::ready($this->pack, ['keywords' => ['okela'], 'position' => 1]);
    $okay = YonaStickers::ready($this->pack, ['label' => 'Okay', 'position' => 2]);
    $ok = YonaStickers::ready($this->pack, ['keywords' => ['ok'], 'position' => 3]);

    expect(suggestedIds($this->getJson(suggestionsUrl($this->account, $this->conversation, 'ok'))))
        ->toBe(["yona:{$ok->id}", "yona:{$okela->id}", "yona:{$okay->id}"]);
});

it('tối đa 8 gợi ý', function () {
    foreach (range(1, YonaStickerCatalog::SUGGESTION_LIMIT + 3) as $position) {
        YonaStickers::ready($this->pack, ['keywords' => ['haha'], 'position' => $position]);
    }

    expect(suggestedIds($this->getJson(suggestionsUrl($this->account, $this->conversation, 'ha'))))->toHaveCount(8);
});

it('từ gõ ngắn hơn 2 ký tự hay ký tự đại diện LIKE thì không trả gì', function (string $query) {
    YonaStickers::ready($this->pack, ['label' => 'abc', 'keywords' => ['haha']]);

    expect(suggestedIds($this->getJson(suggestionsUrl($this->account, $this->conversation, $query))))->toBe([]);
})->with(['một ký tự' => 'h', 'rỗng' => '', 'phần trăm' => '%%', 'gạch dưới' => '__']);

it('cách ly: chỉ sticker account thấy được — bộ chưa xuất bản, kho riêng tenant khác, sticker chưa xong đều không hiện; kho riêng của chính account hiện', function () {
    YonaStickers::ready(StickerPack::factory()->unpublished()->create(), ['keywords' => ['haha']]);
    YonaStickers::ready(YonaStickers::tenantPack(Account::factory()->create()), ['keywords' => ['haha']]);
    $own = YonaStickers::ready(YonaStickers::tenantPack($this->account), ['keywords' => ['haha']]);
    Sticker::factory()->processing()->for($this->pack, 'stickerPack')->create(['keywords' => ['haha']]);

    expect(suggestedIds($this->getJson(suggestionsUrl($this->account, $this->conversation, 'haha'))))->toBe(["yona:{$own->id}"]);
});

it('hộp thư không gửi được ảnh thì mảng rỗng, không lỗi', function () {
    YonaStickers::ready($this->pack, ['keywords' => ['haha']]);
    $smsInbox = Inbox::factory()->sms()->create(['account_id' => $this->account->id]);
    $smsInbox->addMembers([$this->agent->id]);
    $conversation = Conversation::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $smsInbox->id]);

    $this->getJson(suggestionsUrl($this->account, $conversation, 'haha'))->assertOk()->assertExactJson(['stickers' => []]);
});

it('agent không thuộc hộp thư thì 401', function () {
    $outsider = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $outsider->id, 'role' => AccountUser::ROLE_AGENT]);

    $this->actingAs($outsider)->getJson(suggestionsUrl($this->account, $this->conversation, 'haha'))->assertUnauthorized();
});
