<?php

use App\Modules\Payment\Adapter\Manual\ManualPaymentDriver;
use App\Modules\Payment\Adapter\Manual\ManualPaymentServiceProvider;
use App\Modules\Payment\Port\PaymentDriver;
use App\Modules\Payment\Port\PaymentRegistry;

/*
 * Bí danh tương thích ngược của module Payment: FQCN CŨ => FQCN MỚI.
 *
 * Cùng lý do và cùng vòng đời với bảng của Chat — chết ở P5, sau khi kiểm
 * `jobs` = 0 và không có `failed_jobs` mới trong 24h.
 *
 * @return array<class-string, class-string>
 */

return [
    // Cụm 7 — Modules/Integration/ giải thể
    'App\Modules\Integration\Contracts\PaymentDriver' => PaymentDriver::class,
    'App\Modules\Integration\PaymentManager' => PaymentRegistry::class,
    'App\Modules\Integration\Payment\Manual\ManualPaymentDriver' => ManualPaymentDriver::class,
    'App\Modules\Integration\Payment\Manual\ManualPaymentServiceProvider' => ManualPaymentServiceProvider::class,
];
