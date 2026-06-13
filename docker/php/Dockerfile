# syntax=docker/dockerfile:1
# Multi-stage PHP image for Laravel 13 (PHP 8.4).
#   base → shared runtime + extensions
#   dev  → self-bootstrapping container (app/horizon/reverb services)
#   prod → vendor + compiled assets baked in, non-root, no dev deps

############################
# base — runtime + PHP extensions + composer
############################
FROM php:8.4-fpm-alpine AS base

# Runtime libs stay; *-dev headers are added in a virtual package and removed
# after compiling extensions to keep the final layer small.
RUN apk add --no-cache \
        git curl bash \
        libpng libjpeg-turbo freetype libzip icu-libs oniguruma libpq \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS \
        libpng-dev libjpeg-turbo-dev freetype-dev libzip-dev icu-dev \
        oniguruma-dev postgresql-dev linux-headers \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        pdo pdo_pgsql pgsql bcmath intl gd zip pcntl opcache \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del .build-deps

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY docker/php/php.ini /usr/local/etc/php/conf.d/zzz-app.ini

WORKDIR /var/www/html
EXPOSE 9000

############################
# dev — auto-installs deps / key on first boot
############################
FROM base AS dev
COPY docker/php/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint
ENTRYPOINT ["entrypoint"]
CMD ["php-fpm"]

############################
# assets — compile frontend (prod only)
############################
FROM node:22-alpine AS assets
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

############################
# prod — immutable image with vendor + assets baked in
############################
FROM base AS prod
ENV APP_ENV=production

# Install PHP deps first (cached unless composer files change).
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

COPY . .
COPY --from=assets /app/public/build ./public/build
RUN composer dump-autoload --optimize --no-interaction \
    && chown -R www-data:www-data storage bootstrap/cache

USER www-data
CMD ["php-fpm"]
