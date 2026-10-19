// Hình dạng bản ghi dashboard app do API trả.
export interface DashboardApp {
    id: number;
    title: string;
    content: { type: string; url: string }[];
}
