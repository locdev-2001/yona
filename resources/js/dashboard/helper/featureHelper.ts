// Link "Tìm hiểu thêm" ở đầu màn cài đặt, theo tên tính năng. Để trống cho tới khi
// Help Center có bài hướng dẫn — không có URL thì BaseSettingsHeader không hiện link.
const FEATURE_HELP_URLS: Record<string, string> = {};

export function getHelpUrlForFeature(featureName: string): string | undefined {
    return FEATURE_HELP_URLS[featureName];
}
