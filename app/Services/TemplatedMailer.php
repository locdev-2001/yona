<?php

namespace App\Services;

use App\Mail\TemplatedMessage;
use App\Models\EmailTemplate;
use App\Services\MergeFields\MergeFieldResolver;
use App\Support\Activity\ActivityLogger;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * P05 — Public interface for sending workspace email templates (C4).
 *
 * G9 — context whitelist is the FIRST operation; only 5 entity keys can ever
 * reach MergeFieldResolver. Callers cannot inject PII / secrets via context.
 *
 * Language fallback chain (G9): recipient locale → workspace default → 'en'.
 * Missing / inactive template → log email.skipped, return false (no throw).
 */
class TemplatedMailer
{
    /**
     * G9 — only these context keys are allowed through to MergeFieldResolver.
     * Additions here require spec review; 'password', 'token', 'user', etc. are
     * intentionally excluded.
     *
     * @var list<string>
     */
    const ALLOWED_CONTEXT_KEYS = ['lead', 'client', 'contact', 'project', 'task'];

    public function __construct(
        private readonly MergeFieldResolver $resolver,
        private readonly ActivityLogger $activityLogger,
    ) {}

    /**
     * Send a template email to a recipient.
     *
     * @param  array<string, Model>  $context  entity instances; will be G9-filtered
     * @param  object  $recipient  any object with ->email and optionally ->preferredLocale()
     * @return bool true = mail queued; false = skipped (template missing/inactive)
     */
    public function send(string $slug, object $recipient, array $context): bool
    {
        // ── G9: whitelist context BEFORE any processing ───────────────────────
        $safeContext = array_intersect_key($context, array_flip(self::ALLOWED_CONTEXT_KEYS));
        $strippedKeys = array_keys(array_diff_key($context, $safeContext));

        if (! empty($strippedKeys)) {
            Log::warning('templated_mailer.context_key_stripped', [
                'slug' => $slug,
                'keys' => $strippedKeys,
            ]);
        }
        // ── Only $safeContext flows past this point ───────────────────────────

        $template = $this->resolveTemplate($slug, $recipient);

        if ($template === null || ! $template->active) {
            $this->logSkipped($slug, $recipient->email, $safeContext);

            return false;
        }

        // Resolve merge fields and render.
        $values = $this->resolver->resolve($safeContext);
        $renderedSubject = $this->resolver->render($template->subject, $values);
        $renderedBody = $this->resolver->render($template->body, $values);

        if ($template->plaintext) {
            $renderedBody = strip_tags($renderedBody);
        }

        Mail::to($recipient->email)->queue(
            new TemplatedMessage($renderedSubject, $renderedBody, $template->plaintext)
        );

        $this->logSent($template, $slug, $recipient->email, $safeContext);

        return true;
    }

    /**
     * Resolve the best matching template for slug + recipient locale.
     * Fallback chain (G9): recipient locale → workspace default → 'en'.
     */
    private function resolveTemplate(string $slug, object $recipient): ?EmailTemplate
    {
        $recipientLocale = method_exists($recipient, 'preferredLocale')
            ? $recipient->preferredLocale()
            : ($recipient->locale ?? null);

        $workspace = currentWorkspace();
        $workspaceLocale = $workspace !== null ? ($workspace->locale ?? 'en') : 'en';

        $languages = array_unique(array_filter([
            $recipientLocale,
            $workspaceLocale,
            'en',
        ]));

        foreach ($languages as $language) {
            $template = EmailTemplate::query()
                ->forSlug($slug, $language)
                ->first();

            if ($template !== null) {
                return $template;
            }
        }

        return null;
    }

    /**
     * Log email.skipped activity against the primary subject entity (if any).
     *
     * @param  array<string, Model>  $safeContext
     */
    private function logSkipped(string $slug, string $recipientEmail, array $safeContext): void
    {
        $subject = $this->primarySubject($safeContext);

        if ($subject === null) {
            return;
        }

        $this->activityLogger->log($subject, 'email.skipped', [
            'slug' => $slug,
            'to' => $recipientEmail,
        ]);
    }

    /**
     * Log email.sent activity. PII minimal: only slug + email + status (spec §security).
     *
     * @param  array<string, Model>  $safeContext
     */
    private function logSent(EmailTemplate $template, string $slug, string $recipientEmail, array $safeContext): void
    {
        $subject = $this->primarySubject($safeContext);

        if ($subject === null) {
            return;
        }

        $this->activityLogger->log($subject, 'email.sent', [
            'slug' => $slug,
            'to' => $recipientEmail,
        ]);
    }

    /**
     * Pick the first entity from safe context as the activity subject.
     * Priority order matches ALLOWED_CONTEXT_KEYS.
     *
     * @param  array<string, Model>  $safeContext
     */
    private function primarySubject(array $safeContext): ?Model
    {
        foreach (self::ALLOWED_CONTEXT_KEYS as $key) {
            if (isset($safeContext[$key])) {
                return $safeContext[$key];
            }
        }

        return null;
    }
}
