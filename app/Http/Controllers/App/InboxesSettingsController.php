<?php

namespace App\Http\Controllers\App;

use App\Http\Controllers\Controller;
use App\Models\Account;
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

    public function newChannelList(): Response
    {
        return Inertia::render('dashboard/settings/inboxes/NewChannelList');
    }

    public function newChannel(Account $account, string $subPage): Response
    {
        return Inertia::render('dashboard/settings/inboxes/NewChannel', [
            'channelName' => $subPage,
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
        return Inertia::render('dashboard/settings/inboxes/Show', [
            'inboxId' => $this->fetchInboxId($account, $inboxId),
            'tab' => $tab,
        ]);
    }

    private function fetchInboxId(Account $account, int $inboxId): int
    {
        return $account->inboxes()->whereKey($inboxId)->firstOrFail()->id;
    }
}
