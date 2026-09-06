{{-- Port từ public/api/v1/portals/show.html.erb (+ show.html+plain.erb) --}}
@extends('public.portal.layout')

@section('head')
  <title>{{ $portal->displayTitle($locale) }}</title>
  <meta name="title" content="{{ $portal->displayTitle($locale) }}">
@endsection

@section('content')
@unless ($isPlainLayout)
  @include('public.portal.partials.hero')
@endunless
<div class="max-w-5xl w-full flex flex-col flex-grow mx-auto py-8 px-4 md:px-8 gap-6">
  @unless ($isPlainLayout)
    <div>@include('public.portal.partials.featured-articles')</div>
  @endunless
  @include('public.portal.partials.home-categories')
</div>
@endsection
