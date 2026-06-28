<?php

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
 * Integration drivers (ZaloPersonal/Manual) KHÔNG liệt kê ở đây. Internal-first:
 * App\Modules\Integration\IntegrationServiceProvider được AppServiceProvider::register()
 * đăng ký CÓ ĐIỀU KIỆN qua class_exists() — xóa thư mục app/Modules/Integration/ thì
 * inbox/billing core vẫn boot (chỉ mất gửi-ngoài). IntegrationServiceProvider lại register
 * ZaloPersonal + Manual driver providers (gate qua config('integrations.*')).
 *
 * Metering KHÔNG phụ thuộc thứ tự provider — MeteringService là class concrete
 * (không binding interface). ChannelManager/PaymentManager bind trong Integration
 * TRƯỚC khi driver extend (cùng provider chain — callAfterResolving đảm bảo thứ tự).
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
    ProjectsServiceProvider::class,
    CrmSalesServiceProvider::class,
    BillingServiceProvider::class,
    InboxServiceProvider::class,
];
