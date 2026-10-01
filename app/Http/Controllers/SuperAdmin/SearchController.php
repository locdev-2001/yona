<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Services\Admin\Operations\GlobalSearch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// API tìm nhanh cho bảng lệnh (Ctrl+K) của console.
class SearchController extends Controller
{
    private const MAX_QUERY_LENGTH = 100;

    public function index(Request $request, GlobalSearch $search): JsonResponse
    {
        $query = $request->query('q');
        $query = is_string($query) ? mb_substr(trim($query), 0, self::MAX_QUERY_LENGTH) : '';

        return response()->json(['data' => $search->search($query)]);
    }
}
