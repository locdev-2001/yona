<?php

namespace App\Services\Contacts;

use App\Models\Account;
use App\Models\Contact;
use App\Models\User;
use App\Support\CurrentUser;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Log;

// Ba service con của bản gốc (BulkDelete/BulkAssignLabels/BulkRemoveLabels) chỉ
// là một vòng lặp trên cùng tập liên hệ nên gộp vào ba method riêng ở đây —
// vẫn một điểm sửa cho mỗi hành vi.
class BulkActionService
{
    /** @param array<string, mixed> $params */
    public function __construct(
        private readonly Account $account,
        private readonly ?User $user,
        private readonly array $params,
    ) {}

    /** @return array{success: bool, error?: string, updated_contact_ids?: array<int, int>} */
    public function perform(): array
    {
        if (($this->params['action_name'] ?? null) === 'delete') {
            return CurrentUser::runAs($this->user, fn () => $this->deleteContacts());
        }

        if ($this->labels('add') !== []) {
            return CurrentUser::runAs($this->user, fn () => $this->assignLabels());
        }

        if ($this->labels('remove') !== []) {
            return CurrentUser::runAs($this->user, fn () => $this->removeLabels());
        }

        Log::warning('Unknown contact bulk operation payload: '.implode(', ', array_keys($this->params)));

        return ['success' => false, 'error' => 'unknown_operation'];
    }

    /** @return array{success: bool, updated_contact_ids: array<int, int>} */
    private function assignLabels(): array
    {
        $labels = $this->labels('add');
        $contacts = $this->contacts();

        foreach ($contacts as $contact) {
            $contact->addLabels($labels);
        }

        return ['success' => true, 'updated_contact_ids' => $contacts->pluck('id')->all()];
    }

    /** @return array{success: bool, updated_contact_ids: array<int, int>} */
    private function removeLabels(): array
    {
        $labels = $this->labels('remove');
        $contacts = $this->contacts();

        foreach ($contacts as $contact) {
            $contact->removeLabels($labels);
        }

        return ['success' => true, 'updated_contact_ids' => $contacts->pluck('id')->all()];
    }

    /** @return array{success: bool, updated_contact_ids: array<int, int>} */
    private function deleteContacts(): array
    {
        $contacts = $this->contacts();
        $deletedIds = [];

        foreach ($contacts as $contact) {
            $deletedIds[] = $contact->id;
            $contact->delete();
        }

        return ['success' => true, 'updated_contact_ids' => $deletedIds];
    }

    /** @return Collection<int, Contact> */
    private function contacts()
    {
        $ids = array_values(array_filter(array_map('intval', (array) ($this->params['ids'] ?? []))));

        if ($ids === []) {
            return Contact::query()->whereRaw('1 = 0')->get();
        }

        return Contact::query()
            ->where('account_id', $this->account->id)
            ->whereIn('id', $ids)
            ->get();
    }

    /** @return array<int, string> */
    private function labels(string $kind): array
    {
        $labels = (array) data_get($this->params, "labels.$kind", []);

        return array_values(array_filter(array_map('strval', $labels), fn (string $label) => trim($label) !== ''));
    }
}
