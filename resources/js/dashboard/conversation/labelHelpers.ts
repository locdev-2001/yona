import type { AccountLabel } from './labelApi';

// Hàm thuần dùng chung cho khối nhãn: store nhãn account (store/modules/labels.js),
// LabelBox (composables/useConversationLabels.js), thẻ danh sách
// (conversationCardComponents/CardLabels.vue) và thanh bulk (BulkLabelActions.vue).

// labels/get: danh sách nhãn account luôn sắp theo title.
export function sortLabelsByTitle(labels: AccountLabel[]): AccountLabel[] {
    return [...labels].sort((first, second) => first.title.localeCompare(second.title));
}

// getter labels/getLabelsOnSidebar.
export function labelsOnSidebar(labels: AccountLabel[]): AccountLabel[] {
    return sortLabelsByTitle(labels.filter(label => label.show_on_sidebar));
}

// useConversationLabels#activeLabels — giữ thứ tự của danh sách nhãn account.
export function activeLabels(accountLabels: AccountLabel[], savedTitles: string[]): AccountLabel[] {
    return accountLabels.filter(({ title }) => savedTitles.includes(title));
}

// useConversationLabels#inactiveLabels — nhãn còn lại có thể thêm vào hội thoại.
export function inactiveLabels(accountLabels: AccountLabel[], savedTitles: string[]): AccountLabel[] {
    return accountLabels.filter(({ title }) => !savedTitles.includes(title));
}

// useConversationLabels#addLabelToConversation: danh sách gửi lên = nhãn đang có + nhãn mới.
export function titlesAfterAdd(currentActiveLabels: AccountLabel[], title: string): string[] {
    return [...currentActiveLabels.map(label => label.title), title];
}

// useConversationLabels#removeLabelFromConversation.
export function titlesAfterRemove(currentActiveLabels: AccountLabel[], title: string): string[] {
    return currentActiveLabels.map(label => label.title).filter(candidate => candidate !== title);
}

// BulkLabelActions#toggleLabelSelection — chọn/bỏ chọn nhiều nhãn trước khi xác nhận.
export function toggleLabelSelection(selectedTitles: string[], title: string): string[] {
    return selectedTitles.includes(title)
        ? selectedTitles.filter(candidate => candidate !== title)
        : [...selectedTitles, title];
}

// BulkLabelActions#visibleLabels: nút "gỡ nhãn" chỉ liệt kê nhãn đang gắn trên lựa chọn.
export function labelsForRemoval(
    accountLabels: AccountLabel[],
    appliedTitles: string[] | null,
): AccountLabel[] {
    if (appliedTitles === null) return accountLabels;

    const applied = new Set(appliedTitles);

    return accountLabels.filter(label => applied.has(label.title));
}

// Index.vue#appliedLabelsForSelection — hợp mọi nhãn của các hội thoại đang chọn.
export function appliedLabelsForSelection(
    conversations: { id: number; labels?: string[] }[],
    selectedIds: number[],
): string[] {
    const applied = new Set<string>();

    selectedIds.forEach(id => {
        conversations.find(conversation => conversation.id === id)?.labels?.forEach(label => applied.add(label));
    });

    return Array.from(applied);
}

// Cùng ngữ nghĩa với ConversationFinder::filterByLabels: mang BẤT KỲ nhãn nào đang lọc
// là khớp — realtime phải đưa vào danh sách đúng những hội thoại API trả về.
export function matchesLabels(conversationLabels: string[] | undefined, labels: string[]): boolean {
    if (!labels.length) return true;

    return labels.some(label => (conversationLabels ?? []).includes(label));
}
