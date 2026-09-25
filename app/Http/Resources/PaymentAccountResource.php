<?php

namespace App\Http\Resources;

use App\Models\PaymentAccount;
use App\Support\VietQr\VietQrBanks;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentAccountResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var PaymentAccount $account */
        $account = $this->resource;
        $bank = VietQrBanks::find($account->bank_bin);

        return [
            'id' => $account->id,
            'bank_bin' => $account->bank_bin,
            'bank_code' => $account->bank_code,
            'bank_name' => $bank['short_name'] ?? $account->bank_code,
            'account_number' => $account->account_number,
            'account_name' => $account->account_name,
            'memo_template' => $account->memo_template,
            'is_default' => $account->is_default,
            'allow_all_agents' => $account->allow_all_agents,
        ];
    }
}
