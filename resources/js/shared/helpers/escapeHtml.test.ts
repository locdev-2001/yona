import { describe, expect, it } from 'vitest';

import { escapeHtml } from './escapeHtml';

describe('escapeHtml', () => {
    it('mã hoá năm ký tự đặc biệt của HTML, giữ nguyên chữ tiếng Việt', () => {
        expect(escapeHtml(`<b>Hà & "My"</b> 'vip'`)).toBe('&lt;b&gt;Hà &amp; &quot;My&quot;&lt;/b&gt; &#39;vip&#39;');
    });
});
