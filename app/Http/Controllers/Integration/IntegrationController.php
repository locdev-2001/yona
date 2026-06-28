<?php

namespace App\Http\Controllers\Integration;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Trang /integrations — danh sách catalog các tích hợp có sẵn.
 *
 * Internal-first: nếu module Integration bị xóa → $cards = [] → trang render rỗng, không fatal.
 */
class IntegrationController extends Controller
{
    public function index(): Response
    {
        // ponytail: class_exists guard — xóa app/Modules/Integration/ → trang vẫn load với list rỗng
        $cards = class_exists(\App\Modules\Integration\IntegrationCatalog::class)
            ? app(\App\Modules\Integration\IntegrationCatalog::class)->cards()
            : [];

        return Inertia::render('integration/index', [
            'cards' => $cards,
        ]);
    }
}
