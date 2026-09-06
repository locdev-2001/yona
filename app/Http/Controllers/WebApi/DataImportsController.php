<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\DataImportResource;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\DataImportError;
use App\Policies\DataImportPolicy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Port từ Api::V1::Accounts::DataImportsController — chỉ index/show của nhánh
// nhập CSV; các action của nguồn tích hợp (validate_source/start/retry/abandon/
// error_logs/skip_logs) đi cùng freshdesk/intercom nên hoãn.
class DataImportsController extends Controller
{
    private const DATA_IMPORT_FEATURE = 'data_import';

    public function index(Request $request, Account $account): JsonResponse
    {
        $this->authorizeIndex($request, $account);

        $dataImports = $account->dataImports()
            ->with('initiatedBy')
            ->orderByDesc('created_at')
            ->get();

        $ids = $dataImports->pluck('id')->all();

        return response()->json([
            'payload' => DataImportResource::collectionFor(
                $dataImports,
                $this->errorCounts($ids, skipLogs: false),
                $this->errorCounts($ids, skipLogs: true),
            ),
        ]);
    }

    public function show(Request $request, Account $account, int $dataImportId): JsonResponse
    {
        $this->ensureFeatureEnabled($account);

        $dataImport = $account->dataImports()->with('initiatedBy')->findOrFail($dataImportId);

        abort_unless($this->policy($request)->show($dataImport), 401, 'You are not authorized to do this action');

        $importErrors = $dataImport->importErrors()->nonSkipLogs()->orderBy('created_at')->get();
        $skipLogs = $dataImport->importErrors()->skipLogs()->orderBy('created_at')->get();

        return response()->json([
            ...(new DataImportResource(
                $dataImport,
                [$dataImport->id => $importErrors->count()],
                [$dataImport->id => $skipLogs->count()],
            ))->toArray($request),
            'import_errors' => $importErrors->map(fn (DataImportError $error) => $this->errorPayload($error))->all(),
            'skip_logs' => $skipLogs->map(fn (DataImportError $error) => [
                'kind' => $error->details['kind'] ?? null,
                ...$this->errorPayload($error),
            ])->all(),
            'skip_logs_filters' => [
                'selected_source_object_type' => null,
                'counts_by_type' => $skipLogs->countBy('source_object_type')->all(),
            ],
        ]);
    }

    private function errorPayload(DataImportError $error): array
    {
        return [
            'id' => $error->id,
            'error_code' => $error->error_code,
            'message' => $error->message,
            'source_object_type' => $error->source_object_type,
            'source_object_id' => $error->source_object_id,
            'details' => $error->details ?? [],
            'created_at' => $error->created_at,
        ];
    }

    /** @param list<int> $dataImportIds */
    private function errorCounts(array $dataImportIds, bool $skipLogs): array
    {
        if ($dataImportIds === []) {
            return [];
        }

        return DataImportError::query()
            ->whereIn('data_import_id', $dataImportIds)
            ->when($skipLogs, fn ($query) => $query->skipLogs(), fn ($query) => $query->nonSkipLogs())
            ->selectRaw('data_import_id, count(*) as aggregate')
            ->groupBy('data_import_id')
            ->pluck('aggregate', 'data_import_id')
            ->all();
    }

    private function authorizeIndex(Request $request, Account $account): void
    {
        $this->ensureFeatureEnabled($account);

        abort_unless($this->policy($request)->index(), 401, 'You are not authorized to do this action');
    }

    private function ensureFeatureEnabled(Account $account): void
    {
        abort_unless($account->featureEnabled(self::DATA_IMPORT_FEATURE), 401, 'You are not authorized to do this action');
    }

    private function policy(Request $request): DataImportPolicy
    {
        $accountUser = $request->attributes->get('currentAccountUser');

        abort_unless($accountUser instanceof AccountUser, 401, 'You are not authorized to do this action');

        return new DataImportPolicy($accountUser);
    }
}
