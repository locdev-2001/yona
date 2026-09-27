import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { RenderError } from './render-error.mjs';

const PLAYER_PRESET_ENTRY = '@thorvg/lottie-player/sw-lite';
const PLAYER_ESM_BUNDLE = 'lottie-player.esm.js';
const WASM_FILE = 'thorvg.wasm';
const FACTORY_START = 'async function(t={}){';
const FACTORY_END = '}({locateFile:';
const SOFTWARE_ENGINE = 'sw';
const LOTTIE_MIME = 'json';
const RGBA_CHANNELS = 4;

function countOccurrences(text, needle) {
    return text.split(needle).length - 1;
}

function extractModuleFactorySource(bundleSource) {
    if (countOccurrences(bundleSource, FACTORY_START) !== 1 || countOccurrences(bundleSource, FACTORY_END) !== 1) {
        throw new RenderError('engine_unavailable', 'ThorVG module factory not found in player bundle');
    }
    const start = bundleSource.indexOf(FACTORY_START);
    const end = bundleSource.indexOf(FACTORY_END, start);

    return `export default ${bundleSource.slice(start, end + 1)};`;
}

async function loadThorvgModule() {
    let presetDirectory;
    try {
        presetDirectory = dirname(createRequire(import.meta.url).resolve(PLAYER_PRESET_ENTRY));
    } catch (error) {
        throw new RenderError('engine_unavailable', error.message);
    }

    const wasmPath = join(presetDirectory, WASM_FILE);
    const factorySource = extractModuleFactorySource(readFileSync(join(presetDirectory, PLAYER_ESM_BUNDLE), 'utf8'));
    const { default: createModule } = await import(`data:text/javascript;base64,${Buffer.from(factorySource).toString('base64')}`);
    const thorvg = await createModule({
        wasmBinary: readFileSync(wasmPath),
        locateFile: () => wasmPath,
    });
    thorvg.init();

    return thorvg;
}

export async function createLottieRasterizer(lottieJson) {
    const thorvg = await loadThorvgModule();
    const animation = new thorvg.TvgLottieAnimation(SOFTWARE_ENGINE, '');
    if (animation.error() !== 'None') {
        throw new RenderError('engine_unavailable', animation.error());
    }

    if (!animation.load(lottieJson, LOTTIE_MIME, 0, 0)) {
        throw new RenderError('load_failed', animation.error());
    }

    return {
        rasterize(frame, size) {
            animation.resize(size, size);
            animation.frame(frame);
            if (!animation.update()) {
                throw new RenderError('render_failed', animation.error());
            }

            const pixels = animation.render();
            if (pixels.length !== size * size * RGBA_CHANNELS) {
                throw new RenderError('render_failed', animation.error());
            }

            return Buffer.from(pixels);
        },

        get totalFrames() {
            return animation.totalFrame();
        },

        get durationSeconds() {
            return animation.duration();
        },
    };
}
