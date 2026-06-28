<?php

namespace App\Http\Controllers\Integration;

use App\Enums\TenantPermission;
use App\Http\Controllers\Controller;
use App\Models\ZaloConnection;
use App\Services\ZaloConversationMerger;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

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
 * Render page: integration/zalo/index
 */
class ZaloConnectionController extends Controller
{
    public function __construct(private readonly ZaloConversationMerger $conversationMerger) {}

    /**
     * Trang settings Zalo — danh sách kết nối + trạng thái.
     */
    public function index(): Response
    {
        abort_unless(auth()->user()?->can(TenantPermission::ZaloManage->value), 403);

        $connections = ZaloConnection::orderByDesc('created_at')
            ->get(['id', 'connection_id', 'personal_uid', 'display_name', 'avatar_url', 'state', 'session_lost_reason', 'last_connected_at'])
            ->map(fn (ZaloConnection $c) => [
                'id' => $c->id,
                'connection_id' => $c->connection_id,
                'personal_uid' => $c->personal_uid,
                'display_name' => $c->display_name,
                'avatar_url' => $c->avatar_url,
                'state' => $c->state,
                'session_lost_reason' => $c->session_lost_reason,
                'last_connected_at' => $c->last_connected_at?->toISOString(),
            ]);

        return Inertia::render('integration/zalo/index', [
            'connections' => $connections,
        ]);
    }

    /**
     * Tạo connection slot mới: cấp connection_id + qr_token, gọi bridge /auth/qr/start.
     */
    public function store(): JsonResponse
    {
        abort_unless(auth()->user()?->can(TenantPermission::ZaloManage->value), 403);

        $connectionId = ZaloConnection::nextConnectionId();
        $qrToken = Str::uuid()->toString();
        $workspaceId = $this->currentWorkspaceId();

        // Insert qua pgsql_privileged (bypass RLS) — sequence GRANT đủ
        DB::connection('pgsql_privileged')->table('zalo_connections')->insert([
            'workspace_id' => $workspaceId,
            'connection_id' => $connectionId,
            'state' => 'qr_waiting',
            'lock_version' => 0,
            'last_qr_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $connection = ZaloConnection::where('connection_id', $connectionId)->firstOrFail();

        // Gọi bridge để bắt đầu QR login
        try {
            $bridgeResponse = Http::asJson()
                ->withHeader('X-Bridge-UI-Secret', config('services.zalo_bridge.ui_secret', ''))
                ->timeout(10)
                ->post(config('services.zalo_bridge.url', 'http://127.0.0.1:3710').'/auth/qr/start', [
                    'qr_token' => $qrToken,
                    'bot_id' => $connectionId,
                ]);
        } catch (ConnectionException) {
            $connection->delete();

            return $this->bridgeDownResponse();
        }

        if (! $bridgeResponse->successful()) {
            $connection->delete();

            return response()->json([
                'ok' => false,
                'message' => 'Bridge không khởi động được QR: '.($bridgeResponse->json('message') ?? 'unknown'),
            ], 502);
        }

        return response()->json([
            'ok' => true,
            'connection_id' => $connectionId,
            'qr_token' => $qrToken,
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

        try {
            $bridgeResponse = Http::asJson()
                ->withHeader('X-Bridge-UI-Secret', config('services.zalo_bridge.ui_secret', ''))
                ->timeout(8)
                ->get(config('services.zalo_bridge.url', 'http://127.0.0.1:3710').'/auth/qr/status', [
                    'qr_token' => $qrToken,
                ]);
        } catch (ConnectionException) {
            return $this->bridgeDownResponse();
        }

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
            'qr_token' => 'required|string',
        ]);

        $connection = ZaloConnection::where('connection_id', $validated['connection_id'])
            ->where('workspace_id', $this->currentWorkspaceId())
            ->firstOrFail();

        try {
            $bridgeResponse = Http::asJson()
                ->withHeader('X-Bridge-UI-Secret', config('services.zalo_bridge.ui_secret', ''))
                ->timeout(10)
                ->post(config('services.zalo_bridge.url', 'http://127.0.0.1:3710').'/auth/qr/promote', [
                    'qr_token' => $validated['qr_token'],
                    'connection_id' => $validated['connection_id'],
                ]);
        } catch (ConnectionException) {
            return $this->bridgeDownResponse();
        }

        if (! $bridgeResponse->successful()) {
            return response()->json([
                'ok' => false,
                'message' => $bridgeResponse->json('message') ?? 'promote_failed',
            ], $bridgeResponse->status());
        }

        // Persist the account profile the bridge returns (uid/name/avatar) so the
        // connection list shows the real account, not just "#id". Privileged connection
        // mirrors updateState() — RLS-safe regardless of caller context.
        $data = $bridgeResponse->json();
        $profile = array_filter([
            'personal_uid' => $data['personal_uid'] ?? null,
            'display_name' => $data['display_name'] ?? null,
            'avatar_url' => $data['avatar'] ?? null,
        ], fn ($v) => $v !== null && $v !== '');
        if ($profile !== []) {
            DB::connection('pgsql_privileged')->transaction(function () use ($connection, $profile) {
                // Dedup connections cùng (workspace_id, personal_uid): soft-delete các slot khác
                // và gộp conversation của chúng vào slot hiện tại — giải phóng partial-unique
                // slot VÀ tránh thread fork (cùng peer xuất hiện 2 lần) sau reconnect.
                if (isset($profile['personal_uid'])) {
                    // Gồm CẢ connection đã soft-delete cùng uid: nếu chỉ lấy active thì một
                    // connection cũ đã trashed (kèm conversation 34 tin) sẽ không được gộp → thread
                    // vẫn fork + thiếu tin. Merge idempotent nên gộp lại bản đã trashed là an toàn.
                    $priorConnections = DB::connection('pgsql_privileged')
                        ->table('zalo_connections')
                        ->where('workspace_id', $connection->workspace_id)
                        ->where('personal_uid', $profile['personal_uid'])
                        ->where('id', '!=', $connection->id)
                        ->get(['connection_id']);

                    if ($priorConnections->isNotEmpty()) {
                        DB::connection('pgsql_privileged')
                            ->table('zalo_connections')
                            ->where('workspace_id', $connection->workspace_id)
                            ->where('personal_uid', $profile['personal_uid'])
                            ->where('id', '!=', $connection->id)
                            ->whereNull('deleted_at')
                            ->update([
                                'state' => 'disconnected',
                                'deleted_at' => now(),
                                'updated_at' => now(),
                            ]);

                        foreach ($priorConnections as $prior) {
                            $this->conversationMerger->mergeConnection(
                                $connection->workspace_id,
                                (int) $prior->connection_id,
                                (int) $connection->connection_id,
                            );
                        }
                    }
                }

                DB::connection('pgsql_privileged')
                    ->table('zalo_connections')
                    ->where('id', $connection->id)
                    ->update($profile);
            });
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

        // ponytail: ignore bridge logout error (incl. bridge down) — soft-delete vẫn chạy
        try {
            Http::asJson()
                ->withHeader('X-Bridge-UI-Secret', config('services.zalo_bridge.ui_secret', ''))
                ->timeout(8)
                ->post(config('services.zalo_bridge.url', 'http://127.0.0.1:3710').'/auth/logout', [
                    'connection_id' => $zaloConnection->connection_id,
                ]);
        } catch (ConnectionException) {
            // bridge không chạy — vẫn soft-delete connection
        }

        $zaloConnection->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * Phản hồi thân thiện khi bridge Node (port 3710) không chạy — tránh lòi cURL thô ra UI.
     */
    private function bridgeDownResponse(): JsonResponse
    {
        return response()->json([
            'ok' => false,
            'message' => 'Dịch vụ kết nối Zalo (bridge) chưa chạy ở cổng 3710. Khởi động bridge rồi thử lại.',
        ], 503);
    }

    private function currentWorkspaceId(): string
    {
        return currentWorkspace()->id;
    }
}
