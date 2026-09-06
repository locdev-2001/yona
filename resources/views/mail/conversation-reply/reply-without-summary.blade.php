{{-- Port từ app/views/mailers/conversation_reply_mailer/reply_without_summary.html.erb --}}
@foreach ($messages as $chatMessage)
  <p style="font-family: Roboto,'Helvetica Neue',Tahoma,Arial,sans-serif; text-align: start; unicode-bidi: plaintext;">
    @if (filled($chatMessage->content))
      {!! \App\Services\Email\MarkdownRenderer::render($chatMessage->content) !!}
    @endif
    @if ($chatMessage->attachments->isNotEmpty())
      <p>Attachments:</p>
      @foreach ($chatMessage->attachments as $attachment)
        <p><a href="{{ $attachment->fileUrl() }}" target="_blank">{{ $attachment->filename }}</a></p>
      @endforeach
    @endif
  </p>
@endforeach
