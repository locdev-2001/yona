<?php

namespace App\Models;

use App\Models\Concerns\Avatarable;
use Database\Factories\AiAgentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Thành viên máy của account: trả lời khách và đứng tên tin gửi đi. Lõi không biết bộ
// não nào chạy nó. Mỗi inbox gắn tối đa một AI agent; AI trả lời hội thoại tự động là
// Inbox::replyingAiAgent(). Tạo, sửa, xoá, gắn inbox đi qua AiAgentService.
class AiAgent extends Model
{
    /** @use HasFactory<AiAgentFactory> */
    use Avatarable, HasFactory;

    protected $fillable = ['account_id', 'name', 'persona', 'instructions', 'enabled'];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function inboxes(): HasMany
    {
        return $this->hasMany(Inbox::class);
    }

    /** Payload người gửi cho realtime và REST. */
    public function pushEventData(): array
    {
        $avatarUrl = $this->avatarUrl();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'avatar_url' => $avatarUrl,
            'thumbnail' => $avatarUrl,
            'type' => 'ai_agent',
        ];
    }

    public function webhookData(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'type' => 'ai_agent',
        ];
    }
}
