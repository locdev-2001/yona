{{-- Mọi 404 ngoài mặt tiền API (route không tồn tại, abort(404), bản ghi không
     có) dùng khuôn bề mặt công khai: nav, footer, lối về trang chủ và đăng nhập.
     `/api/*` và `/public/api/*` không tới đây, bootstrap/app.php trả JSON cho
     chúng. `data-page="not_found"` trên <body> là dấu mà deploy.sh dò để biết
     nginx có đang đè trang này bằng trang 404 của nó hay không. --}}
@include('landing', [
    'landingConfig' => \App\Support\LandingPayload::make('not_found', [
        'meta' => trans('error_pages.not_found.meta'),
        'notFound' => trans('error_pages.not_found'),
    ]),
])
