{{-- Port từ app/views/mailers/conversation_reply_mailer/reply_with_summary.html.erb --}}
<x-mail.layouts.base>
<p>Hi {{ $contact?->name }},</p>

<p>You have new messages on your conversation.</p>

@foreach ($messages as $chatMessage)
  <tr>
    <td>
      <b>{{ $chatMessage->isIncoming() ? 'You' : ($chatMessage->sender?->availableName() ?? $chatMessage->sender?->name ?? 'Bot') }}</b>
    </td>
  </tr>
  <tr>
    <td style="padding: 0px 16px; margin: 4px 0 8px 0; background: #F5FAFF; border-radius: 5px; display: inline-block; font-family: 'Helvetica Neue',Tahoma,Arial,sans-serif; text-align: start; unicode-bidi: plaintext;">
      @if ($chatMessage->isInputCsat() && $chatMessage->message_type === \App\Models\Message::TYPE_TEMPLATE)
        <p>Click <a href="{{ url('/survey/responses/'.$conversation->uuid) }}" target="blank">here</a> to rate the conversation.</p>
      @elseif (filled($chatMessage->content))
        {!! \App\Services\Email\MarkdownRenderer::render($chatMessage->content) !!}
      @endif
      @if ($chatMessage->attachments->isNotEmpty())
        <p>
          @if (filled($chatMessage->content))
            <hr style="border: 0; border-bottom: 1px solid #AEC3D5;"/>
          @endif
          Attachments:
          @foreach ($chatMessage->attachments as $index => $attachment)
            @if ($index > 0)<br />@endif
            <a href="{{ $attachment->fileUrl() }}" target="_blank">{{ $attachment->filename }}</a>
          @endforeach
        </p>
      @endif
    </td>
  </tr>
@endforeach
</x-mail.layouts.base>
