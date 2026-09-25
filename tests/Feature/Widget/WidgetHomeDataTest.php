<?php

use App\Models\Portal;
use App\Models\WidgetUpdate;
use App\Support\Widget\WidgetSettings;
use Illuminate\Validation\ValidationException;
use Tests\Support\WidgetSession;

// Dữ liệu cho màn Home và tab Cập nhật của widget mới: cấu hình widget
// (widget_settings), Help Center gắn với hộp thư, bài cập nhật đã xuất bản.

describe('widget_settings', function () {
    it('chưa cấu hình thì dùng mặc định', function () {
        expect(WidgetSettings::resolve(null))->toBe(WidgetSettings::DEFAULTS);
    });

    it('đọc cấu hình cũ thì bỏ mục sai, không vỡ widget', function () {
        $settings = WidgetSettings::resolve([
            'appearance' => ['launcher' => 'giant'],
            'other_channels' => [
                ['kind' => 'zalo', 'value' => 'https://zalo.me/0901234567'],
                ['kind' => 'zalo', 'value' => 'javascript:alert(1)'],
                ['kind' => 'hotline', 'value' => '0901 234 567'],
            ],
            'custom_links' => [['label' => 'Bảng giá sỉ', 'url' => 'https://gommoc.vn/gia-si'], ['label' => 'x', 'url' => 'ftp://a']],
        ]);

        expect($settings['appearance']['launcher'])->toBe('round')
            ->and(array_column($settings['other_channels'], 'kind'))->toBe(['zalo', 'hotline'])
            ->and($settings['custom_links'])->toBe([['label' => 'Bảng giá sỉ', 'url' => 'https://gommoc.vn/gia-si']]);
    });

    it('dashboard lưu sai thì báo lỗi đúng mục', function () {
        expect(fn () => WidgetSettings::normalize(['other_channels' => [['kind' => 'zalo', 'value' => 'khong-phai-link']]]))
            ->toThrow(ValidationException::class);
    });

    it('cấu hình widget gửi kèm widget_settings và Help Center của hộp thư', function () {
        $session = WidgetSession::make();
        $portal = Portal::factory()->create(['account_id' => $session->account->id]);
        $session->inbox->update(['portal_id' => $portal->id]);
        // Dashboard ghi cột này ở phase cấu hình (qua WidgetSettings::normalize); ở đây ghi thẳng.
        $session->channel->forceFill(['widget_settings' => ['appearance' => ['launcher' => 'pill', 'launcher_label' => 'Chat với shop']]])->save();

        $config = $this->postJson($session->url('config'), [], $session->headers())->assertOk()->json('website_channel_config');

        expect($config['widget_settings']['appearance'])->toMatchArray(['launcher' => 'pill', 'launcher_label' => 'Chat với shop'])
            ->and($config['portal']['slug'])->toBe($portal->slug);
    });
});

describe('tab Cập nhật', function () {
    it('chỉ trả bài đã xuất bản của account, cho hộp thư này hoặc mọi hộp thư, mới nhất trước', function () {
        $session = WidgetSession::make();
        $account = $session->account->id;
        $older = WidgetUpdate::query()->create(['account_id' => $account, 'title' => 'Lịch nghỉ lễ', 'published_at' => now()->subDays(3)]);
        $newer = WidgetUpdate::query()->create(['account_id' => $account, 'inbox_id' => $session->inbox->id, 'title' => 'Giảm 15% men lam', 'tag' => 'promo', 'published_at' => now()->subDay()]);
        WidgetUpdate::query()->create(['account_id' => $account, 'title' => 'Nháp', 'published_at' => null]);
        WidgetUpdate::query()->create(['account_id' => $account, 'title' => 'Hẹn giờ', 'published_at' => now()->addDay()]);
        WidgetUpdate::query()->create(['account_id' => WidgetSession::make()->account->id, 'title' => 'Shop khác', 'published_at' => now()]);

        $payload = $this->getJson($session->url('updates'), $session->headers())->assertOk()->json('payload');

        expect(array_column($payload, 'id'))->toBe([$newer->id, $older->id]);
    });

    it('đọc chi tiết một bài; bài của shop khác là 404', function () {
        $session = WidgetSession::make();
        $update = WidgetUpdate::query()->create([
            'account_id' => $session->account->id, 'title' => 'Hàng mới', 'body' => 'Cốc men hoả biến về hàng', 'cta_label' => 'Xem', 'cta_url' => 'https://gommoc.vn/coc', 'published_at' => now(),
        ]);
        $foreign = WidgetUpdate::query()->create(['account_id' => WidgetSession::make()->account->id, 'title' => 'x', 'published_at' => now()]);

        $this->getJson($session->url("updates/{$update->id}"), $session->headers())
            ->assertOk()
            ->assertJsonPath('body', 'Cốc men hoả biến về hàng')
            ->assertJsonPath('cta.url', 'https://gommoc.vn/coc');
        $this->getJson($session->url("updates/{$foreign->id}"), $session->headers())->assertNotFound();
    });
});
