<?php

namespace App\Modules\Payment\Port;

use InvalidArgumentException;

/**
 * PaymentRegistry — driver registry cho PaymentDriver.
 *
 * payment-manual extend('manual', ...) trong boot().
 * VNPay/MoMo extend('vnpay', ...) / extend('momo', ...) GĐ2+.
 *
 * ponytail: driver pattern tối giản — không cần full DriverManager từ Laravel
 * vì chỉ có 1 driver ở GĐ1. Thêm khi GĐ2 cần.
 */
class PaymentRegistry
{
    /** @var array<string, callable(): PaymentDriver> */
    private array $drivers = [];

    /**
     * Đăng ký driver (gọi từ payment-manual ServiceProvider::boot).
     *
     * @param  callable(): PaymentDriver  $factory
     */
    public function extend(string $key, callable $factory): void
    {
        $this->drivers[$key] = $factory;
    }

    public function driver(string $key): PaymentDriver
    {
        if (! isset($this->drivers[$key])) {
            throw new InvalidArgumentException("Payment driver '{$key}' chưa đăng ký.");
        }

        return ($this->drivers[$key])();
    }

    /** @return list<string> */
    public function availableDrivers(): array
    {
        return array_keys($this->drivers);
    }
}
