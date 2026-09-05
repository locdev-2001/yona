// Đối tượng `getWidgetConfig` mà Widget.vue truyền xuống head/body/footer.
export interface WidgetPreviewConfig {
    welcomeHeading: string;
    welcomeTagline: string;
    welcomeTagLine?: string;
    websiteName: string;
    logo: string;
    isDefaultScreen: boolean;
    isOnline: boolean;
    replyTime: string;
    color: string;
}
