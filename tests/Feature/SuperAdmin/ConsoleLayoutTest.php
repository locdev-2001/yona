<?php

use App\Models\SuperAdmin;
use Illuminate\Support\Facades\App;

// Khung console nhận thanh bên theo vùng chức năng, chữ dịch sẵn và người đang
// đăng nhập từ SuperAdminInertia, không phải từ từng controller.

beforeEach(function () {
    $this->superAdmin = SuperAdmin::factory()->withMfa()->create(['name' => 'Lộc Admin']);
    $this->actingAs($this->superAdmin, 'super_admin');
});

it('chia sẻ thanh bên theo nhóm chức năng với công cụ ngoài mở tab mới', function () {
    App::setLocale('vi');

    $this->get('/admin/instance_status')
        ->assertOk()
        ->assertInertia(function ($page) {
            $groups = collect($page->toArray()['props']['superAdmin']['navGroups']);

            expect($groups->pluck('key')->all())->toBe([
                'overview', 'customers', 'channels', 'data', 'content', 'integrations', 'config', 'security', 'tools',
            ]);
            expect($groups->firstWhere('key', 'channels')['label'])->toBe('Kênh & hệ thống');

            $urls = $groups->flatMap(fn (array $group) => array_column($group['items'], 'url'));
            expect($urls->all())->toContain(
                '/admin', '/admin/accounts', '/admin/users', '/admin/channel_health', '/admin/instance_status',
                '/admin/data', '/admin/sticker_packs', '/admin/agent_bots', '/admin/platform_apps', '/admin/access_tokens',
                '/admin/app_config', '/admin/installation_configs', '/admin/audit_logs',
                '/admin/impersonations', '/horizon', '/pulse', '/logs', 'https://dash.yona.vn',
            );

            $tools = $groups->firstWhere('key', 'tools')['items'];
            expect(collect($tools)->every(fn (array $item) => ($item['external'] ?? false) === true))->toBeTrue();

            // "Cài đặt" chỉ là danh sách lặp lại các mục của Cấu hình ứng dụng: không còn ở thanh bên.
            expect($urls->all())->not->toContain('/admin/settings');

            // Mục con giữ cho bảng lệnh, nhãn tiếng Việt và tên riêng đúng hoa thường.
            $appConfig = collect($groups->firstWhere('key', 'config')['items'])->firstWhere('key', 'app_config');
            expect($appConfig['children'][0])->toMatchArray(['url' => '/admin/app_config?config=general', 'label' => 'Chung']);
            expect(collect($appConfig['children'])->pluck('label')->all())->toContain('TikTok', 'WhatsApp Embedded');

            // Nhóm một mục cùng tên với mục thì không in nhãn nhóm.
            expect($groups->firstWhere('key', 'overview')['label'])->toBe('')
                ->and($groups->firstWhere('key', 'overview')['items'][0]['label'])->toBe('Tổng quan');
        });
});

it('chia sẻ chữ của khung, đường dẫn tìm kiếm và người đang đăng nhập', function () {
    App::setLocale('vi');

    $this->get('/admin/settings?foo=1')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('superAdmin.labels.logout', 'Đăng xuất')
            ->where('superAdmin.dictionary.filters.suspended', 'Tạm khoá')
            ->where('superAdmin.searchUrl', '/admin/api/search')
            ->where('superAdmin.currentUser.id', $this->superAdmin->id)
            ->where('superAdmin.currentUser.name', 'Lộc Admin')
            ->where('superAdmin.currentUser.email', $this->superAdmin->email)
            ->where('superAdmin.currentPath', '/admin/settings')
            ->where('superAdmin.currentUrl', '/admin/settings?foo=1'));
});

it('màn đăng nhập vẫn có chữ của khung nhưng chưa có người dùng', function () {
    auth('super_admin')->logout();

    $this->get('/admin/sign_in')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('superAdmin.labels.login_submit')
            ->where('superAdmin.currentUser', null));
});

it('bản dịch tiếng Anh có đủ khoá chữ như tiếng Việt', function () {
    expect(array_keys(trans('admin_layout.labels', [], 'en')))->toBe(array_keys(trans('admin_layout.labels', [], 'vi')))
        ->and(array_keys(trans('admin_layout.nav', [], 'en')))->toBe(array_keys(trans('admin_layout.nav', [], 'vi')))
        ->and(array_keys(trans('admin_layout.groups', [], 'en')))->toBe(array_keys(trans('admin_layout.groups', [], 'vi')))
        ->and(array_keys(trans('admin_layout.filters', [], 'en')))->toBe(array_keys(trans('admin_layout.filters', [], 'vi')))
        ->and(array_keys(trans('admin_layout.attributes', [], 'en')))->toBe(array_keys(trans('admin_layout.attributes', [], 'vi')));
});
