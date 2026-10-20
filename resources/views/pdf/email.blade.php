<!DOCTYPE html>
<html lang="{{ $locale }}">
<head>
<meta charset="utf-8">
<title>{{ $subject }}</title>
<style>
    @page { size: A4; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body { font-family: Arial, Helvetica, "Noto Sans", "DejaVu Sans", sans-serif; color: #1f2328; font-size: 14px; line-height: 1.5; }
    .yona-email-header { border-bottom: 1px solid #d0d7de; padding: 0 0 12px; margin: 0 0 16px; }
    .yona-email-subject { font-size: 20px; font-weight: 700; margin: 0 0 8px; word-break: break-word; }
    .yona-email-meta { border-collapse: collapse; font-size: 13px; }
    .yona-email-meta th { text-align: left; font-weight: 600; color: #57606a; padding: 1px 12px 1px 0; vertical-align: top; white-space: nowrap; }
    .yona-email-meta td { padding: 1px 0; word-break: break-word; }
    .yona-email-body { overflow-wrap: anywhere; }
    .yona-email-body img { max-width: 100%; height: auto; }
</style>
</head>
<body>
<div class="yona-email-header">
    @if (filled($subject))
        <h1 class="yona-email-subject">{{ $subject }}</h1>
    @endif
    <table class="yona-email-meta">
        @foreach ($headers as $row)
            <tr><th>{{ $row['label'] }}</th><td>{{ $row['value'] }}</td></tr>
        @endforeach
    </table>
</div>
<div class="yona-email-body">{!! $body !!}</div>
</body>
</html>
