<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Services\Admin\Metrics\DashboardLayout;
use App\Services\Admin\Metrics\WidgetRegistry;
use App\Services\Admin\Metrics\WidgetSize;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

// Bố cục Tổng quan của super admin đang đăng nhập. Ô không có trong danh sách
// là ô đang ẩn; xoá bố cục là quay về mặc định.
class DashboardLayoutController extends Controller
{
    public function __construct(
        private readonly DashboardLayout $layout,
        private readonly WidgetRegistry $registry,
    ) {}

    public function show(Request $request): JsonResponse
    {
        return $this->respond($this->layout->for($request->user('super_admin')));
    }

    public function update(Request $request): JsonResponse
    {
        $input = $request->validate([
            'layout' => ['present', 'array', 'max:'.count($this->registry->keys())],
            'layout.*' => ['required', 'array:key,size'],
            'layout.*.key' => ['required', 'string', 'distinct', Rule::in($this->registry->keys())],
            'layout.*.size' => ['required', 'string', Rule::in(WidgetSize::values())],
        ]);

        return $this->respond($this->layout->save($request->user('super_admin'), $input['layout']));
    }

    public function destroy(Request $request): JsonResponse
    {
        return $this->respond($this->layout->reset($request->user('super_admin')));
    }

    /** @param list<array{key: string, size: string}> $layout */
    private function respond(array $layout): JsonResponse
    {
        return response()->json(['layout' => $layout]);
    }
}
