<?php

namespace App\Models\Concerns;

use App\Models\ReportingEvent;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Port từ refs/chatwoot/app/models/concerns/reportable.rb — model nào phát sinh
// số liệu báo cáo thì giữ luôn quan hệ tới sự kiện thô của nó.
trait Reportable
{
    public function reportingEvents(): HasMany
    {
        return $this->hasMany(ReportingEvent::class);
    }
}
