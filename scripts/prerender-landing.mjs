import { writeFile } from 'node:fs/promises';

import { renderLanding } from '../storage/framework/landing-prerender/render.mjs';

const localeCodes = ['vi', 'en'];
const placeholderPaths = [
    'brand.name',
    'brand.logo',
    'urls.home',
    'urls.login',
    'urls.register',
    'urls.dashboard',
    'urls.terms',
    'urls.privacy',
    'legalNav.heading',
    'legalNav.terms',
    'legalNav.privacy',
    'locales.0.label',
    'locales.0.url',
    'locales.1.label',
    'locales.1.url',
];
const placeholders = Object.fromEntries(placeholderPaths.map((path, index) => [`__YONA_VALUE_${index}__`, path]));
placeholders['987654321'] = 'year';

function assignPath(config, path, value) {
    const segments = path.split('.');
    const property = segments.pop();
    const parent = segments.reduce((current, segment) => current[segment], config);
    parent[property] = value;
}

const templates = {};

for (const locale of localeCodes) {
    templates[locale] = {};

    for (const isAuthenticated of [false, true]) {
        const config = {
            page: 'home',
            meta: { title: '', description: '' },
            brand: {},
            urls: {},
            legalNav: {},
            year: 987654321,
            locale,
            locales: localeCodes.map((code) => ({ code })),
            isAuthenticated,
        };

        for (const [marker, path] of Object.entries(placeholders)) {
            if (path !== 'year') assignPath(config, path, marker);
        }

        templates[locale][isAuthenticated ? 'authenticated' : 'guest'] = renderLanding(config);
    }
}

await writeFile(
    new URL('../public/build/landing-prerender.json', import.meta.url),
    JSON.stringify({ version: 1, localeCodes, placeholders, templates }),
);
console.log('Đã render sẵn trang chủ Việt/Anh cho khách và người đã đăng nhập.');
