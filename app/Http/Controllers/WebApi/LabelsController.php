<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\LabelResource;
use App\Jobs\Labels\RemoveAssociationsJob;
use App\Models\Account;
use App\Models\Label;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

// Port từ Api::V1::Accounts::LabelsController.
// Quyền (LabelPolicy): index mở cho mọi thành viên account, show/create/update/
// destroy chỉ administrator.
class LabelsController extends Controller
{
    public function index(Request $request, Account $account): JsonResponse
    {
        return response()->json([
            'payload' => LabelResource::collection($this->accountLabels($account)->get())->toArray($request),
        ]);
    }

    public function show(Request $request, Account $account, int $labelId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        return response()->json((new LabelResource($this->fetchLabel($account, $labelId)))->toArray($request));
    }

    public function store(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $label = Label::query()->create([
            ...$this->validatedLabel($request, $account),
            'account_id' => $account->id,
        ]);

        return response()->json((new LabelResource($label))->toArray($request));
    }

    public function update(Request $request, Account $account, int $labelId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $label = $this->fetchLabel($account, $labelId);
        $label->update($this->validatedLabel($request, $account, $label));

        return response()->json((new LabelResource($label))->toArray($request));
    }

    public function destroy(Request $request, Account $account, int $labelId): Response
    {
        $this->authorizeAdministrator($request);

        $label = $this->fetchLabel($account, $labelId);
        $title = $label->title;

        $label->delete();
        RemoveAssociationsJob::dispatch($title, $account->id);

        return response()->noContent(200);
    }

    // params.require(:label).permit(…) + ParamsWrapper của Rails: FE gửi phẳng,
    // bản gốc tự bọc vào khóa `label` — nhận cả hai dạng.
    private function validatedLabel(Request $request, Account $account, ?Label $label = null): array
    {
        $attributes = $request->input('label');

        if (is_array($attributes)) {
            $request->merge($attributes);
        }

        if ($request->has('title')) {
            $request->merge(['title' => Label::normalizeTitle((string) $request->input('title'))]);
        }

        $normalizedTitle = (string) $request->input('title', '');

        return $request->validate([
            // Giữ nguyên tên hiển thị; uniqueness vẫn không phân biệt hoa thường
            // để `VIP` và `vip` không tạo ra hai label khó phân biệt.
            'title' => [
                $label === null ? 'required' : 'sometimes',
                'string',
                'max:255',
                'regex:'.Label::TITLE_REGEX,
                function (string $attribute, mixed $value, \Closure $fail) use ($account, $label, $normalizedTitle): void {
                    $query = Label::query()
                        ->where('account_id', $account->id)
                        ->whereRaw('LOWER(title) = ?', [mb_strtolower($normalizedTitle)]);

                    if ($label !== null) {
                        $query->where('id', '<>', $label->id);
                    }

                    if ($query->exists()) {
                        $fail('The title has already been taken.');
                    }
                },
            ],
            'description' => ['sometimes', 'nullable', 'string'],
            'color' => ['sometimes', 'string', 'max:255'],
            'show_on_sidebar' => ['sometimes', 'boolean'],
        ]);
    }

    private function fetchLabel(Account $account, int $labelId): Label
    {
        return $this->accountLabels($account)->whereKey($labelId)->firstOrFail();
    }

    // Account chưa có quan hệ labels() (file ngoài phạm vi tính năng này) — mọi
    // truy vấn nhãn của account đi qua đúng một chỗ này.
    /** @return Builder<Label> */
    private function accountLabels(Account $account): Builder
    {
        return Label::query()->where('account_id', $account->id);
    }
}
