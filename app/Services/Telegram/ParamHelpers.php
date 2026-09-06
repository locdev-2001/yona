<?php

namespace App\Services\Telegram;

/**
 * Port từ refs/chatwoot/app/services/telegram/param_helpers.rb — bóc payload
 * Telegram (message | business_message | callback_query) về cùng một hình dạng.
 */
trait ParamHelpers
{
    /** @return array<string, mixed> */
    protected function baseObject(): array
    {
        return $this->isCallbackQuery()
            ? $this->params['callback_query']
            : ($this->params['message'] ?? []);
    }

    protected function isCallbackQuery(): bool
    {
        return filled($this->params['callback_query'] ?? null);
    }

    protected function hasMessageParams(): bool
    {
        return filled($this->params['message'] ?? null);
    }

    protected function isPrivateMessage(): bool
    {
        if ($this->isCallbackQuery()) {
            return true;
        }

        return data_get($this->params, 'message.chat.type') === 'private';
    }

    protected function isBusinessMessage(): bool
    {
        return filled($this->businessConnectionId());
    }

    // Tin do chính chủ shop gõ từ app Telegram — hướng outgoing.
    protected function isBusinessMessageOutgoing(): bool
    {
        return $this->isBusinessMessage()
            && data_get($this->baseObject(), 'chat.id') !== data_get($this->baseObject(), 'from.id');
    }

    /** @return array<string, mixed> */
    protected function contactParams(): array
    {
        return $this->isBusinessMessageOutgoing()
            ? (array) data_get($this->baseObject(), 'chat', [])
            : (array) data_get($this->baseObject(), 'from', []);
    }

    protected function fromId(): int|string|null
    {
        return $this->isBusinessMessage()
            ? data_get($this->baseObject(), 'chat.id')
            : data_get($this->baseObject(), 'from.id');
    }

    protected function chatId(): int|string|null
    {
        return $this->isCallbackQuery()
            ? data_get($this->params, 'callback_query.message.chat.id')
            : data_get($this->baseObject(), 'chat.id');
    }

    protected function businessConnectionId(): ?string
    {
        return $this->isCallbackQuery()
            ? data_get($this->params, 'callback_query.message.business_connection_id')
            : data_get($this->baseObject(), 'business_connection_id');
    }

    protected function messageContent(): ?string
    {
        if ($this->isCallbackQuery()) {
            return data_get($this->params, 'callback_query.data');
        }

        return data_get($this->params, 'message.text') ?: data_get($this->params, 'message.caption');
    }

    protected function messageId(): int|string|null
    {
        return $this->isCallbackQuery()
            ? data_get($this->params, 'callback_query.id')
            : data_get($this->params, 'message.message_id');
    }

    /** @return array<string, mixed> */
    protected function contentAttributes(): array
    {
        $replyTo = data_get($this->params, 'message.reply_to_message.message_id');

        return $replyTo ? ['in_reply_to_external_id' => $replyTo] : [];
    }
}
