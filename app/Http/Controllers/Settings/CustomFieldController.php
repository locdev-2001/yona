<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\CustomFieldDefinitionRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Shared\Models\CustomFieldDefinition;
use Modules\Shared\Services\CustomFieldService;

/**
 * Admin CRUD for custom-field definitions (settings panel).
 * Controller is thin — all logic in CustomFieldService.
 * Workspace isolation via BelongsToWorkspace global scope + RLS (foreign id → 404).
 */
class CustomFieldController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', CustomFieldDefinition::class);

        $entityType = $request->string('entity_type')->toString();
        if (! in_array($entityType, CustomFieldDefinition::ENTITY_TYPES, true)) {
            $entityType = CustomFieldDefinition::ENTITY_TYPES[0];
        }

        $definitions = CustomFieldDefinition::forEntity($entityType)
            ->ordered()
            ->withTrashed(false)
            ->paginate(50);

        return Inertia::render('settings/custom-fields/index', [
            'definitions' => $definitions,
            'entityTypes' => CustomFieldDefinition::ENTITY_TYPES,
            'fieldTypes' => CustomFieldDefinition::FIELD_TYPES,
            'optionTypes' => CustomFieldDefinition::OPTION_TYPES,
            'activeEntity' => $entityType,
        ]);
    }

    public function store(CustomFieldDefinitionRequest $request, CustomFieldService $service): RedirectResponse
    {
        $service->createDefinition(
            $request->string('entity_type')->toString(),
            $request->validated()
        );

        return back()->with('success', __('custom_fields.flash.created'));
    }

    public function update(
        CustomFieldDefinitionRequest $request,
        CustomFieldDefinition $definition,
        CustomFieldService $service
    ): RedirectResponse {
        $this->authorize('update', $definition);

        $service->updateDefinition($definition, $request->validated());

        return back()->with('success', __('custom_fields.flash.updated'));
    }

    public function destroy(CustomFieldDefinition $definition, CustomFieldService $service): RedirectResponse
    {
        $this->authorize('delete', $definition);

        $service->deleteDefinition($definition);

        return back()->with('success', __('custom_fields.flash.deleted'));
    }
}
