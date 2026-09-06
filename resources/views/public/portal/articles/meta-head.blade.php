{{-- Port từ articles/_meta_head.html.erb --}}
@php($meta = $article->meta ?? [])
<title>{{ $article->title }} | {{ $portal->displayTitle($locale) }}</title>
@if (filled($meta['title'] ?? null))
  <meta name="title" content="{{ $meta['title'] }}">
  <meta property="og:title" content="{{ $meta['title'] }}">
  <meta name="twitter:title" content="{{ $meta['title'] }}">
@endif
@if (filled($meta['description'] ?? null))
  <meta name="description" content="{{ $meta['description'] }}">
  <meta property="og:description" content="{{ $meta['description'] }}">
  <meta name="twitter:description" content="{{ $meta['description'] }}">
@endif
@if (filled($meta['tags'] ?? null))
  <meta name="tags" content="{{ implode(',', (array) $meta['tags']) }}">
@endif
