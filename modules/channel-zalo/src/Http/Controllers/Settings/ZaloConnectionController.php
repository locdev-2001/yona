<?php

namespace Modules\ChannelZalo\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Modules\ChannelZalo\Models\ZaloConnection;
use Modules\Identity\Enums\TenantPermission;

/**
 * F1 — Settings: Kết nối Zalo cá nhân qua QR login.
 *
 * Actions:
 *   index   → render Inertia page danh sách ZaloConnection (state badge)
 *   store   → tạo connection_id + qr_token, gọi bridge /auth/qr/start
 *   qr      → proxy /auth/qr/status (QR image + phase)
 *   promote → proxy /auth/qr/promote → state=connected, cập nhật ZaloConnection
 *   destroy → proxy /auth/logout, soft-delete ZaloConnection
 *
 * Gate: tenant.zalo.manage (TenantPermission::ZaloManage)
 * Route group: ['auth', 'workspace'] — web middleware.
 *
 * Render page: Modules.ChannelZalo.settings/zalo/index
 */
class ZaloConnectionController extends Controller
{
    /**
     * Trang settings Zalo — danh sách kết nối + trạng thái.
     */
    public function index(): Response
    {
        abort_unless(auth()->user()?->can(TenantPermission::ZaloManage->value), 403);

        $connections = ZaloConnection::orderByDesc('created_at')
            ->get(['id', 'connection_id', 'personal_uid', 'display_name', 'avatar_url', 'state', 'session_lost_reason', 'last_connected_at'])
            ->map(fn (ZaloConnection $c) => [
                'id'                  => $c->id,
                'connection_id'       => $c->connection_id,
                'personal_uid'        => $c->personal_uid,
                'display_name'        => $c->display_name,
                'avatar_url'          => $c->avatar_url,
                'state'               => $c->state,
                'session_lost_reason' => $c->session_lost_reason,
                'last_connected_at'   => $c->last_connected_at?->toISOString(),
            ]);

        return Inertia::render('Modules.ChannelZalo.settings/zalo/index', [
            'connections' => $connections,
        ]);
    }

    /**
     * Tạo connection slot mới: cấp connection_id + qr_token, gọi bridge /auth/qr/start.
     */
    public function store(): JsonResponse
    {
        abort_unless(auth()->user()?->can(TenantPermission::ZaloManage->value), 403);

        $connectionId  = ZaloConnection::nextConnectionId();
        $qrToken       = Str::uuid()->toString();
        $workspaceId   = $this->currentWorkspaceId();

        // Insert qua pgsql_privileged (bypass RLS) — sequence GRANT đủ
        DB::connection('pgsql_privileged')->table('zalo_connections')->insert([
            'workspace_id'  => $workspaceId,
            'connection_id' => $connectionId,
            'state'         => 'qr_waiting',
            'lock_version'  => 0,
            'last_qr_at'    => now(),
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        $connection = ZaloConnection::where('connection_id', $connectionId)->firstOrFail();

        // Gọi bridge để bắt đầu QR login
        $bridgeResponse = Http::asJson()
            ->withHeader('X-Bridge-UI-Secret', config('services.zalo_bridge.ui_secret', ''))
            ->timeout(10)
            ->post(config('services.zalo_bridge.url', 'http://127.0.0.1:3710').'/auth/qr/start', [
                'qr_token' => $qrToken,
                'bot_id'   => $connectionId,
            ]);

        if (! $bridgeResponse->successful()) {
            $connection->delete();

            return response()->json([
                'ok'      => false,
                'message' => 'Bridge không khởi động được QR: '.($bridgeResponse->json('message') ?? 'unknown'),
            ], 502);
        }

        return response()->json([
            'ok'            => true,
            'connection_id' => $connectionId,
            'qr_token'      => $qrToken,
        ]);
    }

    /**
     * Proxy /auth/qr/status từ bridge (QR image + phase).
     */
    public function qr(Request $request): JsonResponse
    {
        abort_unless(auth()->user()?->can(TenantPermission::ZaloManage->value), 403);

        $qrToken = $request->string('qr_token')->toString();
        if (! $qrToken) {
            return response()->json(['ok' => false, 'message' => 'qr_token required'], 400);
        }

        $bridgeResponse = Http::asJson()
            ->withHeader('X-Bridge-UI-Secret', config('services.zalo_bridge.ui_secret', ''))
            ->timeout(8)
            ->get(config('services.zalo_bridge.url', 'http://127.0.0.1:3710').'/auth/qr/status', [
                'qr_token' => $qrToken,
            ]);

        return response()->json($bridgeResponse->json(), $bridgeResponse->status());
    }

    /**
     * Promote QR slot → connection: bridge /auth/qr/promote → update ZaloConnection state=connected.
     */
    public function promote(Request $request): JsonResponse
    {
        abort_unless(auth()->user()?->can(TenantPermission::ZaloManage->value), 403);

        $validated = $request->validate([
            'connection_id' => 'required|integer',
            'qr_token'      => 'required|string',
        ]);

        $connection = ZaloConnection::where('connection_id', $validated['connection_id'])
            ->where('workspace_id', $this->currentWorkspaceId())
            ->firstOrFail();

        $bridgeResponse = Http::asJson()
            ->withHeader('X-Bridge-UI-Secret', config('services.zalo_bridge.ui_secret', ''))
            ->timeout(10)
            ->post(config('services.zalo_bridge.url', 'http://127.0.0.1:3710').'/auth/qr/promote', [
                'qr_token'      => $validated['qr_token'],
                'connection_id' => $validated['connection_id'],
            ]);

        if (! $bridgeResponse->successful()) {
            return response()->json([
                'ok'      => false,
                'message' => $bridgeResponse->json('message') ?? 'promote_failed',
            ], $bridgeResponse->status());
        }

        $connection->updateState('connected');

        return response()->json(['ok' => true, 'connection_id' => $validated['connection_id']]);
    }

    /**
     * Logout: bridge /auth/logout → soft-delete ZaloConnection.
     */
    public function destroy(ZaloConnection $zaloConnection): JsonResponse
    {
        abort_unless(auth()->user()?->can(TenantPermission::ZaloManage->value), 403);

        if ($zaloConnection->workspace_id !== $this->currentWorkspaceId()) {
            abort(403);
        }

        Http::asJson()
            ->withHeader('X-Bridge-UI-Secret', config('services.zalo_bridge.ui_secret', ''))
            ->timeout(8)
            ->post(config('services.zalo_bridge.url', 'http://127.0.0.1:3710').'/auth/logout', [
                'connection_id' => $zaloConnection->connection_id,
            ]);
        // ponytail: ignore bridge logout error — soft-delete vẫn chạy

        $zaloConnection->delete();

        return response()->json(['ok' => true]);
    }

    private function currentWorkspaceId(): string
    {
        return currentWorkspace()->id;
    }
}
