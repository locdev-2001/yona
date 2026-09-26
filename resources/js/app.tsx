import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';

import { documentTitle } from './documentTitle';

const pages = import.meta.glob([
    './v3/views/**/*.tsx',
    './dashboard/*.tsx',
    './dashboard/onboarding/*.tsx',
    './dashboard/settings/**/*.tsx',
    './dashboard/campaigns/*.tsx',
    './dashboard/contacts/*.tsx',
    './dashboard/helpcenter/pages/*.tsx',
    './dashboard/conversation/*.tsx',
    './dashboard/notifications/*.tsx',
    './dashboard/reports/*.tsx',
    './dashboard/search/*.tsx',
]);

createInertiaApp({
    title: documentTitle,
    resolve: name => {
        const importPage = pages[`./${name}.tsx`];
        if (!importPage) {
            throw new Error(`Page not found: ${name}`);
        }
        return importPage();
    },
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
    progress: {
        color: '#2781F6',
    },
});
