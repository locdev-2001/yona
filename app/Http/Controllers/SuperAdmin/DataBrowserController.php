<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Services\Admin\Operations\DataBrowser;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

// Xem mọi bảng dữ liệu, chỉ đọc. Bí mật và nội dung khách đã che ở DataBrowser.
class DataBrowserController extends Controller
{
    public function __construct(private readonly DataBrowser $browser) {}

    public function index(): Response
    {
        return Inertia::render('superadmin/DataBrowser', [
            'tables' => $this->browser->tables(),
        ]);
    }

    public function show(Request $request, string $table): Response
    {
        abort_unless($this->browser->exists($table), 404);

        $filters = $request->query('filter');
        $sort = $request->query('sort');
        $result = $this->browser->browse(
            $table,
            is_array($filters) ? $filters : [],
            is_string($sort) ? $sort : null,
            $request->query('direction') === 'asc' ? 'asc' : 'desc',
            max(1, (int) $request->query('page', 1)),
        );

        return Inertia::render('superadmin/DataTable', [
            'table' => $table,
            ...$result,
            'filters' => (object) $result['filters'],
            'perPage' => DataBrowser::PER_PAGE,
        ]);
    }
}
