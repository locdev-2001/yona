{{-- Port từ .../account_notification_mailer/contact_import_complete.liquid --}}
<p>Hello,</p>

<p>Your contact import has been completed. Please check the contacts tab to view the imported contacts.</p>

<p>Number of records imported: {{ $meta['imported_contacts'] }}</p>

<p>Number of records failed: {{ $meta['failed_contacts'] }}</p>

@if ($meta['failed_contacts'] === 0)
    <p>
        Click <a href="{{ $actionUrl }}">here</a> to view the imported contacts.
    </p>
@else
    <p>
        Click <a href="{{ $actionUrl }}" target="_blank">here</a> to view failed records.
    </p>
@endif
