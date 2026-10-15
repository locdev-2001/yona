<?php

namespace App\Agent\Contracts\Ports;

use App\Agent\ValueObjects\ModelRequest;
use App\Agent\ValueObjects\ModelResponse;

// Cổng mô hình. Không ném lỗi nhà cung cấp hay mạng: thất bại cuối cùng trả
// ModelResponse với FinishReason::Error và ModelError đã phân loại.
interface LanguageModel
{
    public function complete(ModelRequest $request): ModelResponse;
}
