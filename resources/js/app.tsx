import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';

const pages = import.meta.glob([
    './v3/views/**/*.tsx',
    './dashboard/*.tsx',
    './dashboard/onboarding/*.tsx',
]);

createInertiaApp({
    title: title => (title ? `${title} — Yona` : 'Yona'),
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
