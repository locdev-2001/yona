<?php

namespace App\Http\Controllers\WebApi;

use App\Builders\AgentBuilder;
use App\Http\Controllers\Controller;
use App\Http\Resources\AgentResource;
use App\Jobs\DeleteObjectJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

// Port từ Api::V1::Accounts::AgentsController của Chatwoot.
// Bỏ: usage_limits/LimitExceededError + reserve_email_send_capacity (billing
// cloud/EE), custom_role_id (EE). UserPolicy: index mở cho member,
// create/update/destroy/bulk_create chỉ administrator.
class AgentsController extends Controller
{
    public function index(Request $request, Account $account): JsonResponse
    {
        return response()->json(AgentResource::forAccount($this->agents($account), $account));
    }

    public function store(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'string', 'email'],
            'role' => ['nullable', 'in:agent,administrator'],
            'availability' => ['nullable', 'in:online,offline,busy'],
            'auto_offline' => ['nullable', 'boolean'],
        ]);

        if ($account->accountUsers()->whereHas('user', fn ($query) => $query->where('email', mb_strtolower($data['email'])))->exists()) {
            return response()->json(['message' => __('Email has already been taken'), 'attributes' => ['email']], 422);
        }

        $agent = (new AgentBuilder(
            email: $data['email'],
            inviter: $request->user(),
            account: $account,
            name: $data['name'] ?? null,
            role: $data['role'] ?? 'agent',
            availability: $data['availability'] ?? null,
            autoOffline: $data['auto_offline'] ?? null,
        ))->perform();

        return response()->json((new AgentResource($agent->load('avatar'), $account))->toArray($request));
    }

    public function update(Request $request, Account $account, int $agentId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $agent = $this->fetchAgent($account, $agentId);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'role' => ['sometimes', 'in:agent,administrator'],
            'availability' => ['sometimes', 'in:online,offline,busy'],
            'auto_offline' => ['sometimes', 'boolean'],
        ]);

        if (isset($data['name'])) {
            $agent->update(['name' => $data['name']]);
        }

        $membershipChanges = [];
        if (isset($data['role'])) {
            $membershipChanges['role'] = AccountUser::roleFromName($data['role']);
        }
        if (isset($data['availability'])) {
            $membershipChanges['availability'] = AccountUser::availabilityFromName($data['availability']);
        }
        if (array_key_exists('auto_offline', $data)) {
            $membershipChanges['auto_offline'] = $data['auto_offline'];
        }
        if ($membershipChanges !== []) {
            $this->membershipOf($account, $agent)->update($membershipChanges);
        }

        return response()->json((new AgentResource($agent->refresh()->load('avatar'), $account))->toArray($request));
    }

    public function destroy(Request $request, Account $account, int $agentId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $agent = $this->fetchAgent($account, $agentId);
        $this->membershipOf($account, $agent)->delete();

        if ($agent->accountUsers()->doesntExist()) {
            DeleteObjectJob::dispatch($agent);
        }

        return response()->json(['message' => 'ok']);
    }

    // Endpoint dùng khi onboarding: mời hàng loạt theo danh sách email.
    public function bulkCreate(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $data = $request->validate([
            'emails' => ['required', 'array'],
            'emails.*' => ['string'],
        ]);

        foreach ($data['emails'] as $email) {
            $this->createAgentFromEmail($request, $account, $email);
        }

        $customAttributes = $account->custom_attributes ?? [];
        unset($customAttributes['onboarding_step']);
        $account->update(['custom_attributes' => $customAttributes]);

        return response()->json(['message' => 'ok']);
    }

    private function createAgentFromEmail(Request $request, Account $account, string $email): void
    {
        try {
            (new AgentBuilder(
                email: $email,
                inviter: $request->user(),
                account: $account,
                name: Str::before($email, '@'),
            ))->perform();
        } catch (\Throwable $e) {
            // Như Rails: bỏ qua email không hợp lệ / đã là thành viên, mời tiếp phần còn lại.
            Log::info("[Agent#bulk_create] ignoring email {$email}: {$e->getMessage()}");
        }
    }

    /** @return Collection<int, User> */
    private function agents(Account $account): Collection
    {
        return $account->users()
            ->orderByRaw('lower(users.name) ASC')
            ->with(['avatar', 'accountUsers' => fn ($query) => $query->where('account_id', $account->id)])
            ->get();
    }

    private function fetchAgent(Account $account, int $agentId): User
    {
        return $account->users()->where('users.id', $agentId)->firstOrFail();
    }

    private function membershipOf(Account $account, User $agent): AccountUser
    {
        return $agent->accountUsers()->where('account_id', $account->id)->firstOrFail();
    }
}
