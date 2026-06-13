FROM php:8.3-cli-alpine

RUN apk add --no-cache postgresql-dev curl \
 && docker-php-ext-install pdo pdo_pgsql

WORKDIR /app
COPY . .

EXPOSE 8002
CMD ["php", "-S", "0.0.0.0:8002", "router.php"]
