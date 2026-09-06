import { useCustomAttributesByModel } from 'dashboard/composables/useCustomAttributes';
import type { AttributeModel, CustomAttributeDefinition } from 'dashboard/composables/useCustomAttributes';

// Cửa duy nhất để lấy định nghĩa custom attribute cho panel hội thoại
// (getter `attributes/getAttributesByModel` của Chatwoot).
export type { CustomAttributeDefinition };

export function useCustomAttributeDefinitions(
    accountId: number,
    attributeType: AttributeModel,
): CustomAttributeDefinition[] {
    return useCustomAttributesByModel(accountId, attributeType);
}
