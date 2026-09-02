<?php

namespace App\Providers;

use App\Translation\Translator;
use Illuminate\Translation\TranslationServiceProvider as BaseTranslationServiceProvider;

class TranslationServiceProvider extends BaseTranslationServiceProvider
{
    public function register()
    {
        $this->registerLoader();

        $this->app->singleton('translator', function ($app) {
            $translator = new Translator($app['translation.loader'], $app->getLocale());
            $translator->setFallback($app->getFallbackLocale());

            return $translator;
        });
    }
}
