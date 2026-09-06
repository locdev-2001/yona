{{-- Port từ app/views/mailers/conversation_reply_mailer/email_reply.html.erb --}}
@php
    $htmlReply = data_get($emailMessage->content_attributes, 'email.html_content.reply');
@endphp
@if (filled($htmlReply))
{!! $htmlReply !!}
@elseif (filled($emailMessage->content))
{!! \App\Services\Email\MarkdownRenderer::render($emailMessage->content, true) !!}
@endif
@if ($largeAttachments->isNotEmpty())
<p>Attachments:</p>
@foreach ($largeAttachments as $attachment)
<p><a href="{{ $attachment->fileUrl() }}" target="_blank">{{ $attachment->filename }}</a></p>
@endforeach
@endif
