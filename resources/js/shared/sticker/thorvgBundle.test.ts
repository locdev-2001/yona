import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { thorvgWithoutCdnFallback } from './thorvgBuildPlugin';

// Wasm ThorVG phải luôn tự host: bundle không được giữ đường tải dự phòng từ CDN.

const CDN_HOSTS = /unpkg\.com|cdn\.jsdelivr\.net/;

const requireFromRoot = createRequire(path.resolve('package.json'));
const playerModulePath = path.join(
    path.dirname(requireFromRoot.resolve('@thorvg/lottie-player/sw-lite')),
    'lottie-player.esm.js',
);

type TransformResult = { code: string } | null;

function transform(code: string, id: string): TransformResult {
    const hook = thorvgWithoutCdnFallback().transform as (this: unknown, code: string, id: string) => TransformResult;
    const context = {
        error(message: string): never {
            throw new Error(message);
        },
    };
    return hook.call(context, code, id);
}

describe('bundle ThorVG sw-lite', () => {
    it('gỡ đường tải wasm từ CDN khỏi player, chỉ còn wasmUrl tự host', () => {
        const original = readFileSync(playerModulePath, 'utf8');
        expect(original).toMatch(CDN_HOSTS);

        const transformed = transform(original, playerModulePath);

        expect(transformed?.code).not.toMatch(CDN_HOSTS);
        expect(transformed?.code).toContain('this.wasmUrl||""');
    });

    it('nâng phiên bản mà không thấy chuỗi dự phòng thì dừng build', () => {
        expect(() => transform('export const player = 1;', playerModulePath)).toThrow(/@thorvg\/lottie-player/);
    });

    it('không đụng tới module khác', () => {
        expect(transform('const url = "https://unpkg.com/x";', '/app/resources/js/app.tsx')).toBeNull();
    });
});
