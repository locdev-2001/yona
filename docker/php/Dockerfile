# Dev PHP image for Laravel 13 (PHP 8.3) — used by app/horizon/reverb services.
FROM php:8.3-fpm-alpine

# Runtime + build deps, PHP extensions, Composer.
RUN apk add --no-cache \
        git curl bash \
        libpng-dev libjpeg-turbo-dev freetype-dev \
        libzip-dev icu-dev oniguruma-dev postgresql-dev linux-headers \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" pdo pdo_pgsql pgsql bcmath intl gd zip pcntl opcache \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del .build-deps

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
EXPOSE 9000
CMD ["php-fpm"]
