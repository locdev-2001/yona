import { describe, expect, it } from 'vitest';

import { defaultTimezone, timezoneOptions } from './timezone';

const optionsOf = (zones: string[]) => timezoneOptions(zones, '');

describe('defaultTimezone', () => {
    it('picks the browser time zone when the list has it', () => {
        expect(defaultTimezone(optionsOf(['Africa/Abidjan', 'Europe/London', 'Asia/Ho_Chi_Minh']), 'Europe/London')).toBe(
            'Europe/London',
        );
    });

    it('matches the browser zone under its other name when the list only knows the legacy one', () => {
        expect(defaultTimezone(optionsOf(['Africa/Abidjan', 'Asia/Saigon']), 'Asia/Ho_Chi_Minh')).toBe('Asia/Saigon');
        expect(defaultTimezone(optionsOf(['Africa/Abidjan', 'Asia/Ho_Chi_Minh']), 'Asia/Saigon')).toBe(
            'Asia/Ho_Chi_Minh',
        );
    });

    it('falls back to Vietnam time, whichever name the list uses', () => {
        expect(defaultTimezone(optionsOf(['Africa/Abidjan', 'Asia/Saigon']), 'Mars/Olympus')).toBe('Asia/Saigon');
        expect(defaultTimezone(optionsOf(['Africa/Abidjan', 'Asia/Ho_Chi_Minh']), '')).toBe('Asia/Ho_Chi_Minh');
    });
});

describe('timezoneOptions', () => {
    it('labels zones without underscores', () => {
        expect(timezoneOptions(['America/New_York'], '')).toEqual([{ value: 'America/New_York', label: 'America/New York' }]);
    });

    it('still offers the browser zone and Vietnam time when the browser cannot list zones', () => {
        const options = timezoneOptions([], 'Europe/Paris');

        expect(options.map(option => option.value)).toEqual(['Europe/Paris', 'Asia/Ho_Chi_Minh']);
        expect(defaultTimezone(options, 'Europe/Paris')).toBe('Europe/Paris');
    });
});
