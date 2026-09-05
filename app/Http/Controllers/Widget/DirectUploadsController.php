<?php

namespace App\Http\Controllers\Widget;

use App\Models\Attachment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

// Port từ refs/chatwoot/app/controllers/api/v1/widget/direct_uploads_controller.rb.
// Không có ActiveStorage nên gộp hai bước (tạo blob → PUT tệp) thành một POST
// multipart, y như Conversations\DirectUploadsController của dashboard.
class DirectUploadsController extends WidgetController
{
    public function store(Request $request): JsonResponse
    {
        $request->validate(['file' => ['required', 'file']]);

        $attributes = Attachment::storeUpload($request->file('file'), $this->account($request)->id);

        return response()->json([
            'signed_id' => Attachment::signUpload($attributes),
            'filename' => $attributes['filename'],
            'content_type' => $attributes['content_type'],
            'byte_size' => $attributes['byte_size'],
            'url' => (string) Storage::disk($attributes['disk'])->url($attributes['path']),
        ]);
    }
}
