{{-- Port từ _thumbnail.html.erb.
     Bản gốc ghép class động `w-<%= size %>`; Tailwind của Yona quét tĩnh nên
     dùng bảng class cố định theo cỡ (chỉ cỡ 5 và 8 được dùng). --}}
@php($sizeClass = ['5' => 'w-5 h-5', '8' => 'w-8 h-8'][(string) $size] ?? 'w-5 h-5')
@if (filled($author?->avatarUrl()))
  <img src="{{ $author->avatarUrl() }}" alt="{{ $author->name }}" class="{{ $sizeClass }} rounded-full border border-solid border-white dark:border-slate-900">
@else
  <div class="{{ $sizeClass }} rounded-full [&>svg]:opacity-70 border border-solid fill-white dark:fill-slate-900 border-white dark:border-slate-900 flex justify-center items-center" style="background-color: {{ $links::thumbnailBackground($author?->availableName()) }};">
    @include('public.portal.icons.user')
  </div>
@endif
