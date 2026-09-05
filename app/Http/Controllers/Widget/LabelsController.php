<?php

namespace App\Http\Controllers\Widget;

use Illuminate\Http\Request;
use Illuminate\Http\Response;

// Port từ refs/chatwoot/app/controllers/api/v1/widget/labels_controller.rb —
// widget chỉ gắn/gỡ được nhãn ĐÃ tồn tại trong account, không tạo nhãn mới.
class LabelsController extends WidgetController
{
    public function store(Request $request): Response
    {
        $conversation = $this->conversation($request);
        $label = (string) $request->input('label');

        if ($conversation !== null && $this->labelDefinedInAccount($request, $label)) {
            $conversation->addLabels([$label]);
        }

        return response()->noContent();
    }

    public function destroy(Request $request, string $label): Response
    {
        $this->conversation($request)?->removeLabels([$label]);

        return response()->noContent();
    }

    private function labelDefinedInAccount(Request $request, string $label): bool
    {
        return blank($label)
            ? false
            : $this->account($request)->labels()->where('title', $label)->exists();
    }
}
