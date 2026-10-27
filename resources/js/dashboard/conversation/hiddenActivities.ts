import { locales } from '../../i18n/generated';
import { isProductFeatureVisible, type ProductFeature } from 'shared/helpers/productVisibility';
import { MESSAGE_TYPES } from './constants';

// Tin hoạt động của tính năng đã gỡ khỏi giao diện (gán người, team, trạng thái, độ ưu
// tiên) không hiện trong dòng chat. Tin cũ chỉ có nội dung chữ (không mang
// content_attributes), nên nhận diện theo mẫu câu của mọi ngôn ngữ — tin được viết bằng
// ngôn ngữ của tài khoản lúc sinh, không phải của người xem.
const ACTIVITY_GROUP_FEATURES: Record<string, ProductFeature> = {
    assignee: 'conversationAssignment',
    team: 'teams',
    status: 'conversationStatus',
    priority: 'conversationPriority',
};

const HIDDEN_ACTIVITY_GROUPS = Object.keys(ACTIVITY_GROUP_FEATURES).filter(
    group => !isProductFeatureVisible(ACTIVITY_GROUP_FEATURES[group]),
);

function templatesOf(bundle: Record<string, unknown>): string[] {
    const activity = (bundle.CONVERSATIONS as { activity?: Record<string, Record<string, string>> } | undefined)?.activity;

    return HIDDEN_ACTIVITY_GROUPS.flatMap(group => Object.values(activity?.[group] ?? {}));
}

function templatePattern(template: string): string {
    return template
        .split(/\{[a-z_]+\}/)
        .map(literal => literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('.+?');
}

const HIDDEN_ACTIVITY_PATTERNS = Object.values(locales).flatMap(templatesOf).map(templatePattern);
const HIDDEN_ACTIVITY_PATTERN =
    HIDDEN_ACTIVITY_PATTERNS.length > 0 ? new RegExp(`^(?:${HIDDEN_ACTIVITY_PATTERNS.join('|')})$`, 's') : null;

interface ActivityCandidate {
    message_type?: number | null;
    content?: string | null;
}

export function isHiddenActivity(message: ActivityCandidate): boolean {
    return (
        HIDDEN_ACTIVITY_PATTERN !== null &&
        message.message_type === MESSAGE_TYPES.ACTIVITY &&
        HIDDEN_ACTIVITY_PATTERN.test(message.content?.trim() ?? '')
    );
}

export function withoutHiddenActivities<T extends ActivityCandidate>(messages: T[]): T[] {
    return messages.some(isHiddenActivity) ? messages.filter(message => !isHiddenActivity(message)) : messages;
}
