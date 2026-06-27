<?php

namespace Modules\Email\Services;

use App\Mail\TemplatedMessage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Mail;
use Modules\Email\Models\EmailTemplate;

/**
 * P06 — CRUD + preview + test-send operations for EmailTemplate (settings).
 *
 * Called from EmailTemplateController. All workspace scoping is handled by
 * RLS + model-binding; this service operates on already-resolved models.
 */
class EmailTemplateService
{
    public function __construct(
        private readonly MergeFieldResolver $resolver,
    ) {}

    /**
     * Update editable fields on a template. Optimistic lock is checked by
     * HasOptimisticLock on save().
     *
     * @param  array<string, mixed>  $data  validated by EmailTemplateUpdateRequest
     */
    public function update(EmailTemplate $template, array $data): void
    {
        $template->fill($data);
        $template->updated_by = auth()->id();
        $template->save();
    }

    /**
     * Toggle the active status of a template.
     */
    public function toggleActive(EmailTemplate $template): void
    {
        $template->active = ! $template->active;
        $template->updated_by = auth()->id();
        $template->save();
    }

    /**
     * Preview a template by resolving with a sample context.
     * Returns rendered subject + body (not queued, not sent).
     *
     * @param  array<string, Model>  $sampleContext
     * @return array{subject: string, body: string}
     */
    public function preview(EmailTemplate $template, array $sampleContext = []): array
    {
        $values = $this->resolver->resolve($sampleContext);
        $subject = $this->resolver->render($template->subject, $values);
        $body = $this->resolver->render($template->body, $values);

        if ($template->plaintext) {
            $body = strip_tags($body);
        }

        return compact('subject', 'body');
    }

    /**
     * Send a test email to the given address with sample/no context.
     * Uses a sample context so preview renders meaningful output.
     */
    public function sendTest(EmailTemplate $template, string $email): void
    {
        $rendered = $this->preview($template);

        Mail::to($email)->queue(
            new TemplatedMessage($rendered['subject'], $rendered['body'], $template->plaintext)
        );
    }
}
