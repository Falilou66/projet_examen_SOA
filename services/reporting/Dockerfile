FROM php:8.3-cli-alpine

RUN apk add --no-cache postgresql-dev curl \
 && docker-php-ext-install pdo pdo_pgsql

WORKDIR /app
COPY . .

EXPOSE 8003
CMD ["php", "-S", "0.0.0.0:8003", "router.php"]
