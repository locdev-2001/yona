<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\DashboardAppResource;
use App\Models\Account;
use App\Models\DashboardApp;
use App\Support\Integrations\JsonSchemaValidator;
use App\Support\RecordInvalidResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Validator;

// Port từ Api::V1::Accounts::DashboardAppsController (DashboardAppPolicy: đọc mở
// cho mọi thành viên, ghi chỉ administrator).
class DashboardAppsController extends Controller
{
    public function index(Request $request, Account $account): JsonResponse
    {
        return response()->json(DashboardAppResource::collectionFor($account->dashboardApps()->get()));
    }

    public function show(Request $request, Account $account, int $dashboardAppId): JsonResponse
    {
        return response()->json($this->resource($this->fetchDashboardApp($account, $dashboardAppId)));
    }

    public function store(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $dashboardApp = $account->dashboardApps()->create([
            ...$this->validatedPayload($request),
            'user_id' => $request->user()?->id,
        ]);

        return response()->json($this->resource($dashboardApp));
    }

    public function update(Request $request, Account $account, int $dashboardAppId): JsonResponse
    {
        $this->authorizeAdministrator($request);
        $dashboardApp = $this->fetchDashboardApp($account, $dashboardAppId);
        $dashboardApp->update($this->validatedPayload($request, $dashboardApp));

        return response()->json($this->resource($dashboardApp->refresh()));
    }

    public function destroy(Request $request, Account $account, int $dashboardAppId): Response
    {
        $this->authorizeAdministrator($request);
        $this->fetchDashboardApp($account, $dashboardAppId)->delete();

        return response()->noContent();
    }

    private function resource(DashboardApp $dashboardApp): array
    {
        return (new DashboardAppResource($dashboardApp))->toArray(request());
    }

    private function fetchDashboardApp(Account $account, int $dashboardAppId): DashboardApp
    {
        return $account->dashboardApps()->whereKey($dashboardAppId)->firstOrFail();
    }

    // params.require(:dashboard_app).permit(:title, content: [:url, :type]) —
    // FE gửi phẳng, Rails bọc bằng ParamsWrapper nên nhận cả hai dạng.
    /** @return array<string, mixed> */
    private function validatedPayload(Request $request, ?DashboardApp $dashboardApp = null): array
    {
        $wrapped = $request->input('dashboard_app');
        $payload = collect(is_array($wrapped) ? $wrapped : $request->all())
            ->only(['title', 'content'])
            ->all();

        if ($payload === []) {
            abort(response()->json(['error' => 'param is missing or the value is empty: dashboard_app'], 422));
        }

        if (array_key_exists('content', $payload)) {
            $payload['content'] = $this->onlyContentKeys($payload['content']);
        }

        $required = $dashboardApp === null ? 'required' : 'sometimes';

        return RecordInvalidResponse::validatedOrAbort(Validator::make($payload, [
            'title' => ['bail', $required, 'filled', 'string'],
            'content' => ['bail', $required === 'required' ? 'present' : 'sometimes', 'array', function (string $attribute, mixed $value, callable $fail) {
                if (! JsonSchemaValidator::isValid($value, DashboardApp::CONTENT_SCHEMA)) {
                    $fail('Content : Invalid data');
                }
            }],
        ], [
            'title.required' => "Title can't be blank",
            'title.filled' => "Title can't be blank",
        ]));
    }

    /** permit(content: [:url, :type]) — bỏ mọi khoá lạ trước khi kiểm lược đồ. */
    private function onlyContentKeys(mixed $content): mixed
    {
        if (! is_array($content)) {
            return $content;
        }

        return collect($content)
            ->map(fn (mixed $item) => is_array($item) ? collect($item)->only(['url', 'type'])->all() : $item)
            ->all();
    }
}
