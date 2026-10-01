<?php

use App\Models\Account;
use App\Models\Inbox;
use App\Models\InstallationConfig;
use App\Models\Message;
use App\Models\SuperAdmin;
use App\Models\User;
use App\Services\Admin\Operations\DataBrowser;
use App\Services\Admin\Operations\SensitiveFields;
use Illuminate\Support\Facades\DB;

// Trình duyệt dữ liệu chỉ đọc: thấy mọi bảng, không bao giờ thấy bí mật hay nội dung khách.
beforeEach(function () {
    $this->superAdmin = SuperAdmin::factory()->withMfa()->create();
});

it('liệt kê bảng kèm số dòng, ẩn bảng phiên và token đặt lại mật khẩu', function () {
    Account::factory()->count(3)->create();

    $this->actingAs($this->superAdmin, 'super_admin')
        ->get('/admin/data')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('superadmin/DataBrowser', false)
            ->where('tables', fn ($tables) => collect($tables)->firstWhere('name', 'accounts')['rows'] === 3
                && collect($tables)->pluck('name')->intersect(['sessions', 'password_reset_tokens', 'failed_jobs'])->isEmpty()
                && collect($tables)->pluck('name')->contains('super_admin_audit_logs')),
        );

    $this->get('/admin/data/sessions')->assertNotFound();
    $this->get('/admin/data/khong_co_bang')->assertNotFound();
});

it('che cột bí mật, trường mã hoá và nội dung tin nhắn của khách', function () {
    $user = User::factory()->create(['name' => 'Agent A']);
    $user->forceFill(['otp_secret' => 'JBSWY3DPEHPK3PXP'])->save();
    $inbox = Inbox::factory()->email()->create();
    $inbox->channel->forceFill(['imap_password' => 'mat-khau-imap'])->save();
    $message = Message::factory()->create(['content' => 'Số CCCD của tôi là 0123456789']);

    $this->actingAs($this->superAdmin, 'super_admin');

    $this->get("/admin/data/users?filter[id]={$user->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('superadmin/DataTable', false)
            ->where('rows.0.name', 'Agent A')
            ->where('rows.0.password', SensitiveFields::MASK)
            ->where('rows.0.pubsub_token', SensitiveFields::MASK)
            ->where('rows.0.otp_secret', SensitiveFields::MASK)
            ->where('columns', fn ($columns) => collect($columns)->firstWhere('name', 'otp_secret')['masked'] === 'secret'),
        );

    $emailPage = $this->get("/admin/data/channel_email?filter[id]={$inbox->channel_id}");
    $emailPage->assertInertia(fn ($page) => $page->where('rows.0.imap_password', SensitiveFields::MASK));
    expect($emailPage->getContent())->not->toContain('mat-khau-imap');

    $messagePage = $this->get("/admin/data/messages?filter[id]={$message->id}");
    $messagePage->assertInertia(fn ($page) => $page
        ->where('rows.0.content', DataBrowser::PERSONAL_MASK)
        ->where('columns', fn ($columns) => collect($columns)->firstWhere('name', 'content')['masked'] === 'personal'));
    expect($messagePage->getContent())->not->toContain('0123456789');
});

it('che giá trị của dòng cấu hình có tên khoá bí mật', function () {
    InstallationConfig::query()->create(['name' => 'MAILER_SMTP_PASSWORD', 'value' => 'smtp-bi-mat']);
    InstallationConfig::query()->create(['name' => 'INSTALLATION_NAME', 'value' => 'Yona']);

    $response = $this->actingAs($this->superAdmin, 'super_admin')->get('/admin/data/installation_configs?sort=name&direction=asc');

    $response->assertInertia(fn ($page) => $page
        ->where('rows', fn ($rows) => collect($rows)->firstWhere('name', 'MAILER_SMTP_PASSWORD')['serialized_value'] === SensitiveFields::MASK
            && str_contains(collect($rows)->firstWhere('name', 'INSTALLATION_NAME')['serialized_value'], 'Yona')));
    expect($response->getContent())->not->toContain('smtp-bi-mat');
});

it('không lọc hay sắp xếp được theo cột đã che (không dò được bí mật)', function () {
    $user = User::factory()->create();

    $this->actingAs($this->superAdmin, 'super_admin')
        ->get("/admin/data/users?filter[password]=x&filter[id]={$user->id}&sort=password")
        ->assertInertia(fn ($page) => $page
            ->has('rows', 1)
            ->where('filters', ['id' => (string) $user->id])
            ->where('sort', 'id'));
});

it('lọc chữ khớp một phần, sắp xếp và phân trang', function () {
    Account::factory()->create(['name' => 'Tiệm Trà']);
    Account::factory()->create(['name' => 'Tiệm Bánh']);
    Account::factory()->create(['name' => 'Nhà sách']);

    $this->actingAs($this->superAdmin, 'super_admin')
        ->get('/admin/data/accounts?filter[name]=ti%E1%BB%87m&sort=name&direction=asc')
        ->assertInertia(fn ($page) => $page
            ->where('rows', fn ($rows) => collect($rows)->pluck('name')->all() === ['Tiệm Bánh', 'Tiệm Trà'])
            ->where('hasMore', false)
            ->where('page', 1));
});

it('không có route ghi nào cho dữ liệu thô', function () {
    $account = Account::factory()->create(['name' => 'Giữ nguyên']);

    $this->actingAs($this->superAdmin, 'super_admin');
    $this->post('/admin/data/accounts', ['name' => 'x'])->assertStatus(405);
    $this->delete('/admin/data/accounts')->assertStatus(405);

    expect(DB::table('accounts')->where('id', $account->id)->value('name'))->toBe('Giữ nguyên');
});
