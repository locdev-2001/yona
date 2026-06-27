<?php

namespace Database\Seeders;

use Modules\Email\Models\EmailTemplate;
use Illuminate\Database\Seeder;

/**
 * P05 — Seeds the email template catalog for M1 triggers.
 *
 * G9: P05 owns ALL template seeding. P07 calls TemplatedMailer::send() only;
 * it NEVER seeds. This seeder is the single source of truth for template catalog.
 *
 * Seeds vi + en versions for each slug (G1 — no ja).
 * Idempotent: manual exists-check + new-instance assignment because slug/type/language
 * are $guarded on EmailTemplate (server-controlled by design — not mass-assignable).
 *
 * TODO: Hook into WorkspaceProvisioningService::seedDefaults() to auto-seed
 * email templates when a new workspace is created (P01 registration flow).
 */
class EmailTemplateCatalogSeeder extends Seeder
{
    /**
     * Catalog of templates to seed. Only M1 trigger slugs are included.
     *
     * @return list<array<string, string>>
     */
    private function catalog(): array
    {
        return [
            [
                'slug' => 'lead_assigned',
                'type' => 'leads',
                'name_vi' => 'Lead được phân công',
                'name_en' => 'Lead Assigned',
                'subject_vi' => 'Bạn được phân công lead: {lead_name}',
                'body_vi' => '<p>Xin chào {assignee_name},</p><p>Lead <strong>{lead_name}</strong> vừa được phân công cho bạn.</p><p>Email liên hệ: {lead_email}</p><p>Trân trọng,<br>{company_name}</p>',
                'subject_en' => 'Lead assigned to you: {lead_name}',
                'body_en' => '<p>Hi {assignee_name},</p><p>Lead <strong>{lead_name}</strong> has been assigned to you.</p><p>Contact email: {lead_email}</p><p>Best regards,<br>{company_name}</p>',
            ],
        ];
    }

    public function run(): void
    {
        $workspaceId = currentWorkspace()->id;

        foreach ($this->catalog() as $entry) {
            $this->seedVariant($workspaceId, $entry, 'vi');
            $this->seedVariant($workspaceId, $entry, 'en');
        }
    }

    /**
     * Seed one language variant. Uses explicit model property assignment because
     * slug/type/language are $guarded on EmailTemplate (server-controlled design).
     *
     * @param  array<string, string>  $entry
     */
    private function seedVariant(string $workspaceId, array $entry, string $language): void
    {
        $exists = EmailTemplate::where('workspace_id', $workspaceId)
            ->where('slug', $entry['slug'])
            ->where('language', $language)
            ->exists();

        if ($exists) {
            return; // idempotent
        }

        $template = new EmailTemplate;
        $template->workspace_id = $workspaceId;
        $template->slug = $entry['slug'];
        $template->type = $entry['type'];
        $template->language = $language;
        $template->name = $entry["name_{$language}"];
        $template->subject = $entry["subject_{$language}"];
        $template->body = $entry["body_{$language}"];
        $template->plaintext = false;
        $template->active = true;
        $template->sort_order = 0;
        $template->save();
    }
}
