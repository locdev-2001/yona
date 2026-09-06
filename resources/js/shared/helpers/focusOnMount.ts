// Tương đương directive `v-focus` của bản gốc: dùng làm ref callback nên phần tử
// được focus ngay khi gắn vào DOM, kể cả khi component cha mới là chỗ mở/đóng
// (useEffect của component cha không chạy lại trong trường hợp đó).
export function focusOnMount(node: HTMLElement | null): void {
    node?.focus();
}
