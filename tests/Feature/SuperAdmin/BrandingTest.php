<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\InstallationConfig;
use App\Models\SuperAdmin;
use App\Models\User;
use App\Services\Branding\BrandAssets;
use App\Services\Branding\BrandAssetSlot;
use App\Support\SafeSvg;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

// Super Admin đổi logo/favicon ngay trong console; mọi bề mặt đọc URL từ một
// nguồn (BrandAssets), chưa tải gì thì về tệp mặc định.

const SAFE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#1572E8"/></svg>';

function brandingUrlFor(BrandAssetSlot $slot): string
{
    app()->forgetScopedInstances();

    return app(BrandAssets::class)->url($slot);
}

beforeEach(function () {
    $this->disk = Storage::fake('public');
});

describe('Super Admin đã đăng nhập', function () {
    beforeEach(function () {
        $this->actingAs(SuperAdmin::factory()->withMfa()->create(), 'super_admin');
    });

    it('mở màn Thương hiệu với đủ bốn ô, chưa tải gì thì dùng tệp mặc định', function () {
        $this->get('/admin/branding')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('superadmin/Branding', false)
                ->where('assets.0.slot', 'logo')
                ->where('assets.0.url', config('yona.branding.logo'))
                ->where('assets.0.isCustom', false)
                ->where('assets.1.slot', 'logo_dark')
                ->where('assets.2.url', config('yona.branding.logo_thumbnail'))
                ->where('assets.3.slot', 'favicon')
                ->where('assets.3.url', '/favicon.ico')
                ->where('assets.3.accept', '.ico,.png,.svg'));
    });

    it('tải logo lên: tệp lưu theo mã băm nội dung, URL đổi khi nội dung đổi, tệp cũ bị xoá', function () {
        $this->post('/admin/branding/logo', ['file' => UploadedFile::fake()->image('logo.png', 400, 100)])
            ->assertRedirect('/admin/branding')
            ->assertSessionHas('notice');

        $firstUrl = brandingUrlFor(BrandAssetSlot::Logo);
        $firstPath = InstallationConfig::valueOf(BrandAssets::CONFIG_NAME)['logo'];
        expect($firstPath)->toMatch('#^branding/logo-[0-9a-f]{16}\.png$#');
        $this->disk->assertExists($firstPath);
        expect($firstUrl)->toEndWith($firstPath);

        $this->post('/admin/branding/logo', ['file' => UploadedFile::fake()->image('logo.png', 300, 80)])->assertRedirect();

        $secondPath = InstallationConfig::valueOf(BrandAssets::CONFIG_NAME)['logo'];
        expect($secondPath)->not->toBe($firstPath);
        expect(brandingUrlFor(BrandAssetSlot::Logo))->not->toBe($firstUrl);
        $this->disk->assertExists($secondPath);
        $this->disk->assertMissing($firstPath);
    });

    it('mọi bề mặt đọc ảnh đã tải lên: console, trang đăng nhập, dashboard', function () {
        $this->post('/admin/branding/logo_thumbnail', ['file' => UploadedFile::fake()->image('icon.png', 512, 512)])->assertRedirect();
        $this->post('/admin/branding/favicon', ['file' => UploadedFile::fake()->createWithContent('favicon.svg', SAFE_SVG)])->assertRedirect();
        $thumbnailUrl = brandingUrlFor(BrandAssetSlot::LogoThumbnail);
        $faviconUrl = brandingUrlFor(BrandAssetSlot::Favicon);

        $this->get('/admin/branding')
            ->assertInertia(fn ($page) => $page->where('superAdmin.logoThumbnail', $thumbnailUrl));

        auth('super_admin')->logout();
        $html = $this->get('/app/login')->assertOk()->getContent();
        expect($html)->toContain('<link rel="icon" href="'.$faviconUrl.'" type="image/svg+xml">')
            ->not->toContain('href="/favicon.ico"');

        $account = Account::factory()->create();
        $agent = User::factory()->create();
        AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $agent->id]);
        $this->actingAs($agent)
            ->get("/app/accounts/{$account->id}/profile/settings")
            ->assertInertia(fn ($page) => $page->where('globalConfig.logoThumbnail', $thumbnailUrl));
    });

    it('về mặc định thì xoá tệp và các bề mặt quay về tệp gốc', function () {
        $this->post('/admin/branding/favicon', ['file' => UploadedFile::fake()->image('favicon.png', 64, 64)])->assertRedirect();
        $path = InstallationConfig::valueOf(BrandAssets::CONFIG_NAME)['favicon'];

        $this->delete('/admin/branding/favicon')->assertRedirect('/admin/branding')->assertSessionHas('notice');

        $this->disk->assertMissing($path);
        expect(brandingUrlFor(BrandAssetSlot::Favicon))->toBe('/favicon.ico');
        auth('super_admin')->logout();
        expect($this->get('/app/login')->getContent())->toContain('<link rel="icon" href="/favicon.ico" sizes="any">');
    });

    it('từ chối tệp sai định dạng, quá dung lượng hoặc ô không tồn tại', function (string $slot, UploadedFile $file) {
        $this->post("/admin/branding/{$slot}", ['file' => $file])->assertSessionHasErrors('file');

        expect(InstallationConfig::valueOf(BrandAssets::CONFIG_NAME))->toBeNull();
    })->with([
        'logo dạng PDF' => fn () => ['logo', UploadedFile::fake()->create('logo.pdf', 10, 'application/pdf')],
        'favicon dạng JPG' => fn () => ['favicon', UploadedFile::fake()->image('favicon.jpg', 32, 32)],
        'favicon quá 512 KB' => fn () => ['favicon', UploadedFile::fake()->create('favicon.png', 600, 'image/png')],
        'SVG có script' => fn () => ['logo', UploadedFile::fake()->createWithContent('logo.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')],
    ]);

    it('ô không tồn tại trả 404', function () {
        $this->post('/admin/branding/banner', ['file' => UploadedFile::fake()->image('a.png')])->assertNotFound();
    });

});

it('chỉ Super Admin được đổi ảnh thương hiệu', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/admin/branding')->assertRedirect('/admin/sign_in');
    $this->post('/admin/branding/logo', ['file' => UploadedFile::fake()->image('logo.png')])->assertRedirect('/admin/sign_in');

    expect(InstallationConfig::valueOf(BrandAssets::CONFIG_NAME))->toBeNull();
});

it('SafeSvg chỉ nhận SVG thuần hình vẽ', function (string $svg, bool $isSafe) {
    expect(SafeSvg::isSafe($svg))->toBe($isSafe);
})->with([
    'hình vẽ' => [SAFE_SVG, true],
    'thuộc tính sự kiện' => ['<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>', false],
    'liên kết javascript:' => ['<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><a xlink:href=" javascript:alert(1)"><rect/></a></svg>', false],
    'nhúng HTML' => ['<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div/></foreignObject></svg>', false],
    'DTD' => ['<!DOCTYPE svg [<!ENTITY x "y">]><svg xmlns="http://www.w3.org/2000/svg"/>', false],
    'không phải SVG' => ['<html><body/></html>', false],
]);
