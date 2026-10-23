import {
    AdditiveBlending,
    BufferAttribute,
    BufferGeometry,
    Color,
    LineSegments,
    NormalBlending,
    OrthographicCamera,
    Scene,
    ShaderMaterial,
    Sphere,
    Vector3,
    WebGLRenderer,
} from 'three';

export type LineOrbMode = 'waiting' | 'live';

export interface LineOrbOptions {
    // [màu viền sáng, màu lõi] dạng CSS mà Color đọc được.
    colors: [string, string];
    isDark: boolean;
    readInputLevel: () => number;
    readOutputLevel: () => number;
}

const LAYER_COUNT = 140;
const POINTS_PER_LAYER = 256;
const VIEW_EXTENT = 1.2;
const LEVEL_EASING = 0.12;
const MAX_PIXEL_RATIO = 2;

// Mỗi đỉnh là một điểm trên một vòng: góc quanh tâm và lớp (0 = sát viền, 1 = lún sâu nhất).
// Nhiễu 3 chiều theo (hướng, lớp, thời gian) đẩy các vòng lún vào trong; các lớp kề nhau lệch
// nhau một chút nên hàng trăm sợi mảnh gộp thành những dải lụa gấp nếp dọc mép trong.
const VERTEX_SHADER = `
attribute float aAngle;
attribute float aLayer;
uniform float uTime;
uniform float uEnergy;
varying float vDepth;
varying float vLayer;
varying float vShade;

float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
        mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
        f.z
    );
}

void main() {
    float drift = uTime * 0.18;
    vec2 base = vec2(cos(aAngle), sin(aAngle));
    // Các lớp sâu hơn trượt góc theo nhiễu riêng nên sợi bắt chéo nhau, tạo nếp gấp sắc.
    float twist = (noise(vec3(base * 1.1 + 3.0, aLayer * 1.2 + drift * 0.8)) - 0.5) * aLayer * 0.8;
    float angle = aAngle + twist;
    vec2 direction = vec2(cos(angle), sin(angle));
    float field = noise(vec3(direction * 2.3, aLayer * 0.7 + drift))
        * 0.65 + noise(vec3(direction * 4.6 + 7.0, aLayer * 1.3 - drift * 1.4)) * 0.35;
    float ridge = pow(smoothstep(0.25, 0.9, field), 1.6);
    float depth = ridge * aLayer * (0.13 + 0.2 * uEnergy) + aLayer * 0.035;
    float breathe = 0.012 * sin(uTime * 0.8) + 0.03 * uEnergy;
    float radius = 1.0 + breathe - depth;
    vDepth = depth;
    vLayer = aLayer;
    // Từng mảng quanh vòng sáng lên rồi chìm đi, nên viền không bao giờ là một nét liền đặc.
    vShade = smoothstep(0.25, 0.85, noise(vec3(base * 1.5 - 2.0, drift * 0.6)));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(direction * radius, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
uniform vec3 uRim;
uniform vec3 uCore;
uniform float uAlpha;
uniform float uEnergy;
varying float vDepth;
varying float vLayer;
varying float vShade;

void main() {
    float fade = 1.0 - smoothstep(0.0, 0.55, vDepth);
    vec3 color = mix(uCore, uRim, fade);
    float alpha = uAlpha * (0.15 + 0.85 * vShade) * (0.55 + 0.45 * fade) * (0.6 + 0.8 * uEnergy);
    gl_FragColor = vec4(color, alpha);
}
`;

function buildGeometry(): BufferGeometry {
    const vertexCount = LAYER_COUNT * POINTS_PER_LAYER * 2;
    const angles = new Float32Array(vertexCount);
    const layers = new Float32Array(vertexCount);
    let cursor = 0;
    for (let layer = 0; layer < LAYER_COUNT; layer++) {
        const layerValue = layer / (LAYER_COUNT - 1);
        for (let point = 0; point < POINTS_PER_LAYER; point++) {
            for (const step of [point, point + 1]) {
                angles[cursor] = (step / POINTS_PER_LAYER) * Math.PI * 2;
                layers[cursor] = layerValue;
                cursor++;
            }
        }
    }
    const geometry = new BufferGeometry();
    // Vị trí thật tính trong shader; position chỉ để three.js biết số đỉnh.
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(vertexCount * 3), 3));
    geometry.setAttribute('aAngle', new BufferAttribute(angles, 1));
    geometry.setAttribute('aLayer', new BufferAttribute(layers, 1));
    geometry.boundingSphere = new Sphere(new Vector3(), 2);
    return geometry;
}

const clamp01 = (value: number) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);

// Quả cầu sợi sáng: một khối LineSegments, mọi biến dạng chạy trên GPU. Nền tối thì cộng sáng
// (sợi chồng nhau sáng lên), nền sáng thì phủ thường với màu đậm hơn để vẫn đọc được.
export class LineOrb {
    private readonly renderer: WebGLRenderer;
    private readonly scene = new Scene();
    private readonly camera = new OrthographicCamera(-VIEW_EXTENT, VIEW_EXTENT, VIEW_EXTENT, -VIEW_EXTENT, 0.1, 10);
    private readonly material: ShaderMaterial;
    private readonly geometry = buildGeometry();
    private readonly resizeObserver: ResizeObserver;
    private frame = 0;
    private mode: LineOrbMode = 'waiting';
    private energy = 0.3;
    private readonly startedAt = performance.now();

    constructor(
        private readonly canvas: HTMLCanvasElement,
        private options: LineOrbOptions,
    ) {
        this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true });
        this.renderer.setClearColor(0x000000, 0);
        this.camera.position.z = 1;
        this.material = new ShaderMaterial({
            vertexShader: VERTEX_SHADER,
            fragmentShader: FRAGMENT_SHADER,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            uniforms: {
                uTime: { value: 0 },
                uEnergy: { value: this.energy },
                uAlpha: { value: 0 },
                uRim: { value: new Color() },
                uCore: { value: new Color() },
            },
        });
        this.applyTheme(options);
        this.scene.add(new LineSegments(this.geometry, this.material));
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(canvas);
        this.resize();
    }

    update(options: Partial<LineOrbOptions>, mode?: LineOrbMode) {
        this.options = { ...this.options, ...options };
        if (options.colors || options.isDark !== undefined) this.applyTheme(this.options);
        if (mode) this.mode = mode;
    }

    start(animate: boolean) {
        let lastFrame = 0;
        const draw = (now: number) => {
            if (!document.hidden && now - lastFrame >= 1000 / 30 && this.canvas.clientWidth > 0 && this.canvas.clientHeight > 0) {
                lastFrame = now;
                this.step(now);
            }
            if (animate) this.frame = requestAnimationFrame(draw);
        };
        this.frame = requestAnimationFrame(draw);
    }

    dispose() {
        cancelAnimationFrame(this.frame);
        this.resizeObserver.disconnect();
        this.geometry.dispose();
        this.material.dispose();
        this.renderer.dispose();
    }

    private applyTheme({ colors, isDark }: LineOrbOptions) {
        const [rim, core] = colors;
        this.material.uniforms.uRim.value.set(rim);
        this.material.uniforms.uCore.value.set(core);
        this.material.blending = isDark ? AdditiveBlending : NormalBlending;
        this.material.uniforms.uAlpha.value = isDark ? 0.06 : 0.028;
        this.material.needsUpdate = true;
    }

    private resize() {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        if (!width || !height) return;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
        this.renderer.setSize(width, height, false);
        const aspect = width / height;
        this.camera.left = -VIEW_EXTENT * Math.max(aspect, 1);
        this.camera.right = VIEW_EXTENT * Math.max(aspect, 1);
        this.camera.top = VIEW_EXTENT / Math.min(aspect, 1);
        this.camera.bottom = -VIEW_EXTENT / Math.min(aspect, 1);
        this.camera.updateProjectionMatrix();
    }

    private step(now: number) {
        const seconds = (now - this.startedAt) / 1000;
        const target =
            this.mode === 'live'
                ? Math.max(clamp01(this.options.readInputLevel()) * 0.8, clamp01(this.options.readOutputLevel()))
                : 0.3 + 0.08 * Math.sin(seconds * 0.6);
        this.energy += (target - this.energy) * LEVEL_EASING;
        this.material.uniforms.uTime.value = seconds;
        this.material.uniforms.uEnergy.value = this.energy;
        this.renderer.render(this.scene, this.camera);
    }
}
