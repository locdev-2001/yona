<?php

namespace App\Http\Controllers\Integration;

use App\Enums\TenantPermission;
use App\Http\Controllers\Controller;
use App\Models\ZaloConnection;
use App\Services\Zalo\PromoteAccountBinder;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

/**
 * F1 — Settings: Kết nối Zalo cá nhân qua QR login.
 *
 * Actions:
 *   index   → render Inertia page danh sách ZaloConnection (state badge)
 *   store   → tạo connection_id + qr_token, gọi bridge /auth/qr/start
 *   qr      → proxy /auth/qr/status (QR image + phase)
 *   promote → proxy /auth/qr/promote → so expected_account_uid, PromoteAccountBinder
 *             gắn slot vào channel_account (P04, xem class đó cho chi tiết transaction)
 *   destroy → proxy /auth/logout, soft-delete ZaloConnection
 *
 * Gate: tenant.zalo.manage (TenantPermission::ZaloManage)
 * Route group: ['auth', 'workspace'] — web middleware.
 *
 * Render page: integration/zalo/index
 */
class ZaloConnectionController extends Controller
{
    public function __construct(private readonly PromoteAccountBinder $accountBinder) {}

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

        // P10 [d]: insert qua connection MẶC ĐỊNH — request đã bind tenant (RLS
        // session var set), GRANT bảng + sequence đủ. 1 session cho cả flow.
        DB::table('zalo_connections')->insert([
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
     * Promote QR slot → connection: bridge /auth/qr/promote → so getOwnId() với
     * expected_account_uid (FE gửi khi reconnect account đã tồn tại) → mismatch
     * fail-closed 409 (KHÔNG bind, logout slot mới); khớp/first-connect →
     * PromoteAccountBinder transaction (P04).
     */
    public function promote(Request $request): JsonResponse
    {
        abort_unless(auth()->user()?->can(TenantPermission::ZaloManage->value), 403);

        $validated = $request->validate([
            'connection_id' => 'required|integer',
            'qr_token' => 'required|string',
            'expected_account_uid' => 'nullable|string',
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
                    // P11/B1: bind connection→workspace tại bridge (slot.workspaceId) —
                    // từ SESSION đã auth (currentWorkspace), KHÔNG từ connection row.
                    // Dispatcher /zca verify token-từ-session dựa trên binding này.
                    'workspace_id' => $this->currentWorkspaceId(),
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

        $data = $bridgeResponse->json();
        $accountUid = $data['personal_uid'] ?? null;
        $expectedUid = $validated['expected_account_uid'] ?? null;

        if ($expectedUid !== null && $accountUid !== null && $expectedUid !== $accountUid) {
            $this->logoutBridge($validated['connection_id']);

            return response()->json([
                'ok' => false,
                'error_code' => 'zalo_account_mismatch',
                'message' => 'Đã quét nhầm tài khoản Zalo khác. Vui lòng quét đúng tài khoản cần đăng nhập lại.',
            ], 409);
        }

        $profile = array_filter([
            'personal_uid' => $accountUid,
            'display_name' => $data['display_name'] ?? null,
            'avatar_url' => $data['avatar'] ?? null,
        ], fn ($v) => $v !== null && $v !== '');

        if ($accountUid !== null) {
            try {
                $this->accountBinder->bind($connection, $accountUid, $profile);
            } catch (Throwable $e) {
                // Bridge đã promote nhưng DB transaction throw — logout slot mới
                // (idempotent) để KHÔNG mồ côi 1 slot 'connected' không thuộc account nào.
                report($e);
                $this->logoutBridge($validated['connection_id']);

                return response()->json([
                    'ok' => false,
                    'message' => 'Không gắn được tài khoản Zalo — vui lòng thử lại.',
                ], 500);
            }
        } elseif ($profile !== []) {
            // Bridge không trả personal_uid (hiếm) — fallback cập nhật state, KHÔNG bind account.
            // P10 [d]: CẢ CỤM promote đi 1 session mặc định (binder đã default) — né treo chéo.
            DB::table('zalo_connections')->where('id', $connection->id)->update($profile);
            $connection->updateState('connected', privileged: false);
        } else {
            $connection->updateState('connected', privileged: false);
        }

        return response()->json(['ok' => true, 'connection_id' => $validated['connection_id']]);
    }

    /**
     * Logout slot ở bridge (idempotent — an toàn gọi khi slot đã logged out/không tồn tại).
     * Dùng bởi promote() (mismatch/cleanup-on-fail) và destroy().
     */
    private function logoutBridge(int $connectionId): void
    {
        try {
            Http::asJson()
                ->withHeader('X-Bridge-UI-Secret', config('services.zalo_bridge.ui_secret', ''))
                ->timeout(8)
                ->post(config('services.zalo_bridge.url', 'http://127.0.0.1:3710').'/auth/logout', [
                    'connection_id' => $connectionId,
                ]);
        } catch (ConnectionException) {
            // bridge không chạy — bỏ qua, cleanup DB vẫn ưu tiên
        }
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

        $this->logoutBridge($zaloConnection->connection_id);

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
