<?php

namespace App\Listeners;

use App\Events\MessageReceived;
use App\Modules\Chat\Store\PhoneEnrichmentService;
use Throwable;

/**
 * P05 — hook enrich SĐT qua listener (KHÔNG sửa IntakeService — file
 * ownership H2). Chạy INLINE trong ingest: TenantScope đã bind bởi webhook,
 * không cần queue job + RLS binding riêng (Codex HIGH). Fail-safe: lỗi enrich
 * KHÔNG được chặn ingest/broadcast (F13/F20).
 */
class LiftPhoneFromBusinessCard
{
    public function __construct(private readonly PhoneEnrichmentService $phoneEnrichment) {}

    public function handle(MessageReceived $event): void
    {
        try {
            $this->phoneEnrichment->liftFromBusinessCard($event->message);
        } catch (Throwable $e) {
            report($e);
        }
    }
}
