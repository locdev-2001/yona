<!DOCTYPE html>
{{-- Port từ app/views/survey/responses/show.html.erb — trang khảo sát công khai
     `/survey/responses/{uuid}`; không layout dashboard, không đăng nhập. --}}
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="ltr">
    <head>
        <meta charset="utf-8">
        <title>{{ config('yona.branding.installation_name', config('app.name', 'Yona')) }}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0">
        <script>
            window.globalConfig = @json($globalConfig);
        </script>
        @vite(['resources/scss/survey.scss', 'resources/js/survey/main.tsx'])
    </head>
    <body class="h-full">
        <div id="app" class="h-full"></div>
    </body>
</html>
