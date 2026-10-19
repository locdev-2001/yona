// Chỉ ẩn giao diện; không thay đổi quyền, cấu hình hay các tác vụ đang chạy.
// Tắt chế độ này để khôi phục toàn bộ bề mặt nâng cao.
export const COMPACT_INTERFACE = true;

const PRODUCT_FEATURE_VISIBILITY = {
    campaigns: false,
    helpCenter: false,
    detailedReports: false,
    conversationViews: false,
    contactViews: false,
    teams: false,
    widgetUpdates: false,
    widgetAi: false,
    widgetRequests: false,
    advancedChannels: false,
    customAttributes: false,
    automations: false,
    agentBots: false,
    macros: false,
    integrations: false,
    dataManagement: false,
    whatsappTemplates: false,
    workspaceSecurity: false,
    conversationWorkflow: false,
    csat: false,
    conversationMetadata: false,
    conversationParticipants: false,
    conversationPriority: false,
    // Hộp thư cá nhân (một người): không gán người phụ trách, không đóng/mở hội thoại,
    // không sửa hồ sơ liên hệ, không xem lại hội thoại trước của liên hệ.
    conversationAssignment: false,
    conversationStatus: false,
    contactProfileEditing: false,
    previousConversations: false,
    // Danh sách hội thoại gọn: không bộ lọc (trạng thái, kênh, nhãn), không chọn hàng loạt.
    listFilters: false,
    bulkActions: false,
} as const;

export type ProductFeature = keyof typeof PRODUCT_FEATURE_VISIBILITY;

export function isProductFeatureVisible(feature: ProductFeature): boolean {
    return !COMPACT_INTERFACE || PRODUCT_FEATURE_VISIBILITY[feature];
}
