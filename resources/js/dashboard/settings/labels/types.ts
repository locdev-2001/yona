// Payload của api/v1/models/_label.json.jbuilder.
export interface Label {
    id: number;
    title: string;
    description: string | null;
    color: string;
    show_on_sidebar: boolean;
}
