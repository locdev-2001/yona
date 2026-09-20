<?php

use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Testing\TestResponse;

// Form công khai duy nhất của sản phẩm. Ba thứ phải đúng: lead không được mất,
// một người không được thành hai hồ sơ, và hỏng thì không được báo thành công.

beforeEach(function () {
    $this->inbox = Inbox::factory()->create();
    config(['yona.marketing.lead_inbox_id' => $this->inbox->id]);
    RateLimiter::clear('');
});

function guiForm(array $ghiDe = []): TestResponse
{
    return test()->post('/dat-lich-demo', [
        'name' => 'Trần Thu Hà',
        'phone' => '0912 345 678',
        ...$ghiDe,
    ]);
}

it('hiện trang đặt lịch demo', function () {
    $this->get('/dat-lich-demo')
        ->assertOk()
        ->assertSee('"page":"demo"', escape: false)
        ->assertSee('/dat-lich-demo', escape: false);
});

it('biến lead thành một hội thoại đến trong hộp thư của Yona', function () {
    guiForm(['note' => 'Shop mỹ phẩm, ba bạn cùng trả lời một số Zalo.'])
        ->assertRedirect('/dat-lich-demo/cam-on');

    $contact = Contact::query()->sole();
    expect($contact->name)->toBe('Trần Thu Hà')
        // Khách gõ kiểu Việt, hồ sơ lưu E.164 — nếu không thì mỗi cách gõ một hồ sơ.
        ->and($contact->phone_number)->toBe('+84912345678');

    $conversation = Conversation::query()->sole();
    expect($conversation->inbox_id)->toBe($this->inbox->id)
        ->and($conversation->additional_attributes['source'] ?? null)->toBe('dat-lich-demo');

    $message = Message::query()->sole();
    expect(Message::typeName($message->message_type))->toBe('incoming')
        ->and($message->content)->toContain('+84912345678')
        ->and($message->content)->toContain('Shop mỹ phẩm');
});

it('gộp về một hồ sơ khi cùng một số gửi hai lần', function () {
    guiForm()->assertRedirect('/dat-lich-demo/cam-on');
    guiForm(['name' => 'Hà Trần', 'phone' => '+84912345678'])->assertRedirect('/dat-lich-demo/cam-on');

    expect(Contact::query()->count())->toBe(1)
        ->and(Message::query()->count())->toBe(2);
});

it('từ chối số điện thoại không đúng dạng và không tạo gì', function () {
    guiForm(['phone' => '12'])
        ->assertRedirect()
        ->assertSessionHasErrors('phone');

    expect(Contact::query()->count())->toBe(0)
        ->and(Conversation::query()->count())->toBe(0);
});

it('bắt buộc có tên', function () {
    guiForm(['name' => ''])->assertSessionHasErrors('name');

    expect(Conversation::query()->count())->toBe(0);
});

it('im lặng bỏ qua bot điền vào ô bẫy', function () {
    guiForm(['website' => 'https://bot.example'])
        ->assertRedirect('/dat-lich-demo/cam-on');

    // Redirect như thật để bot không học được cách lách, nhưng không tạo gì cả.
    expect(Conversation::query()->count())->toBe(0);
});

it('không hiện trang cảm ơn khi chưa nhận được lead', function () {
    config(['yona.marketing.lead_inbox_id' => null]);

    guiForm()
        ->assertRedirect()
        ->assertSessionHas('demo_request_failed', true)
        ->assertSessionHasInput('phone', '0912 345 678');

    expect(Conversation::query()->count())->toBe(0);
});

it('chặn sau 5 lượt gửi trong 10 phút', function () {
    for ($i = 0; $i < 5; $i++) {
        guiForm(['phone' => '09123456'.str_pad((string) $i, 2, '0', STR_PAD_LEFT)])->assertRedirect();
    }

    guiForm(['phone' => '0912345699'])->assertStatus(429);
});

it('liệt kê trang thật trong sitemap và bỏ trang cảm ơn', function () {
    $xml = $this->get('/sitemap.xml')
        ->assertOk()
        ->assertHeader('Content-Type', 'application/xml; charset=UTF-8')
        ->getContent();

    expect($xml)->toContain('/zalo-ca-nhan')
        ->and($xml)->toContain('/dat-lich-demo')
        // Trang cảm ơn không có gì để xếp hạng, và lọt vào kết quả tìm kiếm thì
        // khách vào đó trước khi gửi form.
        ->and($xml)->not->toContain('/dat-lich-demo/cam-on');
});

it('hiện trang Zalo cá nhân', function () {
    $this->get('/zalo-ca-nhan')
        ->assertOk()
        ->assertSee('"page":"zalo_personal"', escape: false);
});
