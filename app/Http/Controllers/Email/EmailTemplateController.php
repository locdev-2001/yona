<?php

namespace App\Http\Controllers\Email;

use App\Http\Controllers\Controller;
use App\Http\Requests\Email\EmailTemplateTestRequest;
use App\Http\Requests\Email\EmailTemplateUpdateRequest;
use App\Models\EmailTemplate;
use App\Services\EmailTemplateService;
use App\Services\MergeFieldResolver;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * P06 — Settings → Email Templates (admin CRUD + test send).
 *
 * Thin controller: parse → authorize → service → Inertia/redirect.
 * workspace_id NEVER from request — RLS + route-model-binding scope automatically.
 * Templates from other workspaces are invisible (404) via RLS, not 403.
 */
class EmailTemplateController extends Controller
{
    public function index(MergeFieldResolver $resolver): Response
    {
        $this->authorize('viewAny', EmailTemplate::class);

        $templates = EmailTemplate::query()
            ->orderBy('type')
            ->orderBy('sort_order')
            ->orderBy('language')
            ->get()
            ->map(fn (EmailTemplate $t) => [
                'id' => $t->id,
                'slug' => $t->slug,
                'type' => $t->type,
                'name' => $t->name,
                'subject' => $t->subject,
                'language' => $t->language,
                'active' => $t->active,
                'plaintext' => $t->plaintext,
                'sort_order' => $t->sort_order,
            ]);

        return Inertia::render('email/email-templates/index', [
            'templates' => $templates,
            'types' => EmailTemplate::TYPES,
            'languages' => EmailTemplate::LANGUAGES,
        ]);
    }

    public function edit(EmailTemplate $template, MergeFieldResolver $resolver): Response
    {
        $this->authorize('update', $template);

        $entityType = $template->slugEntityType();

        return Inertia::render('email/email-templates/edit', [
            'template' => [
                'id' => $template->id,
                'slug' => $template->slug,
                'type' => $template->type,
                'name' => $template->name,
                'subject' => $template->subject,
                'body' => $template->body,
                'language' => $template->language,
                'plaintext' => $template->plaintext,
                'active' => $template->active,
                'sort_order' => $template->sort_order,
            ],
            'mergeTokens' => $resolver->tokensFor($entityType),
        ]);
    }

    public function update(
        EmailTemplateUpdateRequest $request,
        EmailTemplate $template,
        EmailTemplateService $service,
    ): RedirectResponse {
        $this->authorize('update', $template);

        $service->update($template, $request->validated());

        return back()->with('success', __('email_templates.updated'));
    }

    public function test(
        EmailTemplateTestRequest $request,
        EmailTemplate $template,
        EmailTemplateService $service,
    ): RedirectResponse {
        $this->authorize('sendTest', $template);

        $service->sendTest($template, $request->string('email')->toString());

        return back()->with('success', __('email_templates.test_sent'));
    }
}
