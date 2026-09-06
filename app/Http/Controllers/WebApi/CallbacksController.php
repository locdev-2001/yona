<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\InboxResource;
use App\Jobs\Avatar\AvatarFromUrlJob;
use App\Models\Account;
use App\Models\Channel\FacebookPage;
use App\Models\Inbox;
use App\Services\Channels\ChannelSetupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Port từ refs/chatwoot/app/controllers/api/v1/accounts/callbacks_controller.rb —
 * bước sau khi người dùng đăng nhập Facebook: liệt kê trang, tạo inbox từ trang
 * đã chọn, cấp quyền lại cho trang cũ. Gem koala thay bằng Http facade.
 */
class CallbacksController extends Controller
{
    public function facebookPages(Request $request, Account $account): JsonResponse
    {
        $userAccessToken = $this->longLivedToken((string) $request->input('omniauth_token'));
        $pages = $this->fetchPages($userAccessToken);

        $existingPageIds = FacebookPage::query()
            ->where('account_id', $account->id)
            ->pluck('page_id')
            ->all();

        return response()->json([
            'data' => [
                'page_details' => array_map(
                    fn (array $page) => [...$page, 'exists' => in_array($page['id'] ?? null, $existingPageIds, true)],
                    $pages,
                ),
            ],
        ]);
    }

    public function registerFacebookPage(Request $request, Account $account): JsonResponse
    {
        $data = $request->validate([
            'page_id' => ['required', 'string'],
            'user_access_token' => ['required', 'string'],
            'page_access_token' => ['required', 'string'],
            'inbox_name' => ['required', 'string'],
        ]);

        $inbox = DB::transaction(function () use ($account, $data) {
            $channel = FacebookPage::query()->create([
                'account_id' => $account->id,
                'page_id' => $data['page_id'],
                'user_access_token' => $data['user_access_token'],
                'page_access_token' => $data['page_access_token'],
            ]);

            $inbox = Inbox::query()->create([
                'account_id' => $account->id,
                'name' => $data['inbox_name'],
                'channel_type' => 'Channel::FacebookPage',
                'channel_id' => $channel->id,
            ]);

            $this->syncInstagramId($channel);

            return $inbox;
        });

        // Channel::FacebookPage `after_create_commit :subscribe` — cùng service
        // với luồng tạo inbox thường (ChannelSetupService).
        app(ChannelSetupService::class)->register($inbox);

        AvatarFromUrlJob::dispatch($inbox, "https://graph.facebook.com/{$data['page_id']}/picture?type=large");

        return response()->json(['data' => (new InboxResource($inbox, true))->toArray($request)]);
    }

    public function reauthorizePage(Request $request, Account $account, int $inboxId): JsonResponse
    {
        $inbox = $account->inboxes()->where('id', $inboxId)->first();

        if ($inbox === null || $inbox->channel_type !== 'Channel::FacebookPage') {
            return response()->json(['error' => 'Inbox not found'], 422);
        }

        $userAccessToken = $this->longLivedToken((string) $request->input('omniauth_token'));
        $channel = $inbox->channel;

        foreach ($this->fetchPages($userAccessToken) as $page) {
            if (($page['id'] ?? null) !== $channel->page_id) {
                continue;
            }

            $channel->update([
                'user_access_token' => $userAccessToken,
                'page_access_token' => $page['access_token'] ?? null,
            ]);
            $this->syncInstagramId($channel);
            $channel->reauthorized();

            return response()->json(['data' => (new InboxResource($inbox, true))->toArray($request)]);
        }

        return response()->json(['error' => 'Page not found'], 422);
    }

    /** @return list<array<string, mixed>> */
    private function fetchPages(?string $userAccessToken): array
    {
        if (blank($userAccessToken)) {
            return [];
        }

        $response = Http::get($this->baseUri().'/me/accounts', ['access_token' => $userAccessToken]);

        return $response->successful() ? (array) $response->json('data', []) : [];
    }

    // Koala::Facebook::OAuth#exchange_access_token_info — đổi token ngắn hạn lấy token 60 ngày.
    private function longLivedToken(string $omniauthToken): ?string
    {
        $response = Http::get($this->baseUri().'/oauth/access_token', [
            'grant_type' => 'fb_exchange_token',
            'client_id' => config('services.facebook.app_id'),
            'client_secret' => config('services.facebook.app_secret'),
            'fb_exchange_token' => $omniauthToken,
        ]);

        return $response->successful() ? $response->json('access_token') : null;
    }

    private function syncInstagramId(FacebookPage $channel): void
    {
        try {
            $response = Http::get($this->baseUri().'/me', [
                'fields' => 'instagram_business_account',
                'access_token' => $channel->page_access_token,
            ]);

            $instagramId = $response->json('instagram_business_account.id');

            if (filled($instagramId)) {
                $channel->update(['instagram_id' => $instagramId]);
            }
        } catch (Throwable $exception) {
            Log::error('Error in set_instagram_id: '.$exception->getMessage());
        }
    }

    private function baseUri(): string
    {
        return 'https://graph.facebook.com/'.config('services.facebook.api_version', 'v22.0');
    }
}
