#!/usr/bin/env node
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { Worker } from 'node:worker_threads';
import { RenderError } from './render-error.mjs';

const DEFAULT_TIMEOUT_MS = 5000;
const MAX_TIMEOUT_MS = 60_000;
const MAX_INPUT_BYTES = 2 * 1024 * 1024;
const POSTER_FILE = 'poster.webp';
const STATIC_FILE = 'static.png';
const TIMEOUT_OPTION = '--timeout-ms=';
const WORKER_URL = new URL('./render-worker.mjs', import.meta.url);

function parseArguments(argv) {
    const positional = argv.filter((argument) => !argument.startsWith('--'));
    const options = argv.filter((argument) => argument.startsWith('--'));
    let timeoutMs = DEFAULT_TIMEOUT_MS;

    for (const option of options) {
        const requestedTimeout = option.startsWith(TIMEOUT_OPTION) ? Number(option.slice(TIMEOUT_OPTION.length)) : NaN;
        if (!Number.isInteger(requestedTimeout) || requestedTimeout <= 0 || requestedTimeout > MAX_TIMEOUT_MS) {
            throw new RenderError('usage', `Unknown or invalid option: ${option}`);
        }
        timeoutMs = requestedTimeout;
    }
    if (positional.length !== 2) {
        throw new RenderError('usage', 'Usage: render.mjs <input.json|input.tgs> <outDir> [--timeout-ms=N]');
    }

    return { inputPath: resolve(positional[0]), outDir: resolve(positional[1]), timeoutMs };
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

function renderInWorker(inputBytes, timeoutMs) {
    return new Promise((resolvePromise, rejectPromise) => {
        const worker = new Worker(WORKER_URL, { workerData: { inputBytes } });
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
    const posterPath = join(outDir, POSTER_FILE);
    const staticPath = join(outDir, STATIC_FILE);
    try {
        await mkdir(outDir, { recursive: true });
        await writeFile(posterPath, rendered.posterWebp);
        await writeFile(staticPath, rendered.staticPng);
    } catch (error) {
        await Promise.all([rm(posterPath, { force: true }), rm(staticPath, { force: true })]);
        throw new RenderError('output_failed', error.message);
    }

    return { poster: posterPath, static: staticPath };
}

async function main() {
    const { inputPath, outDir, timeoutMs } = parseArguments(process.argv.slice(2));
    const inputBytes = await readInput(inputPath);
    const rendered = await renderInWorker(inputBytes, timeoutMs);
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
