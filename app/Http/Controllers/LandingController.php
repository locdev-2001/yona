<?php

namespace App\Http\Controllers;

use App\Support\LandingPayload;
use Illuminate\Contracts\View\View;

/**
 * Các trang marketing tĩnh của bề mặt công khai. Trang nào cần nhận dữ liệu
 * người dùng gửi lên thì có controller riêng (xem DemoRequestsController).
 */
class LandingController extends Controller
{
    public function home(): View
    {
        return view('landing', ['landingConfig' => LandingPayload::make('home')]);
    }

    /**
     * Trang một-kênh cho Zalo cá nhân. Đây là điểm khác biệt của sản phẩm nên nó
     * cần một trang riêng để xếp hạng và để gửi link cho khách đang hỏi về Zalo,
     * thay vì một mục trong trang chủ nói về mọi thứ cùng lúc.
     */
    public function zaloPersonal(): View
    {
        return view('landing', [
            'landingConfig' => LandingPayload::make('zalo_personal', [
                'meta' => trans('landing.zalo_page.meta'),
            ]),
        ]);
    }
}
