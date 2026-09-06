{{-- Port từ app/views/mailers/conversation_reply_mailer/conversation_transcript.html.erb --}}
<x-mail.layouts.base>
@foreach ($messages as $chatMessage)
  <tr>
    <td>
      <b>{{ $chatMessage->sender?->availableName() ?? $chatMessage->sender?->name ?? '' }}</b>
      @if ($inbox->isEmail())
        <div style="font-size: 90%; color: #899096; line-height: 16px">
          @if (filled(data_get($chatMessage->content_attributes, 'email.from')))
            <div>From: {{ implode(', ', (array) data_get($chatMessage->content_attributes, 'email.from')) }}</div>
          @else
            <div>From: {{ $chatMessage->sender?->email }}</div>
          @endif

          @if (filled(data_get($chatMessage->content_attributes, 'email.subject')))
            <div>Subject: {{ data_get($chatMessage->content_attributes, 'email.subject') }}</div>
          @endif

          @foreach (['to_emails' => 'To', 'cc_emails' => 'CC', 'bcc_emails' => 'BCC'] as $key => $label)
            @if (filled(data_get($chatMessage->content_attributes, $key)))
              <div>{{ $label }}: {{ implode(', ', (array) data_get($chatMessage->content_attributes, $key)) }}</div>
            @endif
          @endforeach
        </div>
      @endif
    </td>
  </tr>
  <tr>
    <td style="padding-bottom: 32px;">
      @if (filled($chatMessage->content))
        {!! \App\Services\Email\MarkdownRenderer::render($chatMessage->content) !!}
      @endif
      @if ($chatMessage->attachments->isNotEmpty())
        <p>Attachments:</p>
        @foreach ($chatMessage->attachments as $attachment)
          <p><a href="{{ $attachment->fileUrl() }}" target="_blank">{{ $attachment->filename }}</a></p>
        @endforeach
      @endif
      <p style="font-size: 90%; color: #899096;margin-top: -8px; margin-bottom: 0px;">
        {{ filled($inbox->timezone) ? $chatMessage->created_at->timezone($inbox->timezone)->format('M d, h:i A T') : $chatMessage->created_at->format('M d, h:i A T') }}
      </p>
    </td>
  </tr>
@endforeach
</x-mail.layouts.base>
