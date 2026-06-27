/* prettier-ignore */
import {
createInertiaApp
} from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import ReactDOMServer from 'react-dom/server';
import { moduleToKebab } from './lib/module-kebab';

// SSR resolver mirrors app.tsx resolvePage logic with eager:true for SSR.
// Module pages use same Modules.{Module}.{Page} prefix convention.
const appPages = import.meta.glob('./pages/**/*.tsx', { eager: true });
const modulePages = import.meta.glob('../../modules/*/resources/js/pages/**/*.tsx', { eager: true });

function resolvePage(name) {
    if (name.startsWith('Modules.')) {
        const withoutPrefix = name.slice('Modules.'.length);
        const dotIdx = withoutPrefix.indexOf('.');
        const module = withoutPrefix.slice(0, dotIdx);
        const page = withoutPrefix.slice(dotIdx + 1);
        const kebab = moduleToKebab(module);
        const key = `../../modules/${kebab}/resources/js/pages/${page}.tsx`;
        return modulePages[key];
    }
    return appPages[`./pages/${name}.tsx`];
}

createServer((page) =>
    createInertiaApp({
        page,
        render: ReactDOMServer.renderToString,
        resolve: resolvePage,
        // prettier-ignore
        setup: ({ App, props }) => <App {...props} />,
    }),
);
