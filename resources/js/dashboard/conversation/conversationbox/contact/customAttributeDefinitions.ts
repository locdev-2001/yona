// Cửa duy nhất để lấy định nghĩa custom attribute (store `attributes` của
// Chatwoot, nạp bằng GET /custom_attribute_definitions). Backend yona chưa port
// bảng định nghĩa — thuộc nhóm E1, ghi nợ trong note B11. Khi E1 xong chỉ đổi
// hàm này, mọi nơi hiển thị thuộc tính ăn theo.
export interface CustomAttributeDefinition {
    id: number;
    attribute_key: string;
    attribute_display_name: string;
    attribute_display_type: string;
    attribute_description?: string;
    attribute_values?: string[];
    regex_pattern?: string | null;
    regex_cue?: string | null;
}

const NO_DEFINITIONS: CustomAttributeDefinition[] = [];

export function useCustomAttributeDefinitions(_attributeType: string): CustomAttributeDefinition[] {
    return NO_DEFINITIONS;
}
