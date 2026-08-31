import type { AccountRole, SidebarMenuChild, SidebarMenuItem } from './provider';

// Tương đương isAllowed/shouldShow của sidebar Chatwoot: mục khai báo
// permissions chỉ hiện với role tương ứng. Nhóm cha bị lọc sạch con thì ẩn,
// còn nhóm vốn rỗng (Folders/Teams… chờ dữ liệu) giữ nguyên như bản gốc.
function filterChildren<T extends SidebarMenuChild>(items: T[], role: AccountRole): T[] {
    const allowed: T[] = [];

    for (const item of items) {
        if (item.permissions && !item.permissions.includes(role)) continue;

        if (!item.children) {
            allowed.push(item);
            continue;
        }

        const children = filterChildren(item.children, role);
        if (item.children.length > 0 && children.length === 0) continue;

        allowed.push({ ...item, children });
    }

    return allowed;
}

export function filterMenuByRole(items: SidebarMenuItem[], role: AccountRole): SidebarMenuItem[] {
    return filterChildren(items, role);
}
