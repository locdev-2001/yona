<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Attachment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

// Port từ Api::V1::Accounts::UploadController — cửa tải tệp dùng chung của
// dashboard (macro, automation). Không có ActiveStorage nên `blob_id` trả về là
// tham chiếu đã ký của Attachment, đem gắn vào action_params.
// external_url của bản gốc (SafeFetch) chưa port.
class UploadController extends Controller
{
    public function store(Request $request, Account $account): JsonResponse
    {
        $request->validate(['attachment' => ['required', 'file']]);

        $attributes = Attachment::storeUpload($request->file('attachment'), $account->id);

        return response()->json([
            'file_url' => (string) Storage::disk($attributes['disk'])->url($attributes['path']),
            'blob_id' => Attachment::signUpload($attributes),
        ]);
    }
}
