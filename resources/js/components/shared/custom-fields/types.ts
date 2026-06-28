// Shared TypeScript types for the custom-fields engine (P02).
// Consumed by CustomFieldInput, CustomFieldsSection, and entity host pages.

export type FieldType = 'input' | 'number' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'date' | 'datetime' | 'color' | 'link';

export type EntityType = 'client' | 'contact' | 'lead' | 'project' | 'task';

export interface CustomFieldDefinition {
    id: string;
    entity_type: EntityType;
    name: string;
    slug: string;
    field_type: FieldType;
    options: string[];
    default_value: unknown;
    required: boolean;
    active: boolean;
    field_order: number;
    bs_column: number;
    show_on_table: boolean;
    show_on_client_portal: boolean;
    disallow_client_edit: boolean;
    only_admin: boolean;
    created_at: string;
    updated_at: string;
}
