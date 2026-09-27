export class RenderError extends Error {
    constructor(code, detail = code) {
        super(detail);
        this.name = 'RenderError';
        this.code = code;
    }
}
