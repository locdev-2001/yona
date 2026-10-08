<p>{{ __('notifications.account.greeting') }}</p>

<p>{{ __('notifications.account.contact_import_complete.body') }}</p>

<p>{{ __('notifications.account.contact_import_complete.imported', ['count' => $meta['imported_contacts']]) }}</p>

<p>{{ __('notifications.account.contact_import_complete.failed', ['count' => $meta['failed_contacts']]) }}</p>

@if ($meta['failed_contacts'] === 0)
    <p><a href="{{ $actionUrl }}">{{ __('notifications.account.contact_import_complete.action_view_contacts') }}</a></p>
@else
    <p><a href="{{ $actionUrl }}" target="_blank">{{ __('notifications.account.contact_import_complete.action_view_failed') }}</a></p>
@endif
