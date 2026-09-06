<?php

namespace App\Http\Resources;

use App\Models\DataImport;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/accounts/data_imports/_data_import.json.jbuilder.
class DataImportResource extends JsonResource
{
    /**
     * @param  array<int, int>  $importErrorsCounts
     * @param  array<int, int>  $skipLogsCounts
     */
    public function __construct(
        DataImport $resource,
        private readonly array $importErrorsCounts = [],
        private readonly array $skipLogsCounts = [],
    ) {
        parent::__construct($resource);
    }

    /**
     * @param  iterable<DataImport>  $dataImports
     * @param  array<int, int>  $importErrorsCounts
     * @param  array<int, int>  $skipLogsCounts
     */
    public static function collectionFor(iterable $dataImports, array $importErrorsCounts, array $skipLogsCounts): array
    {
        return collect($dataImports)
            ->map(fn (DataImport $dataImport) => (new self($dataImport, $importErrorsCounts, $skipLogsCounts))->toArray(request()))
            ->values()
            ->all();
    }

    public function toArray(Request $request): array
    {
        /** @var DataImport $dataImport */
        $dataImport = $this->resource;

        return [
            'id' => $dataImport->id,
            'name' => $dataImport->name,
            'data_type' => $dataImport->data_type,
            'source_type' => $dataImport->source_type,
            'source_provider' => $dataImport->source_provider,
            'import_types' => $dataImport->import_types ?? [],
            'status' => $dataImport->statusName(),
            'stalled' => false,
            'total_records' => $dataImport->total_records,
            'processed_records' => $dataImport->processed_records,
            'stats' => $dataImport->stats ?? [],
            'cursor' => $dataImport->cursor ?? [],
            'created_at' => $dataImport->created_at,
            'updated_at' => $dataImport->updated_at,
            'started_at' => $dataImport->started_at,
            'completed_at' => $dataImport->completed_at,
            'abandoned_at' => $dataImport->abandoned_at,
            'initiated_by' => $dataImport->initiatedBy === null ? null : [
                'id' => $dataImport->initiatedBy->id,
                'name' => $dataImport->initiatedBy->name,
                'email' => $dataImport->initiatedBy->email,
            ],
            'failed_records_url' => $dataImport->failedRecords()?->url(),
            'import_errors_count' => $this->importErrorsCounts[$dataImport->id] ?? 0,
            'skip_logs_count' => $this->skipLogsCounts[$dataImport->id] ?? 0,
        ];
    }
}
