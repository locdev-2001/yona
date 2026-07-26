<?php

use App\Modules\Automation\AutomationServiceProvider;
use App\Modules\Chat\Adapter\Widget\WidgetServiceProvider;
use App\Modules\Chat\Adapter\ZaloPersonal\ZaloPersonalServiceProvider;
use App\Modules\Chat\ChatServiceProvider;
use App\Modules\Identity\IdentityModuleServiceProvider;
use App\Modules\Payment\PaymentServiceProvider;
use App\Providers\AnnouncementsServiceProvider;
use App\Providers\AppServiceProvider;
use App\Providers\BillingServiceProvider;
use App\Providers\CrmSalesServiceProvider;
use App\Providers\EmailServiceProvider;
use App\Providers\HorizonServiceProvider;
use App\Providers\IdentityServiceProvider;
use App\Providers\InboxServiceProvider;
use App\Providers\MorphMapServiceProvider;
use App\Providers\ProjectsServiceProvider;
use App\Providers\SharedServiceProvider;
use App\Providers\TelescopeServiceProvider;
use App\Providers\TenancyServiceProvider;

/*
 * Core feature providers — always on, no config gate (nguyên tắc #4: core không tắt được).
 *
 * Phích cắm kênh/thanh toán khai báo thẳng ở đây, không qua cổng class_exists nào:
 * mỗi provider tự tắt bên trong mình qua config('integrations.*'). Cổng class_exists
 * cũ trả false khi FQCN đổi mà quên sửa, rồi bỏ qua provider trong im lặng.
 *
 * Thứ tự KHÔNG quan trọng với sổ đăng ký: driver cắm vào qua callAfterResolving nên
 * lúc nào sổ được dựng thì lúc đó driver được thêm, bất kể ai khai báo trước.
 */
return [
    AppServiceProvider::class,
    HorizonServiceProvider::class,
    TelescopeServiceProvider::class,
    MorphMapServiceProvider::class,
    TenancyServiceProvider::class,
    IdentityServiceProvider::class,
    SharedServiceProvider::class,
    EmailServiceProvider::class,
    AnnouncementsServiceProvider::class,
    AutomationServiceProvider::class,
    ProjectsServiceProvider::class,
    CrmSalesServiceProvider::class,
    BillingServiceProvider::class,
    InboxServiceProvider::class,
    // Chức năng nhắn tin: lõi, luôn bật. Nhận dần phần chat của Integration theo
    // từng cụm di dời của P3 — phải đứng TRƯỚC provider của mọi phích cắm kênh.
    // Tầng định danh nằm dưới Chat — đăng ký trước để Chat luôn có cổng.
    IdentityModuleServiceProvider::class,
    ChatServiceProvider::class,
    // Kênh nội bộ: đế của chat, luôn bật — KHÔNG gate qua config như phích cắm ngoài.
    WidgetServiceProvider::class,
    // Phích cắm ngoài: tự tắt bên trong provider của mình qua config('integrations.*'),
    // không cần cổng nào ở đây.
    ZaloPersonalServiceProvider::class,
    PaymentServiceProvider::class,
];
