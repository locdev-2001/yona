<?php

namespace App\Services\DataImports;

use App\Jobs\DataImportJob;
use App\Models\Account;
use App\Models\DataImport;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

/**
 * Cổng DUY NHẤT tạo một lần nhập liên hệ từ CSV: tạo bản ghi, gắn tệp, xếp job.
 * Thay `after_create_commit :process_data_import` của DataImport (Chatwoot phải
 * chờ 1 phút cho ActiveStorage tải tệp lên cloud; ở đây tệp đã nằm trên đĩa
 * trước khi job được xếp nên không cần độ trễ).
 */
class ContactsImportService
{
    public function perform(Account $account, ?User $initiatedBy, UploadedFile $file): DataImport
    {
        $dataImport = DB::transaction(function () use ($account, $initiatedBy, $file) {
            $dataImport = $account->dataImports()->create([
                'data_type' => DataImport::DATA_TYPE_CONTACTS,
                'source_type' => 'file',
                'initiated_by_id' => $initiatedBy?->id,
                'started_at' => now(),
            ]);

            $dataImport->attachImportFile($file);

            return $dataImport;
        });

        DataImportJob::dispatch($dataImport);

        return $dataImport;
    }
}
