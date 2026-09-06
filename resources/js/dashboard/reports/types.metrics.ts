// Bộ mô tả một chỉ số trên trang Conversation (metrics computed của ReportContainer.vue).
export interface ReportMetric {
    NAME: string;
    KEY: string;
    DESC: string;
    INFO_TEXT?: string;
    trend: number;
}
