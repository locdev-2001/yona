import { describe, expect, it } from 'vitest';

import { getCustomFields, getFormattedPreChatFields, getPreChatFields } from './preChat';
import type { CustomAttributeDefinition, PreChatField, PreChatFormOptions } from './preChat';

// Port từ dashboard/helper/specs/preChat.spec.js (+ inboxFixture.js).
const customFields = {
    pre_chat_message: 'Share your queries or comments here.',
    pre_chat_fields: [
        {
            label: 'Email Address',
            name: 'emailAddress',
            type: 'email',
            field_type: 'standard',
            required: false,
            enabled: false,
            placeholder: 'Please enter your email address',
        },
        {
            label: 'Full Name',
            name: 'fullName',
            type: 'text',
            field_type: 'standard',
            required: false,
            enabled: false,
            placeholder: 'Please enter your full name',
        },
        {
            label: 'Phone Number',
            name: 'phoneNumber',
            type: 'text',
            field_type: 'standard',
            required: false,
            enabled: false,
            placeholder: 'Please enter your phone number',
        },
    ] as PreChatField[],
};

const customAttributes: CustomAttributeDefinition[] = [
    {
        attribute_display_name: 'Order Id',
        attribute_display_type: 'number',
        attribute_key: 'order_id',
        attribute_model: 'conversation_attribute',
        attribute_values: [],
    },
];

const customAttributesWithRegex: CustomAttributeDefinition[] = [
    {
        attribute_display_name: 'Test contact Attribute',
        attribute_display_type: 'text',
        attribute_key: 'test_contact_attribute',
        attribute_model: 'contact_attribute',
        attribute_values: [],
        regex_pattern: '^w+$',
        regex_cue: 'It should be a combination of alphabets and numbers',
    },
];

// Chữ mặc định server cấp theo ngôn ngữ account (account vi).
const defaultsVi: PreChatFormOptions = {
    pre_chat_message: 'Bạn để lại vài thông tin để chúng tôi hỗ trợ nhanh hơn nhé.',
    pre_chat_fields: [
        { name: 'emailAddress', type: 'email', label: 'Email', placeholder: 'Vui lòng nhập email', required: true, enabled: false },
        { name: 'fullName', type: 'text', label: 'Tên đầy đủ', placeholder: 'Vui lòng nhập tên đầy đủ của bạn', required: false, enabled: false },
        { name: 'phoneNumber', type: 'text', label: 'Số điện thoại', placeholder: 'Vui lòng nhập số điện thoại của bạn', required: false, enabled: false },
    ],
};

describe('preChat helper', () => {
    it('trả lại đúng cấu hình khi không có thuộc tính tuỳ biến', () => {
        expect(getPreChatFields({ preChatFormOptions: customFields })).toEqual(customFields);
    });

    it('giữ nguyên nhãn/placeholder của trường chuẩn (khoá i18n là EMAIL_ADDRESS, không phải emailAddress)', () => {
        expect(getFormattedPreChatFields({ preChatFields: customFields.pre_chat_fields })).toEqual([
            {
                label: 'Email Address',
                name: 'emailAddress',
                placeholder: 'Please enter your email address',
                type: 'email',
                field_type: 'standard',
                required: false,
                enabled: false,
            },
            {
                label: 'Full Name',
                name: 'fullName',
                placeholder: 'Please enter your full name',
                type: 'text',
                field_type: 'standard',
                required: false,
                enabled: false,
            },
            {
                label: 'Phone Number',
                name: 'phoneNumber',
                placeholder: 'Please enter your phone number',
                type: 'text',
                field_type: 'standard',
                required: false,
                enabled: false,
            },
        ]);
    });

    it('lấy nhãn/placeholder mặc định do server cấp khi trường chuẩn chưa có', () => {
        expect(
            getFormattedPreChatFields({
                preChatFields: [{ label: '', name: 'emailAddress', type: 'email', required: false, enabled: false }],
                defaults: defaultsVi,
            }),
        ).toEqual([
            {
                label: 'Email',
                name: 'emailAddress',
                placeholder: 'Vui lòng nhập email',
                type: 'email',
                required: false,
                enabled: false,
            },
        ]);
    });

    describe('khi account tiếng Việt', () => {
        it('đổi nhãn tiếng Anh mặc định cũ của trường chuẩn sang tiếng Việt theo name', () => {
            const fields = getFormattedPreChatFields({
                preChatFields: [
                    { label: 'Email Id', name: 'emailAddress', type: 'email', required: true, enabled: false },
                    { label: 'Full name', name: 'fullName', type: 'text', required: false, enabled: false },
                    { label: 'Phone number', name: 'phoneNumber', type: 'text', required: false, enabled: false },
                ],
                defaults: defaultsVi,
            });

            expect(fields.map(field => [field.label, field.placeholder])).toEqual([
                ['Email', 'Vui lòng nhập email'],
                ['Tên đầy đủ', 'Vui lòng nhập tên đầy đủ của bạn'],
                ['Số điện thoại', 'Vui lòng nhập số điện thoại của bạn'],
            ]);
        });

        it('giữ nhãn quản trị viên đã tự đặt', () => {
            const [field] = getFormattedPreChatFields({
                preChatFields: [
                    {
                        label: 'Email công việc',
                        placeholder: 'ban@congty.vn',
                        name: 'emailAddress',
                        type: 'email',
                        required: true,
                        enabled: true,
                    },
                ],
                defaults: defaultsVi,
            });

            expect([field.label, field.placeholder]).toEqual(['Email công việc', 'ban@congty.vn']);
        });

        it('đổi lời nhắn mặc định cũ sang tiếng Việt, giữ lời nhắn tự đặt', () => {
            expect(getPreChatFields({ preChatFormOptions: customFields, defaults: defaultsVi }).pre_chat_message).toBe(
                'Bạn để lại vài thông tin để chúng tôi hỗ trợ nhanh hơn nhé.',
            );
            expect(
                getPreChatFields({ preChatFormOptions: { ...customFields, pre_chat_message: 'Chào bạn' }, defaults: defaultsVi })
                    .pre_chat_message,
            ).toBe('Chào bạn');
        });
    });

    it('dựng trường tuỳ biến cho thuộc tính chưa có trong danh sách', () => {
        expect(
            getCustomFields({
                standardFields: { pre_chat_fields: customFields.pre_chat_fields },
                customAttributes,
            }),
        ).toEqual([
            {
                enabled: false,
                label: 'Order Id',
                placeholder: 'Order Id',
                name: 'order_id',
                required: false,
                field_type: 'conversation_attribute',
                type: 'number',
                values: [],
                regex_pattern: undefined,
                regex_cue: undefined,
            },
        ]);
    });

    it('giữ regex_pattern/regex_cue của thuộc tính liên hệ', () => {
        expect(
            getCustomFields({
                standardFields: { pre_chat_fields: customFields.pre_chat_fields },
                customAttributes: customAttributesWithRegex,
            }),
        ).toEqual([
            {
                enabled: false,
                label: 'Test contact Attribute',
                placeholder: 'Test contact Attribute',
                name: 'test_contact_attribute',
                required: false,
                field_type: 'contact_attribute',
                type: 'text',
                values: [],
                regex_pattern: '^w+$',
                regex_cue: 'It should be a combination of alphabets and numbers',
            },
        ]);
    });

    it('bỏ qua thuộc tính đã có mặt trong pre_chat_fields', () => {
        expect(
            getCustomFields({
                standardFields: { pre_chat_fields: customFields.pre_chat_fields },
                customAttributes: [{ ...customAttributes[0], attribute_key: 'emailAddress' }],
            }),
        ).toEqual([]);
    });
});
