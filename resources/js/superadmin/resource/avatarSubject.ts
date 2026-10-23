import type { AvatarSubject } from 'shared/avatar/avatarSeed';

// Tài nguyên console nào là một chủ thể có avatar ở dashboard, để cùng người/tài khoản ra cùng một hình.
const RESOURCE_AVATAR_SUBJECTS: Record<string, AvatarSubject> = {
    accounts: 'account',
    users: 'user',
    'agent-bots': 'agent_bot',
};

export function resourceAvatarSubject(resource: string): AvatarSubject | undefined {
    return RESOURCE_AVATAR_SUBJECTS[resource];
}
