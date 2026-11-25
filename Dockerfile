FROM ubuntu/nginx

RUN rm -rf /var/www/html/index* && rm -f /etc/nginx/sites-enabled/default
COPY config/nginx/default.conf /etc/nginx/sites-enabled/default
COPY ./dist /var/www/html/
