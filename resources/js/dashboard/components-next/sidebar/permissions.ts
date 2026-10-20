import type { AccountRole, SidebarMenuChild, SidebarMenuItem } from './provider';
import { COMPACT_INTERFACE, isProductFeatureVisible } from 'shared/helpers/productVisibility';

// isAllowed/shouldShow của sidebar: mục khai báo
// permissions chỉ hiện với role tương ứng, mục khai báo featureFlag chỉ hiện khi
// account bật cờ đó. Nhóm cha bị lọc sạch con thì ẩn, còn nhóm vốn rỗng
// (Folders/Teams… chờ dữ liệu) giữ nguyên như bản gốc.
function filterChildren<T extends SidebarMenuChild>(
    items: T[],
    role: AccountRole,
    features: Record<string, boolean>,
): T[] {
    const allowed: T[] = [];

    for (const item of items) {
        if (item.permissions && !item.permissions.includes(role)) continue;
        if (item.featureFlag && !features[item.featureFlag]) continue;
        if (item.productFeature && !isProductFeatureVisible(item.productFeature)) continue;

        if (!item.children) {
            allowed.push(item);
            continue;
        }

        const children = filterChildren(item.children, role, features);
        // Nhóm rỗng nhưng có nút riêng (Kênh khi ẩn hết) giữ lại để mở lại được.
        const keepsEmptyGroup = Boolean(item.headerAction || item.replacement);
        if (COMPACT_INTERFACE && children.length === 0 && !keepsEmptyGroup) continue;
        if (item.children.length > 0 && children.length === 0) continue;

        if (COMPACT_INTERFACE && item.collapseSingleChild && children.length === 1 && children[0].to) {
            allowed.push({ ...item, to: children[0].to, badgeCount: item.badgeCount ?? children[0].badgeCount, children: undefined });
            continue;
        }

        allowed.push({ ...item, children });
    }

    return allowed;
}

export function filterMenuByRole(
    items: SidebarMenuItem[],
    role: AccountRole,
    features: Record<string, boolean> = {},
): SidebarMenuItem[] {
    return filterChildren(items, role, features);
}
