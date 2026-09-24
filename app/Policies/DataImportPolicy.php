<?php

namespace App\Policies;

use App\Models\AccountUser;
use App\Models\DataImport;

// Chỉ quản trị viên
// của chính account mới xem/tạo được lần nhập dữ liệu.
final class DataImportPolicy
{
    public function __construct(private readonly AccountUser $accountUser) {}

    public function index(): bool
    {
        return $this->accountUser->isAdministrator();
    }

    public function create(): bool
    {
        return $this->index();
    }

    public function show(DataImport $dataImport): bool
    {
        return $this->index() && $dataImport->account_id === $this->accountUser->account_id;
    }
}
