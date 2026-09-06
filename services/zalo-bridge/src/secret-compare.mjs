import { timingSafeEqual } from 'node:crypto';

/**
 * 8.10 — chỗ DUY NHẤT so secret/token trong bridge. So sánh `===` trên chuỗi thoát
 * ra ở byte đầu khác nhau, đủ để dò từng ký tự khi kẻ tấn công gọi được cổng
 * bridge; `timingSafeEqual` giữ thời gian gần-hằng. Chuỗi rỗng luôn từ chối để
 * cấu hình thiếu secret không thành đường vòng.
 */
export function safeEqual(a, b) {
    const ab = Buffer.from(String(a ?? ''));
    const bb = Buffer.from(String(b ?? ''));

    if (ab.length === 0 || bb.length === 0) {
        return false;
    }

    // length khác → so với chính mình để giữ thời gian gần-hằng, rồi từ chối
    if (ab.length !== bb.length) {
        timingSafeEqual(bb, bb);
        return false;
    }

    return timingSafeEqual(ab, bb);
}
