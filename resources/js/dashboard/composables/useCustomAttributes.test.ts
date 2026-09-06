import { describe, expect, it } from 'vitest';

import { toCamelAttribute } from './useCustomAttributes';
import type { CustomAttributeDefinition } from './useCustomAttributes';

// Port từ store/modules/specs/attributes/getters.spec.js — getter camelCase
// (getConversationAttributes/getContactAttributes) và lọc theo model.
const RECORDS: CustomAttributeDefinition[] = [
    {
        id: 1,
        attribute_display_name: 'Language',
        attribute_display_type: 'text',
        attribute_description: 'The conversation language',
        attribute_key: 'language',
        attribute_values: [],
        attribute_model: 'conversation_attribute',
    },
    {
        id: 2,
        attribute_display_name: 'Language one',
        attribute_display_type: 'list',
        attribute_description: 'The conversation language one',
        attribute_key: 'language_one',
        attribute_values: ['vi', 'en'],
        attribute_model: 'contact_attribute',
        regex_pattern: null,
        regex_cue: null,
    },
];

describe('lọc theo attribute_model', () => {
    it('chỉ trả thuộc tính của model được hỏi', () => {
        expect(
            RECORDS.filter(record => record.attribute_model === 'contact_attribute').map(
                record => record.attribute_key,
            ),
        ).toEqual(['language_one']);
    });
});

describe('toCamelAttribute', () => {
    it('đổi khoá sang camelCase đúng như camelcase-keys của gốc', () => {
        expect(toCamelAttribute(RECORDS[1])).toEqual({
            id: 2,
            attributeDisplayName: 'Language one',
            attributeDisplayType: 'list',
            attributeDescription: 'The conversation language one',
            attributeKey: 'language_one',
            attributeValues: ['vi', 'en'],
            attributeModel: 'contact_attribute',
            regexPattern: null,
            regexCue: null,
        });
    });

    it('mô tả và danh sách giá trị thiếu thành null/mảng rỗng', () => {
        const camel = toCamelAttribute({ ...RECORDS[0], attribute_description: null });
        expect(camel.attributeDescription).toBeNull();
        expect(camel.attributeValues).toEqual([]);
    });
});
