<?php

namespace App\Http\Controllers;

use App\Support\LandingPayload;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Arr;

/**
 * Hai trang pháp lý công khai. Nội dung nằm trọn trong `lang/{locale}/legal.php`
 * để bản dịch và bản gốc sửa cùng một chỗ; controller chỉ chọn văn bản và chỉ
 * sang văn bản còn lại, vì người đọc điều khoản gần như luôn cần cả chính sách
 * riêng tư.
 */
class LegalPagesController extends Controller
{
    private const COUNTERPART = [
        'terms' => 'privacy',
        'privacy' => 'terms',
    ];

    public function terms(): View
    {
        return $this->render('terms');
    }

    public function privacy(): View
    {
        return $this->render('privacy');
    }

    private function render(string $document): View
    {
        $counterpart = self::COUNTERPART[$document];

        return view('landing', [
            'landingConfig' => LandingPayload::make($document, [
                'meta' => trans("legal.$document.meta"),
                'legalDocument' => [
                    ...Arr::except(trans("legal.$document"), ['meta', 'updated_on']),
                    'eyebrow' => trans('legal.eyebrow'),
                    'updated' => trans('legal.updated', ['date' => trans("legal.$document.updated_on")]),
                    'related' => [
                        'heading' => trans('legal.related'),
                        'label' => trans("legal.nav.$counterpart"),
                        'href' => config("yona.{$counterpart}_url"),
                    ],
                ],
            ]),
        ]);
    }
}
