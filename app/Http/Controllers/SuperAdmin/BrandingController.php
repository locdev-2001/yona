<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Services\Branding\BrandAssets;
use App\Services\Branding\BrandAssetSlot;
use App\Support\SuperAdminArea;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

// Logo, biểu tượng và favicon của cả bản cài đặt: tải lên ở đây thay vì sửa tệp
// mã nguồn rồi deploy.
class BrandingController extends Controller
{
    public function __construct(private readonly BrandAssets $brandAssets) {}

    public function show(): Response
    {
        return Inertia::render('superadmin/Branding', [
            'assets' => array_map(fn (BrandAssetSlot $slot) => [
                'slot' => $slot->value,
                'title' => __("admin_layout.branding.slots.{$slot->value}.title"),
                'description' => __("admin_layout.branding.slots.{$slot->value}.description"),
                'url' => $this->brandAssets->url($slot),
                'isCustom' => $this->brandAssets->isCustom($slot),
                'accept' => implode(',', array_map(fn (string $extension) => ".{$extension}", $slot->extensions())),
                'requirements' => __('admin_layout.branding.requirements', [
                    'formats' => strtoupper(implode(', ', array_diff($slot->extensions(), ['jpeg']))),
                    'size' => $this->readableSize($slot->maxKilobytes()),
                ]),
            ], BrandAssetSlot::cases()),
            'strings' => (array) __('admin_layout.branding.page'),
        ]);
    }

    public function update(Request $request, string $slot): RedirectResponse
    {
        $brandSlot = $this->slot($slot);
        $request->validate(['file' => $brandSlot->uploadRules()]);

        $this->brandAssets->store($brandSlot, $request->file('file'));

        return redirect(SuperAdminArea::url('branding'))->with('notice', __('admin_layout.branding.flash.updated'));
    }

    public function destroy(string $slot): RedirectResponse
    {
        $this->brandAssets->reset($this->slot($slot));

        return redirect(SuperAdminArea::url('branding'))->with('notice', __('admin_layout.branding.flash.reset'));
    }

    private function slot(string $slot): BrandAssetSlot
    {
        return BrandAssetSlot::tryFrom($slot) ?? abort(404);
    }

    private function readableSize(int $kilobytes): string
    {
        return $kilobytes >= 1024 ? ($kilobytes / 1024).' MB' : "{$kilobytes} KB";
    }
}
