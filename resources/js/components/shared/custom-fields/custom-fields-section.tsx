import { useTranslator } from '@/lib/i18n';
import type { CustomFieldValue } from '@/types';
import CustomFieldInput from './custom-field-input';
import type { CustomFieldDefinition } from './types';

interface Props {
    /** Active definitions for this entity type (ordered, active only). */
    definitions: CustomFieldDefinition[];
    /** Current custom_fields bag from the host form (slug → value). */
    values: Record<string, CustomFieldValue>;
    /** Validation errors keyed by slug (from host form errors). */
    errors?: Record<string, string>;
    /** Called when any field changes — host form owns the state. */
    onChange: (slug: string, value: CustomFieldValue) => void;
    /** When true, all fields are read-only (e.g. client portal view). */
    disabled?: boolean;
}

/**
 * Reusable custom-fields section for any entity host form (P02, C1).
 * Controlled — does NOT own state or submit; the host useForm owns both.
 * Entity host pages (P06-09) import this and wire values/onChange to their useForm.
 *
 * Values live in entity.custom_fields JSONB (key = slug).
 */
export default function CustomFieldsSection({ definitions, values, errors = {}, onChange, disabled = false }: Props) {
    const t = useTranslator();

    if (definitions.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4">
            <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">{t('custom_fields.title')}</p>
            <div className="grid grid-cols-12 gap-4">
                {definitions.map((definition) => (
                    <div
                        key={definition.slug}
                        // bs_column controls layout width (should — full-width also accepted in M1)
                        className={`col-span-12 lg:col-span-${definition.bs_column}`}
                    >
                        <CustomFieldInput
                            definition={definition}
                            value={values[definition.slug] ?? null}
                            error={errors[definition.slug]}
                            onChange={onChange}
                            disabled={disabled || definition.disallow_client_edit}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
