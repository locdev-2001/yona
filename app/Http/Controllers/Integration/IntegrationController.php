<?php

namespace App\Http\Controllers\Integration;

use App\Http\Controllers\Controller;
use App\Http\ViewModels\IntegrationCatalog;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Trang /integrations — danh sách catalog các tích hợp có sẵn.
 *
 * Chỉ là một MÀN HÌNH hỏi các sổ đăng ký "có phích cắm nào, đã kết nối chưa" —
 * không phải nơi code tích hợp trú.
 */
class IntegrationController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('integration/index', [
            'cards' => app(IntegrationCatalog::class)->cards(),
        ]);
    }
}
