<?php

namespace App\Http\Controllers\WebApi\Integrations;

use App\Http\Controllers\Controller;
use App\Http\Resources\IntegrationAppResource;
use App\Models\Account;
use App\Models\AccountUser;
use App\Support\Integrations\App;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Port từ Api::V1::Accounts::Integrations::AppsController — danh mục ứng dụng
// tích hợp (index/show mở cho mọi thành viên account).
class AppsController extends Controller
{
    public function index(Request $request, Account $account): JsonResponse
    {
        $apps = collect(App::all())->filter(fn (App $app) => $app->isActive($account));

        return response()->json([
            'payload' => IntegrationAppResource::collectionFor($apps, $account, $this->isAdministrator($request)),
        ]);
    }

    public function show(Request $request, Account $account, string $appId): JsonResponse
    {
        $app = App::find($appId);

        abort_if($app === null, 404);

        return response()->json(
            (new IntegrationAppResource($app, $account, $this->isAdministrator($request)))->toArray($request)
        );
    }

    private function isAdministrator(Request $request): bool
    {
        $accountUser = $request->attributes->get('currentAccountUser');

        return $accountUser instanceof AccountUser && $accountUser->isAdministrator();
    }
}
