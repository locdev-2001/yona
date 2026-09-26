<?php

namespace App\Messaging\Delivery\Renderers;

use App\Messaging\Delivery\NativeRenderer;
use App\Messaging\Delivery\Renderers\Concerns\RendersMetaQuickReplies;

/** Instagram Messaging API dùng lại đúng định dạng "quick_replies" của Messenger. */
final class InstagramRenderer implements NativeRenderer
{
    use RendersMetaQuickReplies;
}
