<?php

namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Models\QuickReply;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * P07 — canned replies CRUD (channel-agnostic). Mọi member active dùng/quản lý
 * (SME nhỏ — YAGNI permission riêng; RLS + workspace middleware đã scope).
 * Placeholder {ten_khach} do composer FE thay lúc chèn.
 */
class QuickReplyController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            QuickReply::orderBy('title')->get(['id', 'title', 'body'])
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $quickReply = QuickReply::create($validated + ['created_by' => auth()->id()]);

        return response()->json($quickReply, 201);
    }

    public function update(Request $request, QuickReply $quickReply): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $quickReply->update($validated);

        return response()->json($quickReply);
    }

    public function destroy(QuickReply $quickReply): JsonResponse
    {
        $quickReply->delete();

        return response()->json(['ok' => true]);
    }
}
