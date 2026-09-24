<?php

namespace App\Livewire\Pulse;

use App\Search\SearchOutbox;
use Illuminate\Contracts\Support\Renderable;
use Illuminate\Support\Facades\View;
use Laravel\Pulse\Livewire\Card;
use Livewire\Attributes\Lazy;

// Độ trễ đồng bộ chỉ mục tìm kiếm: số dòng outbox còn tồn và tuổi dòng cũ nhất,
// đọc thẳng từ bảng nên không cần daemon pulse:check.
#[Lazy]
class SearchOutboxCard extends Card
{
    public function render(SearchOutbox $outbox): Renderable
    {
        [$backlog] = $this->remember(fn () => $outbox->backlog(), 'backlog');

        return View::make('pulse.search-outbox', [
            'enabled' => $outbox->enabled(),
            'pending' => $backlog['pending'],
            'oldestAgeSeconds' => $backlog['oldest_age_seconds'],
        ]);
    }
}
