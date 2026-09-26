<?php

namespace App\Messaging\Delivery\Renderers;

use App\Messaging\Delivery\NativeRenderer;
use App\Messaging\Delivery\Renderers\Concerns\RendersMetaQuickReplies;

/** Messenger Send API "Quick Replies": chip trả lời nhanh dưới ô nhập. */
final class FacebookRenderer implements NativeRenderer
{
    use RendersMetaQuickReplies;
}
