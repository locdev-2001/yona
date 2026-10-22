import { loadRnnoise, RnnoiseWorkletNode } from '@sapphi-red/web-noise-suppressor';
import workletUrl from '@sapphi-red/web-noise-suppressor/rnnoiseWorklet.js?url';
import wasmUrl from '@sapphi-red/web-noise-suppressor/rnnoise.wasm?url';
import simdUrl from '@sapphi-red/web-noise-suppressor/rnnoise_simd.wasm?url';

let binary: Promise<ArrayBuffer> | undefined;
const loadedContexts = new WeakSet<AudioContext>();

export class RnnoiseProcessor {
    readonly name = 'yona-rnnoise';
    processedTrack?: MediaStreamTrack;
    private context?: AudioContext;
    private ownsContext = false;
    private source?: MediaStreamAudioSourceNode;
    private filter?: RnnoiseWorkletNode;
    private destination?: MediaStreamAudioDestinationNode;

    constructor(private onError: () => void) {}

    async init(options: { track: MediaStreamTrack; audioContext?: AudioContext }) {
        this.ownsContext = options.audioContext?.sampleRate !== 48000;
        const context = this.ownsContext ? new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' }) : options.audioContext!;
        this.context = context;
        try {
            binary ??= loadRnnoise({ url: wasmUrl, simdUrl }, { signal: AbortSignal.timeout(8000) }).catch((error) => {
                binary = undefined;
                throw error;
            });
            const wasmBinary = await binary;
            if (!loadedContexts.has(context)) {
                await context.audioWorklet.addModule(workletUrl);
                loadedContexts.add(context);
            }
            this.source = context.createMediaStreamSource(new MediaStream([options.track]));
            this.filter = new RnnoiseWorkletNode(context, { maxChannels: 1, wasmBinary });
            this.filter.addEventListener('processorerror', this.onError);
            this.destination = context.createMediaStreamDestination();
            this.source.connect(this.filter).connect(this.destination);
            this.processedTrack = this.destination.stream.getAudioTracks()[0];
            await context.resume();
        } catch (error) {
            await this.destroy();
            throw error;
        }
    }

    async restart(options: { track: MediaStreamTrack; audioContext?: AudioContext }) {
        await this.destroy();
        await this.init(options);
    }

    async destroy() {
        this.source?.disconnect();
        this.filter?.removeEventListener('processorerror', this.onError);
        this.filter?.destroy();
        this.filter?.disconnect();
        this.destination?.disconnect();
        this.processedTrack?.stop();
        if (this.ownsContext && this.context?.state !== 'closed') await this.context?.close();
        this.source = undefined;
        this.filter = undefined;
        this.destination = undefined;
        this.processedTrack = undefined;
        this.context = undefined;
    }
}
