<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * P05 — Queued mailable for pre-rendered email template messages.
 *
 * The subject and body are already rendered by TemplatedMailer before this
 * mailable is constructed — no merge logic here (DRY, simplifies testing).
 *
 * Implements ShouldQueue to avoid blocking the HTTP request (spec requirement).
 * plaintext=true triggers plain-text content; otherwise HTML is used.
 */
class TemplatedMessage extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        private readonly string $renderedSubject,
        private readonly string $renderedBody,
        private readonly bool $isPlaintext,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->renderedSubject);
    }

    public function content(): Content
    {
        if ($this->isPlaintext) {
            return new Content(text: 'emails.raw-text', with: ['body' => $this->renderedBody]);
        }

        return new Content(htmlString: $this->renderedBody);
    }
}
