<?php

namespace App\Http\Controllers\App;

use App\Builders\Email\FromBuilder;
use App\Channels\ChannelConnectionCatalog;
use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Support\Timezones;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

// Mặt tiền web cho settings/inboxes — tương đương inbox.routes.js (mọi bước
// meta.permissions ['administrator'], đã chặn bằng middleware account.role).
class InboxesSettingsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('dashboard/settings/inboxes/Index');
    }

    // Lối vào lấy từ driver kênh (DeclaresConnection): kênh đóng hay thiếu app nền tảng tự ẩn.
    public function newChannelList(Account $account): Response
    {
        return Inertia::render('dashboard/settings/inboxes/NewChannelList', [
            'channels' => ChannelConnectionCatalog::availableFor($account),
        ]);
    }

    public function newChannel(Account $account, string $subPage): Response|RedirectResponse
    {
        $connection = ChannelConnectionCatalog::find($subPage);

        if ($connection === null || ! $connection->available) {
            return redirect()->route('settings_inbox_new', ['account' => $account->id]);
        }

        return Inertia::render('dashboard/settings/inboxes/NewChannel', [
            'channelName' => $subPage,
            'connection' => $connection->toArray($account),
        ]);
    }

    // Bước quét QR của kênh Zalo — một bước, một URL (xem routes/web.php khối G1).
    public function connectZalo(Account $account, int $inboxId): Response
    {
        return Inertia::render('dashboard/settings/inboxes/channels/ZaloConnect', [
            'inboxId' => $this->fetchInboxId($account, $inboxId),
        ]);
    }

    public function addAgents(Account $account, int $inboxId): Response
    {
        return Inertia::render('dashboard/settings/inboxes/AddAgents', [
            'inboxId' => $this->fetchInboxId($account, $inboxId),
        ]);
    }

    public function finish(Account $account, int $inboxId): Response
    {
        return Inertia::render('dashboard/settings/inboxes/FinishSetup', [
            'inboxId' => $this->fetchInboxId($account, $inboxId),
        ]);
    }

    public function show(Account $account, int $inboxId, ?string $tab = null): Response
    {
        $inbox = $account->inboxes()->whereKey($inboxId)->firstOrFail();

        return Inertia::render('dashboard/settings/inboxes/Show', [
            'inboxId' => $inbox->id,
            'tab' => $tab,
            // Ví dụ "Tên người gửi" dùng đúng địa chỉ thư sẽ gửi cho khách.
            'senderEmailAddress' => (new FromBuilder($inbox))->emailAddress(),
            'timezoneOptions' => Timezones::options(),
        ]);
    }

    // Màn "Widget chat" (nhóm D, phase 7) — chỉ hộp thư kênh website mới có
    // launcher/trang chủ/kênh khác để cấu hình.
    public function widgetBuilder(Account $account, int $inboxId): Response
    {
        $inbox = $account->inboxes()->whereKey($inboxId)->firstOrFail();

        abort_unless($inbox->isWebWidget(), 404);

        return Inertia::render('dashboard/settings/inboxes/widget-builder/WidgetBuilderPage', [
            'inboxId' => $inbox->id,
        ]);
    }

    private function fetchInboxId(Account $account, int $inboxId): int
    {
        return $account->inboxes()->whereKey($inboxId)->firstOrFail()->id;
    }
}
