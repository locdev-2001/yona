import { describe, expect, it } from 'vitest';

import {
    buildPreChatSubmission,
    enabledPreChatFields,
    filterPreChatFields,
    findFieldType,
    firstFailingRule,
    validationRulesFor,
    valueForField,
} from './preChatHelpers';
import type { PreChatField, WidgetContact } from '../types';

// Port từ widget/components/PreChat/specs/Form.spec.js + phần thuần của Form.vue.
const field = (overrides: Partial<PreChatField>): PreChatField => ({
    field_type: 'standard',
    label: 'Label',
    name: 'text',
    type: 'text',
    required: false,
    enabled: true,
    ...overrides,
});

const contact = (overrides: Partial<WidgetContact>): WidgetContact => ({
    id: 1,
    pubsub_token: 'token',
    ...overrides,
});

describe('validationRulesFor', () => {
    it('checkbox bắt buộc dùng luật accepted', () => {
        expect(validationRulesFor(field({ type: 'checkbox', name: 'checkbox', required: true }))).toEqual([
            'accepted',
        ]);
    });

    it('checkbox không bắt buộc dùng luật optional', () => {
        expect(validationRulesFor(field({ type: 'checkbox', name: 'checkbox' }))).toEqual(['optional']);
    });

    it('trường text bắt buộc chỉ có luật required', () => {
        expect(validationRulesFor(field({ type: 'text', name: 'text', required: true }))).toEqual(['required']);
    });

    it('gộp luật nền với luật theo kiểu của email', () => {
        expect(
            validationRulesFor(field({ type: 'email', name: 'emailAddress', required: true })),
        ).toEqual(['required', 'email']);
    });

    it('điện thoại có hai luật riêng dù kiểu khai báo là text', () => {
        expect(validationRulesFor(field({ type: 'text', name: 'phoneNumber' }))).toEqual([
            'optional',
            'startsWithPlus',
            'isValidPhoneNumber',
        ]);
    });

    it('trường ngoài bảng không kiểm gì', () => {
        expect(validationRulesFor(field({ type: 'colour', name: 'favourite', field_type: 'standard' }))).toEqual(
            [],
        );
    });

    it('thuộc tính tuỳ biến có regex thì thêm luật matches', () => {
        expect(
            validationRulesFor(
                field({
                    type: 'text',
                    name: 'order_id',
                    field_type: 'contact_attribute',
                    regex_pattern: '/^[0-9]+$/',
                }),
            ),
        ).toEqual(['optional', 'matches']);
    });
});

describe('firstFailingRule', () => {
    it('trường bắt buộc bỏ trống hỏng ở required', () => {
        expect(firstFailingRule(field({ name: 'emailAddress', type: 'email', required: true }), '')).toBe(
            'required',
        );
    });

    it('email sai định dạng hỏng ở email chứ không phải required', () => {
        expect(firstFailingRule(field({ name: 'emailAddress', type: 'email', required: true }), 'abc')).toBe(
            'email',
        );
    });

    it('email đúng định dạng thì qua', () => {
        expect(
            firstFailingRule(field({ name: 'emailAddress', type: 'email', required: true }), 'a@acme.inc'),
        ).toBeNull();
    });

    it('trường không bắt buộc bỏ trống thì bỏ qua các luật còn lại', () => {
        expect(firstFailingRule(field({ name: 'phoneNumber', type: 'text' }), '')).toBeNull();
    });

    it('số điện thoại thiếu dấu + hỏng ở startsWithPlus', () => {
        expect(firstFailingRule(field({ name: 'phoneNumber', type: 'text' }), '84912345678')).toBe(
            'startsWithPlus',
        );
    });

    it('số điện thoại quá ngắn hỏng ở isValidPhoneNumber', () => {
        expect(firstFailingRule(field({ name: 'phoneNumber', type: 'text' }), '+8412')).toBe(
            'isValidPhoneNumber',
        );
    });

    it('số điện thoại hợp lệ thì qua', () => {
        expect(firstFailingRule(field({ name: 'phoneNumber', type: 'text' }), '+84912345678')).toBeNull();
    });

    it('regex của thuộc tính tuỳ biến bỏ cờ g để lần gõ sau không lệch kết quả', () => {
        const withRegex = field({
            name: 'order_id',
            type: 'text',
            field_type: 'contact_attribute',
            regex_pattern: '/^[0-9]+$/g',
        });
        expect(firstFailingRule(withRegex, '123')).toBeNull();
        expect(firstFailingRule(withRegex, '123')).toBeNull();
        expect(firstFailingRule(withRegex, '12a')).toBe('matches');
    });
});

describe('filterPreChatFields', () => {
    const fields = [
        field({ name: 'emailAddress', type: 'email' }),
        field({ name: 'fullName' }),
        field({ name: 'phoneNumber' }),
    ];

    it('giữ nguyên khi chưa biết gì về khách', () => {
        expect(filterPreChatFields(fields, contact({})).map(item => item.name)).toEqual([
            'emailAddress',
            'fullName',
            'phoneNumber',
        ]);
    });

    it('đã có email thì bỏ cả email lẫn tên', () => {
        expect(filterPreChatFields(fields, contact({ has_email: true })).map(item => item.name)).toEqual([
            'phoneNumber',
        ]);
    });

    it('chỉ có identifier cũng đủ để bỏ trường tên', () => {
        expect(filterPreChatFields(fields, contact({ identifier: 'u-1' })).map(item => item.name)).toEqual([
            'emailAddress',
            'phoneNumber',
        ]);
    });

    it('enabledPreChatFields lọc tiếp theo cờ bật', () => {
        const mixed = [field({ name: 'emailAddress', type: 'email', enabled: false }), field({ name: 'fullName' })];
        expect(enabledPreChatFields(mixed, null).map(item => item.name)).toEqual(['fullName']);
    });
});

describe('valueForField và buildPreChatSubmission', () => {
    it('kiểu list đọc giá trị theo chỉ số đã chọn', () => {
        const select = field({ name: 'plan', type: 'list', values: ['Free', 'Pro'] });
        expect(valueForField(select, { plan: '1' })).toBe('Pro');
    });

    it('findFieldType ánh xạ link/list sang url/select', () => {
        expect(findFieldType('link')).toBe('url');
        expect(findFieldType('list')).toBe('select');
        expect(findFieldType('text')).toBe('text');
    });

    it('giá trị rỗng thành null', () => {
        expect(valueForField(field({ name: 'fullName' }), {})).toBeNull();
    });

    it('tách thuộc tính liên hệ và thuộc tính hội thoại theo field_type', () => {
        const fields = [
            field({ name: 'emailAddress', type: 'email' }),
            field({ name: 'order_id', type: 'text', field_type: 'conversation_attribute' }),
            field({ name: 'company', type: 'text', field_type: 'contact_attribute' }),
        ];

        expect(
            buildPreChatSubmission(fields, {
                emailAddress: 'a@acme.inc',
                fullName: 'John',
                phoneNumber: '+84912345678',
                message: 'Hi',
                order_id: 'OD-1',
                company: 'Acme',
            }),
        ).toEqual({
            fullName: 'John',
            emailAddress: 'a@acme.inc',
            phoneNumber: '+84912345678',
            message: 'Hi',
            conversationCustomAttributes: { order_id: 'OD-1' },
            contactCustomAttributes: { company: 'Acme' },
        });
    });
});
