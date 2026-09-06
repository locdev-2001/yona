{{-- Port từ categories/_meta_head.html.erb --}}
<title>{{ $category->name }} | {{ $portal->displayTitle($locale) }}</title>
<meta name="title" content="{{ $category->name.' | '.$portal->displayTitle($locale) }}">
@if (filled($category->description))
  <meta name="description" content="{{ $category->description }}">
  <meta property="og:description" content="{{ $category->description }}">
  <meta name="twitter:description" content="{{ $category->description }}">
@endif
