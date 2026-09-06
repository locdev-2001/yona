<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\MacroResource;
use App\Jobs\MacrosExecutionJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Macro;
use App\Policies\MacroPolicy;
use App\Services\Macros\AttachmentActionPreparer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

// Port từ Api::V1::Accounts::MacrosController (+ AttachmentConcern).
// Không giới hạn vai trò: phạm vi do visibility + MacroPolicy quyết định.
class MacrosController extends Controller
{
    public function __construct(private readonly AttachmentActionPreparer $attachments) {}

    public function index(Request $request, Account $account): JsonResponse
    {
        $macros = Macro::withVisibility($account, $request->user())
            ->with(['createdBy.accountUsers', 'updatedBy.accountUsers', 'files'])
            ->get();

        return response()->json(['payload' => MacroResource::forAccount($macros, $account)]);
    }

    public function show(Request $request, Account $account, int $macroId): JsonResponse
    {
        $macro = $this->authorizedMacro($request, $account, $macroId, 'show');

        return response()->json(['payload' => $this->resource($macro, $account)]);
    }

    public function store(Request $request, Account $account): JsonResponse
    {
        [$actions, $pending, $error] = $this->attachments->prepare($request->input('actions'), $account->id);

        if ($error !== null) {
            return response()->json(['error' => $error], 422);
        }

        $macro = new Macro([
            'account_id' => $account->id,
            'name' => $request->input('name'),
            'created_by_id' => $request->user()->id,
            'updated_by_id' => $request->user()->id,
        ]);
        $macro->setVisibility($this->membership($request), $request->input('visibility'));
        $macro->actions = $actions ?? [];

        if (($validationError = $macro->actionsValidationError()) !== null) {
            return response()->json(['error' => ['actions' => [$validationError]]], 422);
        }

        $macro->save();
        $macro->actions = $this->attachments->attach($macro, $macro->actions, $pending);
        $macro->save();

        return response()->json(['payload' => $this->resource($macro, $account)]);
    }

    public function update(Request $request, Account $account, int $macroId): JsonResponse
    {
        $macro = $this->authorizedMacro($request, $account, $macroId, 'update');

        [$actions, $pending, $error] = $this->attachments->prepare($request->input('actions'), $account->id, $macro);

        if ($error !== null) {
            return response()->json(['error' => $error], 422);
        }

        if ($request->has('name')) {
            $macro->name = $request->input('name');
        }

        $macro->updated_by_id = $request->user()->id;
        $macro->setVisibility($this->membership($request), $request->input('visibility', $macro->visibility));

        if ($actions !== null) {
            $macro->actions = $actions;
        }

        if (($validationError = $macro->actionsValidationError()) !== null) {
            return response()->json(['error' => ['actions' => [$validationError]]], 422);
        }

        $macro->save();
        $macro->actions = $this->attachments->attach($macro, $macro->actions, $pending);
        $macro->save();

        return response()->json(['payload' => $this->resource($macro->refresh(), $account)]);
    }

    public function destroy(Request $request, Account $account, int $macroId): Response
    {
        $this->authorizedMacro($request, $account, $macroId, 'destroy')->delete();

        return response()->noContent(200);
    }

    public function execute(Request $request, Account $account, int $macroId): Response
    {
        $macro = $this->authorizedMacro($request, $account, $macroId, 'execute');

        MacrosExecutionJob::dispatch(
            $macro,
            array_values((array) $request->input('conversation_ids', [])),
            $request->user(),
        );

        return response()->noContent(200);
    }

    // fetch_macro + check_authorization: không thấy → 404, thấy mà sai quyền → 401.
    private function authorizedMacro(Request $request, Account $account, int $macroId, string $ability): Macro
    {
        $macro = $account->macros()->whereKey($macroId)->firstOrFail();

        // Bản gốc trả {"error": ...} cho Pundit::NotAuthorizedError, không phải
        // {"message": ...} mặc định của framework.
        abort_unless(
            (new MacroPolicy($this->membership($request)))->{$ability}($macro),
            response()->json(['error' => 'You are not authorized to do this action'], 401)
        );

        return $macro;
    }

    private function membership(Request $request): AccountUser
    {
        return $request->attributes->get('currentAccountUser');
    }

    /** @return array<string, mixed> */
    private function resource(Macro $macro, Account $account): array
    {
        return (new MacroResource($macro, $account))->toArray(request());
    }
}
