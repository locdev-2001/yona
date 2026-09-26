{{-- Port từ public/api/v1/portals/_footer.html.erb --}}

<footer class="pt-16 pb-8 flex flex-col items-center justify-center">
  <div class="mx-auto max-w-2xl text-center py-2">
    <div class="flex items-center gap-2">

        <img
          class="w-4 h-4"
          alt="{{ $globalConfig['BRAND_NAME'] }}"
          src="{{ $globalConfig['LOGO_THUMBNAIL'] }}"
        />
        <p class="text-slate-700 text-sm font-medium text-center">
          {{ __('public_portal.footer.made_with') }}

            <a class="hover:underline" href="{{ $globalConfig['BRAND_URL'].'?utm_campaign=branding&utm_medium=helpcenter' }}" target="_blank" rel="noopener noreferrer nofollow">{{ $globalConfig['INSTALLATION_NAME'] }}</a>

        </p>
    </div>
  </div>
</footer>
