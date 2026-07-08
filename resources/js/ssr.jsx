/* prettier-ignore */
import {
createInertiaApp
} from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import ReactDOMServer from 'react-dom/server';

const appPages = import.meta.glob('./pages/**/*.tsx', { eager: true });

function resolvePage(name) {
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
