<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Services\Admin\Operations\StorageUsage;
use Inertia\Inertia;
use Inertia\Response;

// Dung lượng tệp: tổng hệ thống, đĩa còn trống, xếp hạng account chiếm nhiều nhất.
class StorageUsageController extends Controller
{
    public function __construct(private readonly StorageUsage $usage) {}

    public function index(): Response
    {
        return Inertia::render('superadmin/StorageUsage', [
            ...$this->usage->overview(),
            'categories' => StorageUsage::CATEGORIES,
            'limit' => StorageUsage::RANKING_LIMIT,
        ]);
    }
}
