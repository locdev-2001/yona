#!/usr/bin/env node
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { Worker } from 'node:worker_threads';
import { DEFAULT_EDIT, parseEdit } from './edit-options.mjs';
import { RenderError } from './render-error.mjs';

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_TIMEOUT_MS = 60_000;
const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const MAX_EDIT_BYTES = 1024 * 1024;
const STICKER_FILE = 'sticker.webp';
const STATIC_FILE = 'static.png';
const TIMEOUT_OPTION = '--timeout-ms=';
const SIZE_OPTION = '--size=';
const STATIC_SIZE_OPTION = '--static-size=';
const EDIT_OPTION = '--edit=';
const DEFAULT_SIZE = 64;
const MIN_SIZE = 16;
const MAX_SIZE = 512;
const USAGE = 'Usage: render.mjs <input> <outDir> [--size=64] [--static-size=128] [--edit=<file.json>] [--timeout-ms=N]';
const WORKER_URL = new URL('./render-worker.mjs', import.meta.url);

function parseArguments(argv) {
    const positional = argv.filter((argument) => !argument.startsWith('--'));
    const options = argv.filter((argument) => argument.startsWith('--'));
    let timeoutMs = DEFAULT_TIMEOUT_MS;
    let size = DEFAULT_SIZE;
    let staticSize = null;
    let editPath = null;

    for (const option of options) {
        if (option.startsWith(TIMEOUT_OPTION)) {
            timeoutMs = integerOption(option, TIMEOUT_OPTION, 1, MAX_TIMEOUT_MS);
        } else if (option.startsWith(SIZE_OPTION)) {
            size = integerOption(option, SIZE_OPTION, MIN_SIZE, MAX_SIZE);
        } else if (option.startsWith(STATIC_SIZE_OPTION)) {
            staticSize = integerOption(option, STATIC_SIZE_OPTION, MIN_SIZE, MAX_SIZE);
        } else if (option.startsWith(EDIT_OPTION) && option.length > EDIT_OPTION.length) {
            editPath = resolve(option.slice(EDIT_OPTION.length));
        } else {
            throw new RenderError('usage', `Unknown option: ${option}`);
        }
    }
    if (positional.length !== 2) throw new RenderError('usage', USAGE);

    return { inputPath: resolve(positional[0]), outDir: resolve(positional[1]), timeoutMs, sizes: { size, staticSize: staticSize ?? size }, editPath };
}

function integerOption(option, prefix, min, max) {
    const value = Number(option.slice(prefix.length));
    if (!Number.isInteger(value) || value < min || value > max) {
        throw new RenderError('usage', `Invalid option: ${option}`);
    }

    return value;
}

async function readInput(inputPath) {
    let inputStat;
    try {
        inputStat = await stat(inputPath);
    } catch (error) {
        throw new RenderError('input_unreadable', error.message);
    }
    if (!inputStat.isFile()) {
        throw new RenderError('input_unreadable', `${inputPath} is not a file`);
    }
    if (inputStat.size > MAX_INPUT_BYTES) {
        throw new RenderError('input_too_large');
    }

    try {
        return await readFile(inputPath);
    } catch (error) {
        throw new RenderError('input_unreadable', error.message);
    }
}

async function readEdit(editPath) {
    if (!editPath) return DEFAULT_EDIT;
    let editText;
    try {
        if ((await stat(editPath)).size > MAX_EDIT_BYTES) throw new Error(`${editPath} exceeds ${MAX_EDIT_BYTES} bytes`);
        editText = await readFile(editPath, 'utf8');
    } catch (error) {
        throw new RenderError('usage', `Cannot read edit file: ${error.message}`);
    }
    try {
        return parseEdit(JSON.parse(editText));
    } catch (error) {
        if (error instanceof RenderError) throw error;
        throw new RenderError('usage', `Edit file is not valid JSON: ${error.message}`);
    }
}

function renderInWorker(inputBytes, edit, sizes, timeoutMs) {
    return new Promise((resolvePromise, rejectPromise) => {
        const worker = new Worker(WORKER_URL, { workerData: { inputBytes, edit, sizes } });
        let settled = false;
        const settle = (outcome) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutTimer);
            void worker.terminate();
            outcome();
        };
        const timeoutTimer = setTimeout(() => {
            settle(() => rejectPromise(new RenderError('timeout', `Render exceeded ${timeoutMs}ms`)));
        }, timeoutMs);

        worker.once('message', (message) => settle(() => {
            if (message.errorCode) {
                rejectPromise(new RenderError(message.errorCode, message.errorDetail));
                return;
            }
            resolvePromise(message.rendered);
        }));
        worker.once('error', (error) => settle(() => rejectPromise(new RenderError('render_failed', String(error?.stack ?? error)))));
        worker.once('exit', (exitCode) => settle(() => rejectPromise(new RenderError('render_failed', `Worker exited with code ${exitCode}`))));
    });
}

async function writeOutputs(outDir, rendered) {
    const stickerPath = join(outDir, STICKER_FILE);
    const staticPath = join(outDir, STATIC_FILE);
    try {
        await mkdir(outDir, { recursive: true });
        await writeFile(stickerPath, rendered.stickerWebp);
        await writeFile(staticPath, rendered.staticPng);
    } catch (error) {
        await Promise.all([rm(stickerPath, { force: true }), rm(staticPath, { force: true })]);
        throw new RenderError('output_failed', error.message);
    }

    return { image: stickerPath, static: staticPath };
}

async function main() {
    const { inputPath, outDir, timeoutMs, sizes, editPath } = parseArguments(process.argv.slice(2));
    const edit = await readEdit(editPath);
    const inputBytes = await readInput(inputPath);
    const rendered = await renderInWorker(inputBytes, edit, sizes, timeoutMs);
    const outputPaths = await writeOutputs(outDir, rendered);

    return { ...outputPaths, ...rendered.details };
}

try {
    process.stdout.write(`${JSON.stringify(await main())}\n`);
} catch (error) {
    const code = error instanceof RenderError ? error.code : 'render_failed';
    process.stderr.write(`${error?.stack ?? error}\n`);
    process.stdout.write(`${JSON.stringify({ error: code })}\n`);
    process.exitCode = 1;
}
