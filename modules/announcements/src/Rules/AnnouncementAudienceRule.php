<?php

namespace Modules\Announcements\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

/**
 * Locks the audience field to {"type":"all"} for v1.
 *
 * The data model supports richer targeting (plan/entitlement/workspace filter)
 * but v1 only exposes type=all. This rule + the DB CHECK constraint provide
 * defense-in-depth, preventing premature use of unreleased audience types.
 */
class AnnouncementAudienceRule implements ValidationRule
{
    /** @param  Closure(string, string=): PotentiallyTranslatedString  $fail */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        // Accept both array (already decoded) and JSON string forms.
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                $fail('The :attribute must be a valid audience object.')->translate();

                return;
            }
            $value = $decoded;
        }

        if (! is_array($value) || ($value['type'] ?? null) !== 'all' || count($value) !== 1) {
            $fail('The :attribute must be {"type":"all"} in v1.')->translate();
        }
    }
}
