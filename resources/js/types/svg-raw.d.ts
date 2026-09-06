// Vite `?raw` import: nội dung tệp SVG dạng chuỗi (preview bố cục portal).
declare module '*.svg?raw' {
    const content: string;
    export default content;
}
