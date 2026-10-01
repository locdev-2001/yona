// jsdom thiếu vài API trình duyệt mà bộ component (thanh bên, bảng lệnh, ô OTP) gọi tới.
export function installDomStubs({ width = 1440 }: { width?: number } = {}): void {
    if (!('ResizeObserver' in globalThis)) {
        globalThis.ResizeObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        } as unknown as typeof ResizeObserver;
    }

    window.matchMedia = (query: string) =>
        ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            addListener: () => {},
            removeListener: () => {},
            dispatchEvent: () => false,
        }) as MediaQueryList;

    Element.prototype.scrollIntoView ??= () => {};
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
}
