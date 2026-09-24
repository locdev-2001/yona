import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setLocale } from '../../../../i18n';
import { deletedMessageLabel } from './deletedMessage';

describe('deletedMessageLabel', () => {
    beforeAll(() => setLocale('vi'));
    afterAll(() => setLocale('en'));

    it('trả nhãn theo ngôn ngữ người xem cho tin đã xoá', () => {
        expect(deletedMessageLabel({ deleted: true })).toBe('Tin nhắn đã bị xoá');
    });

    it('tin thường không có nhãn', () => {
        expect(deletedMessageLabel({})).toBeNull();
        expect(deletedMessageLabel(null)).toBeNull();
    });
});
