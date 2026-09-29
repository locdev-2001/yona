import { describe, expect, it } from 'vitest';

import capabilityMatrix from '../../../../../tests/Contracts/Channels/capability-matrix.snapshot.json';
import { declaredConfigurationSections, inboxSettingsTabKeys } from './inboxSettingsTabs';

// Đọc đúng ma trận năng lực backend đã chốt (contract snapshot), không dựng tay: kênh
// đổi khai báo ở backend thì bảng dưới đỏ ngay.
const declaredBy = (channel: keyof typeof capabilityMatrix) => ({ capabilities: capabilityMatrix[channel] });

const SHARED_TABS = ['inbox-settings', 'collaborators', 'business-hours', 'csat'];

describe('inboxSettingsTabKeys — mỗi kênh thấy đúng tab nó tự khai', () => {
    it.each([
        ['Channel::WebWidget', [...SHARED_TABS, 'pre-chat-form', 'configuration', 'bot-configuration']],
        ['Channel::Api', [...SHARED_TABS, 'configuration', 'bot-configuration']],
        ['Channel::Email', [...SHARED_TABS, 'configuration', 'bot-configuration']],
        ['Channel::Email (provider=google)', [...SHARED_TABS, 'bot-configuration']],
        ['Channel::Zalo', [...SHARED_TABS, 'bot-configuration']],
        ['Channel::Telegram', [...SHARED_TABS, 'bot-configuration']],
        ['Channel::Line', [...SHARED_TABS, 'bot-configuration']],
        ['Channel::TwilioSms', [...SHARED_TABS, 'bot-configuration']],
        ['Channel::Whatsapp (provider=whatsapp_cloud)', [...SHARED_TABS, 'bot-configuration']],
    ] as const)('%s', (channel, expectedTabs) => {
        expect(inboxSettingsTabKeys(declaredBy(channel))).toEqual(expectedTabs);
    });

    it('hộp thư chưa khai năng lực (payload rút gọn) chỉ có tab chung', () => {
        expect(inboxSettingsTabKeys({ capabilities: null })).toEqual([...SHARED_TABS, 'bot-configuration']);
    });
});

describe('declaredConfigurationSections', () => {
    it('chỉ trả khối kênh khai, đúng thứ tự hiện', () => {
        expect(declaredConfigurationSections(declaredBy('Channel::WebWidget'))).toEqual(['settings_web_widget']);
        expect(declaredConfigurationSections(declaredBy('Channel::Api'))).toEqual(['settings_client_api']);
        expect(declaredConfigurationSections(declaredBy('Channel::Email'))).toEqual(['settings_mail_server']);
        expect(
            declaredConfigurationSections({ capabilities: ['settings_client_api', 'settings_mail_server'] }),
        ).toEqual(['settings_mail_server', 'settings_client_api']);
    });
});
