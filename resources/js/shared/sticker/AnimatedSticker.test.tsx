import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AnimatedSticker from './AnimatedSticker';

const POSTER_URL = 'https://cdn.yona.test/stickers/ab/poster.webp';

// Deploy ghi đè public/build hoặc mạng chập chờn: chunk trình phát không tải được.
vi.mock('./StickerPlayer', () => {
    throw new TypeError('Failed to fetch dynamically imported module');
});

async function settleLazyImport() {
    for (let tick = 0; tick < 5; tick++) {
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });
    }
}

describe('AnimatedSticker', () => {
    it('chunk trình phát tải lỗi thì giữ poster, không gỡ các tin bên cạnh', async () => {
        const { container } = render(
            <div>
                <p>Tin bên cạnh</p>
                <AnimatedSticker posterUrl={POSTER_URL} animationUrl="https://cdn.yona.test/anim.json" alt="Mèo vẫy" />
            </div>,
        );

        await settleLazyImport();

        expect(screen.getByText('Tin bên cạnh')).toBeInTheDocument();
        const poster = container.querySelector('img');
        expect(poster?.getAttribute('src')).toBe(POSTER_URL);
        expect(poster?.getAttribute('alt')).toBe('Mèo vẫy');
    });
});
