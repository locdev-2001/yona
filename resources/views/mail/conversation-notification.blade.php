{{-- Port từ app/views/mailers/agent_notifications/conversation_notifications_mailer/*.liquid --}}
<p>Hi {{ $agentName }},</p>

@if ($notificationType === 'conversation_creation')
    <p>
        A new conversation (<a href="{{ $actionUrl }}">#{{ $conversation->display_id }}</a>) has been created in
        {{ $conversation->inbox->name }}.
        <strong>{{ $conversation->contact?->name }}</strong> wrote:
    </p>
@elseif ($notificationType === 'conversation_assignment')
    <p>Time to save the world. A new conversation has been assigned to you</p>
@elseif ($notificationType === 'conversation_mention')
    <p>You've been mentioned in a conversation. <b>{{ $mentionedBy }}</b> wrote:</p>
    <blockquote style="box-sizing:border-box; padding:8px 16px; margin:0 0 20px; font-size:14px; border-left:5px solid #eeeeee">
        {{ $mentionedText }}
    </blockquote>
    <p><b>Previous messages:</b></p>
@else
    <p>There is a new message in the conversation (<a href="{{ $actionUrl }}">#{{ $conversation->display_id }}</a>).</p>
@endif

@foreach ($recentMessages as $chatMessage)
    <div>
        <h4 style="margin: 0;">{{ $chatMessage['sender'] === $agentName ? 'You' : $chatMessage['sender'] }}</h4>
    </div>

    <div style="padding: 10px 20px; margin: 5px 0 20px 0; background: #F2F3F7; border-radius: 10px; display: inline-block; font-family: 'Helvetica Neue',Tahoma,Arial,sans-serif; text-align: start; unicode-bidi: plaintext;">
        {{ $chatMessage['content'] }}
        @foreach ($chatMessage['attachments'] as $attachment)
            Attachment [<a href="{{ $attachment }}" target="_blank">Click here to view</a>]
        @endforeach
    </div>
@endforeach

<p>Click <a href="{{ $actionUrl }}">here</a> to get cracking.</p>

<p><a href="{{ $notificationSettingsUrl }}">Notification settings</a></p>
