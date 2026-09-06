<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\CampaignResource;
use App\Models\Account;
use App\Models\Campaign;
use App\Models\Inbox;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

// Port từ Api::V1::Accounts::CampaignsController.
// CampaignPolicy: cả 5 action chỉ administrator.
class CampaignsController extends Controller
{
    public function index(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $campaigns = $account->campaigns()->with(['inbox.channel', 'sender'])->get();

        return response()->json(CampaignResource::collectionFor($campaigns, true));
    }

    public function show(Request $request, Account $account, int $displayId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        return $this->render($request, $this->fetchCampaign($account, $displayId));
    }

    public function store(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $attributes = $this->validatedCampaign($request, $account);
        $campaign = Campaign::query()->create([...$attributes, 'account_id' => $account->id]);

        return $this->render($request, $campaign);
    }

    public function update(Request $request, Account $account, int $displayId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $campaign = $this->fetchCampaign($account, $displayId);
        $campaign->update($this->validatedCampaign($request, $account, $campaign));

        return $this->render($request, $campaign);
    }

    public function destroy(Request $request, Account $account, int $displayId): Response
    {
        $this->authorizeAdministrator($request);

        $this->fetchCampaign($account, $displayId)->delete();

        return response()->noContent(200);
    }

    /**
     * campaign_params: `params.require(:campaign).permit(...)` + ParamsWrapper —
     * FE gửi phẳng, Rails tự bọc vào khoá `campaign`; nhận cả hai dạng.
     *
     * @return array<string, mixed>
     */
    private function validatedCampaign(Request $request, Account $account, ?Campaign $campaign = null): array
    {
        $wrapped = $request->input('campaign');

        if (is_array($wrapped)) {
            $request->merge($wrapped);
        }

        $targetInbox = $request->has('inbox_id')
            ? Inbox::query()->where('account_id', $account->id)->find($request->input('inbox_id'))
            : $campaign?->inbox;

        return $request->validate(Campaign::validationRules($account, $targetInbox, $campaign));
    }

    private function fetchCampaign(Account $account, int $displayId): Campaign
    {
        return $account->campaigns()->where('display_id', $displayId)->firstOrFail();
    }

    private function render(Request $request, Campaign $campaign): JsonResponse
    {
        return response()->json((new CampaignResource($campaign->fresh(['inbox.channel', 'sender']), true))->toArray($request));
    }
}
