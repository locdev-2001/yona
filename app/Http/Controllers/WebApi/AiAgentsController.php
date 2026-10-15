<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\AiAgentResource;
use App\Models\Account;
use App\Models\AiAgent;
use App\Models\Inbox;
use App\Services\AiAgents\AiAgentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

// Màn Cài đặt › Nhân viên AI (chỉ quản trị viên account). Mọi thay đổi đi qua
// AiAgentService; controller chỉ kiểm đầu vào và dựng payload.
class AiAgentsController extends Controller
{
    private const PERSONA_MAX_LENGTH = 4000;

    private const INSTRUCTIONS_MAX_LENGTH = 20000;

    private const AVATAR_RULES = ['file', 'mimes:jpg,jpeg,png,gif,webp', 'max:15360'];

    public function __construct(private readonly AiAgentService $aiAgents) {}

    public function index(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $counts = $this->aiAgents->autoReplyCountsByInbox($account);
        $aiAgents = $account->aiAgents()->with(['inboxes:id,ai_agent_id', 'avatar'])->orderBy('id')->get();
        $inboxes = $account->inboxes()->with('channel')->orderByRaw('lower(name) ASC')->get();

        return response()->json([
            'payload' => $aiAgents->map(fn (AiAgent $aiAgent) => (new AiAgentResource($aiAgent, $counts))->toArray($request))->all(),
            'inboxes' => $inboxes->map(fn (Inbox $inbox) => [
                'id' => $inbox->id,
                'name' => $inbox->name,
                'channel_type' => $inbox->channel_type,
                'platform' => $inbox->platform()->toArray(),
                'ai_agent_id' => $inbox->ai_agent_id,
                'auto_reply_conversations_count' => $counts[$inbox->id] ?? 0,
            ])->all(),
        ]);
    }

    public function store(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $data = $request->validate($this->rules(creating: true));

        $aiAgent = DB::transaction(function () use ($request, $account, $data) {
            $aiAgent = $this->aiAgents->create($account, $data['name'], $data['persona'] ?? null, $data['instructions'] ?? null);
            $this->aiAgents->syncInboxes($aiAgent, $data['inbox_ids'] ?? []);
            $this->storeAvatarFrom($request, $aiAgent);

            return $aiAgent;
        });

        return $this->resource($request, $account, $aiAgent);
    }

    public function update(Request $request, Account $account, int $aiAgentId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $aiAgent = $this->fetchAiAgent($account, $aiAgentId);
        $data = $request->validate($this->rules(creating: false));

        DB::transaction(function () use ($aiAgent, $data) {
            $this->aiAgents->update($aiAgent, array_intersect_key($data, array_flip(['name', 'persona', 'instructions', 'enabled'])));

            if (array_key_exists('inbox_ids', $data)) {
                $this->aiAgents->syncInboxes($aiAgent, $data['inbox_ids'] ?? []);
            }

        });

        return $this->resource($request, $account, $aiAgent);
    }

    // Ảnh đại diện tải riêng: multipart không đi được qua PUT/PATCH.
    public function storeAvatar(Request $request, Account $account, int $aiAgentId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $aiAgent = $this->fetchAiAgent($account, $aiAgentId);
        $request->validate(['avatar' => ['required', ...self::AVATAR_RULES]]);
        $this->storeAvatarFrom($request, $aiAgent);

        return $this->resource($request, $account, $aiAgent);
    }

    public function destroy(Request $request, Account $account, int $aiAgentId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $this->aiAgents->delete($this->fetchAiAgent($account, $aiAgentId));

        return response()->json(['id' => $aiAgentId]);
    }

    public function destroyAvatar(Request $request, Account $account, int $aiAgentId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $aiAgent = $this->fetchAiAgent($account, $aiAgentId);
        $aiAgent->removeAvatar();

        return $this->resource($request, $account, $aiAgent);
    }

    // Bảng "AI của từng kênh": chọn AI ngay trong dòng, null là "Không dùng AI".
    public function assignInbox(Request $request, Account $account, int $inboxId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $inbox = $account->inboxes()->whereKey($inboxId)->firstOrFail();
        $data = $request->validate(['ai_agent_id' => ['present', 'nullable', 'integer']]);
        $aiAgent = $data['ai_agent_id'] === null ? null : $this->fetchAiAgent($account, (int) $data['ai_agent_id']);

        $this->aiAgents->assignInbox($inbox, $aiAgent);

        return response()->json(['id' => $inbox->id, 'ai_agent_id' => $inbox->ai_agent_id]);
    }

    /** @return array<string, list<string>> */
    private function rules(bool $creating): array
    {
        $required = $creating ? 'required' : 'sometimes';

        return [
            'name' => [$required, 'string', 'max:255'],
            'persona' => ['sometimes', 'nullable', 'string', 'max:'.self::PERSONA_MAX_LENGTH],
            'instructions' => ['sometimes', 'nullable', 'string', 'max:'.self::INSTRUCTIONS_MAX_LENGTH],
            'enabled' => ['sometimes', 'boolean'],
            'inbox_ids' => ['sometimes', 'nullable', 'array'],
            'inbox_ids.*' => ['integer'],
            ...($creating ? ['avatar' => ['sometimes', ...self::AVATAR_RULES]] : []),
        ];
    }

    private function storeAvatarFrom(Request $request, AiAgent $aiAgent): void
    {
        if ($request->file('avatar') instanceof UploadedFile) {
            $aiAgent->replaceAvatar($request->file('avatar'));
        }
    }

    // Tra theo account đang mở: AI agent của account khác trả 404, không lộ là có tồn tại.
    private function fetchAiAgent(Account $account, int $aiAgentId): AiAgent
    {
        return $account->aiAgents()->whereKey($aiAgentId)->firstOrFail();
    }

    private function resource(Request $request, Account $account, AiAgent $aiAgent): JsonResponse
    {
        $aiAgent->load(['inboxes:id,ai_agent_id', 'avatar']);

        return response()->json((new AiAgentResource($aiAgent, $this->aiAgents->autoReplyCountsByInbox($account)))->toArray($request));
    }
}
