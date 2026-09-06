// Thay `useRoute().query` + `router.replace({ query })` của vue-router: đọc/ghi
// query string ngay trên URL hiện tại, không tạo mục lịch sử mới.

export function currentQuery(): Record<string, string> {
    return Object.fromEntries(new URLSearchParams(window.location.search).entries());
}

export function replaceQuery(params: Record<string, string>): void {
    const search = new URLSearchParams(params).toString();
    const nextUrl = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', nextUrl);
}
