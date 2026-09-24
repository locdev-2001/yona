<?php

namespace App\Builders\Email;

class ReplyToBuilder extends BaseBuilder
{
    public function build(): string
    {
        $replyTo = match (true) {
            $this->inbox->isEmail() => $this->channel()->email,
            $this->inboundEmailEnabled() => 'reply+'.$this->message?->conversation->uuid.'@'.$this->account()->inboundEmailDomain(),
            default => $this->accountSupportEmail(),
        };

        return $this->senderName($replyTo);
    }

    private function inboundEmailEnabled(): bool
    {
        return $this->account()->featureEnabled('inbound_emails')
            && filled($this->account()->inboundEmailDomain());
    }
}
