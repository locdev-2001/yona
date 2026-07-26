<?php

namespace App\Events;

use Illuminate\Foundation\Events\Dispatchable;

/**
 * Vừa biết số điện thoại của khách trong một hội thoại.
 *
 * Sự kiện này là RANH GIỚI giữa chat và CRM: chat chỉ nói "vừa biết số này",
 * còn việc dựng/gộp hồ sơ khách hàng là chuyện của CRM. Không có nó thì chat
 * phải gọi thẳng `ContactService`, và tầng nghiệp vụ chat lại biết tới CDP.
 */
class ConversationPhoneLearned
{
    use Dispatchable;

    public function __construct(
        public readonly string $conversationId,
        public readonly string $phone,
        public readonly string $source,
    ) {}
}
