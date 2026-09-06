// Hình dạng theo api/v1/models/_dashboard_app.json.jbuilder của Chatwoot.
export interface DashboardApp {
    id: number;
    title: string;
    content: { type: string; url: string }[];
}
