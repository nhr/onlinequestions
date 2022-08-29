FROM php:8.1-apache-buster
COPY . /var/www/html
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
RUN chmod 0777 /var/www/html/events
EXPOSE 80
