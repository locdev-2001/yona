{{-- Port từ search/index.html.erb (+ index.html+plain.erb) --}}
@extends('public.portal.layout')

@section('head')
  <title>{{ __('public_portal.search.results_for', ['query' => $query]).' | '.$portal->localizedValue('name', $locale) }}</title>
@endsection

@php($searchInputClass = 'w-full px-4 py-3 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent')

@section('content')
@if ($isPlainLayout)
  <div class="max-w-5xl px-4 md:px-8 mx-auto flex flex-col py-4">
    @include('public.portal.search.results-header')
  </div>
@else
  <div id="portal-bg" class="bg-white shadow-inner">
    <div id="portal-bg-gradient" class="pt-8 pb-8 md:pt-14 md:pb-6">
      <div class="max-w-5xl px-4 md:px-8 mx-auto flex flex-col">
        @include('public.portal.search.results-header')
      </div>
    </div>
  </div>
@endif

@include('public.portal.search.results')
@endsection
