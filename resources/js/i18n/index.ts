import login from './locale/en/login.json';
import signup from './locale/en/signup.json';
import onboarding from './locale/en/onboarding.json';
import setNewPassword from './locale/en/setNewPassword.json';
import resetPassword from './locale/en/resetPassword.json';
import settings from './locale/en/settings.json';
import components from './locale/en/components.json';
import teamsSettings from './locale/en/teamsSettings.json';
import emojiIconPicker from './locale/en/emojiIconPicker.json';
import agentMgmt from './locale/en/agentMgmt.json';
import inboxMgmt from './locale/en/inboxMgmt.json';

const messages: Record<string, unknown> = {
    ...login,
    ...signup,
    ...onboarding,
    ...setNewPassword,
    ...resetPassword,
    ...settings,
    ...components,
    ...agentMgmt,
    ...teamsSettings,
    ...emojiIconPicker,
    ...inboxMgmt,
    GENERAL_SETTINGS: {
        BACK: 'Back',
    },
    GENERAL: {
        BETA: 'Beta',
        BETA_DESCRIPTION: 'This feature is in beta and may change as we improve it.',
    },
    COMMON: {
        OR: 'Or',
        CLICK_HERE: 'click here',
    },
};

// vue-i18n implicit plural: message dạng "a | b" (hoặc 3 nhánh zero|one|other)
// chọn nhánh theo named param `n`.
function pluralize(message: string, count: number): string {
    const choices = message.split('|').map(choice => choice.trim());
    if (choices.length < 2) return message;
    if (choices.length === 2) return count === 1 ? choices[0] : choices[1];

    return count === 0 ? choices[0] : count === 1 ? choices[1] : choices[2];
}

// Tương đương $t của vue-i18n bên Chatwoot (chỉ phần tra key lồng nhau
// mà các màn đã port cần; i18n đầy đủ + tiếng Việt vào ở nhóm G).
export function t(key: string, params?: Record<string, string | number>): string {
    const value = key
        .split('.')
        .reduce<unknown>(
            (node, part) =>
                node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
            messages,
        );

    if (typeof value !== 'string') return key;

    // vue-i18n escape dạng {'@'} → @, và nội suy {param}
    let result = value.replace(/\{'([^']*)'\}/g, '$1');
    if (typeof params?.n === 'number') {
        result = pluralize(result, params.n);
    }
    if (params) {
        result = result.replace(/\{(\w+)\}/g, (match, name: string) =>
            name in params ? String(params[name]) : match,
        );
    }
    return result;
}
