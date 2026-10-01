import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import tailwindcssV4 from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';

// Console /admin dùng Tailwind 4 (component shadcn); mọi bề mặt khác giữ Tailwind 3.
const ADMIN_CSS = /resources[\\/]css[\\/]admin[\\/]/;

const tailwindPerSurface = () => ({
    postcssPlugin: 'tailwind-per-surface',
    async Once(root, { result }) {
        const file = root.source?.input.file ?? '';
        const plugin = ADMIN_CSS.test(file) ? tailwindcssV4() : tailwindcss();
        const processed = await postcss([plugin]).process(root, { ...result.opts, from: file });
        if (processed.root !== root) {
            root.removeAll();
            root.append(processed.root.nodes);
        }
        processed.messages.forEach(message => result.messages.push(message));
    },
});
tailwindPerSurface.postcss = true;

export default {
    plugins: [tailwindPerSurface(), autoprefixer()],
};
