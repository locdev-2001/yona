<?php

use App\Models\Account;
use App\Models\Channel\Zalo;
use App\Models\Inbox;
use App\Models\SuperAdmin;
use App\Services\Admin\Operations\ChannelHealth\ChannelHealthInspector;
use App\Services\Admin\Operations\ChannelHealth\ChannelProblem;

// Trang sức khoẻ kênh: chỉ liệt kê hộp thư hỏng, lọc theo vấn đề/kênh/mức độ.
beforeEach(function () {
    $this->superAdmin = SuperAdmin::factory()->withMfa()->create();
});

it('liệt kê hộp thư Zalo mất phiên và email lỗi xác thực, bỏ qua hộp thư khoẻ', function () {
    $account = Account::factory()->create(['name' => 'Shop Mẹ Bé']);
    $healthy = Inbox::factory()->zalo()->create(['account_id' => $account->id, 'name' => 'Zalo khoẻ']);
    $lost = Inbox::factory()->zalo()->create(['account_id' => $account->id, 'name' => 'Zalo rớt']);
    $lost->channel->markState(Zalo::STATE_SESSION_LOST, 'Đăng nhập trên máy khác');
    $email = Inbox::factory()->email()->create(['account_id' => $account->id, 'name' => 'Hộp thư email']);
    $email->channel->promptReauthorization();

    $this->actingAs($this->superAdmin, 'super_admin')
        ->get('/admin/channel_health')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('superadmin/ChannelHealth', false)
            ->where('stats.total', 3)
            ->where('stats.failing', 2)
            ->where('stats.errors', 2)
            ->has('items', 2)
            ->where('items', fn ($items) => collect($items)->pluck('inboxName')->sort()->values()->all() === ['Hộp thư email', 'Zalo rớt'])
            ->where('items', fn ($items) => collect($items)->firstWhere('inboxName', 'Zalo rớt')['problem'] === 'session_lost'
                && collect($items)->firstWhere('inboxName', 'Zalo rớt')['detail'] === 'Đăng nhập trên máy khác'
                && collect($items)->firstWhere('inboxName', 'Zalo rớt')['url'] === "/admin/accounts/{$account->id}/overview")
            ->where('options.problems', fn ($options) => collect($options)->pluck('value')->sort()->values()->all() === ['reauthorization_required', 'session_lost']),
        );

    $this->actingAs($this->superAdmin, 'super_admin')
        ->get('/admin/channel_health?problem=reauthorization_required')
        ->assertInertia(fn ($page) => $page->has('items', 1)->where('items.0.inboxName', 'Hộp thư email')->where('filters.problem', 'reauthorization_required'));

    $this->actingAs($this->superAdmin, 'super_admin')
        ->get('/admin/channel_health?search=r%E1%BB%9Bt')
        ->assertInertia(fn ($page) => $page->has('items', 1)->where('items.0.inboxName', 'Zalo rớt'));

    expect($healthy->exists)->toBeTrue();
    $email->channel->reauthorized();
});

it('email có lỗi xác thực chưa tới ngưỡng là cảnh báo kèm số lần lỗi', function () {
    $inbox = Inbox::factory()->email()->create();
    $inbox->channel->authorizationError();
    $inbox->channel->authorizationError();

    $problem = app(ChannelHealthInspector::class)->inspect($inbox->fresh());

    expect($problem->code)->toBe('authorization_errors')
        ->and($problem->severity)->toBe(ChannelProblem::WARNING)
        ->and($problem->detail)->toBe('2');

    $inbox->channel->reauthorized();
});

it('hộp thư chờ quét QR là cảnh báo, không phải ngừng hoạt động', function () {
    $inbox = Inbox::factory()->zalo()->create();
    $inbox->channel->update(['state' => Zalo::STATE_QR_WAITING]);

    $item = app(ChannelHealthInspector::class)->forAccount($inbox->account)[0];

    expect($item['problem'])->toBe('awaiting_login')
        ->and($item['severity'])->toBe('warning')
        ->and($item['problemLabel'])->not->toBe('awaiting_login');
});
