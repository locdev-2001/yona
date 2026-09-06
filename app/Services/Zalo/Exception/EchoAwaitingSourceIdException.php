<?php

namespace App\Services\Zalo\Exception;

use RuntimeException;

/**
 * Tin dội lại (echo) của một tin CHÍNH Yona vừa gửi có thể tới trước khi driver
 * kịp ghi msgId của phần đó vào `content_attributes.external_source_ids` — một
 * tin nhiều phần gửi nhiều lượt qua bridge, phần sau dội về trong lúc phần
 * trước còn đang ghi. Dựng tin ngay lúc đó là sinh bong bóng ma.
 *
 * Driver ném ngoại lệ này để lớp hàng đợi hoãn sự kiện lại một nhịp; hết lượt
 * chờ thì lớp đó gọi lại kèm cờ `IncomingMessageService::ECHO_WAIT_EXHAUSTED`
 * và tin được dựng như bình thường (chủ shop gửi từ điện thoại thật).
 */
class EchoAwaitingSourceIdException extends RuntimeException {}
