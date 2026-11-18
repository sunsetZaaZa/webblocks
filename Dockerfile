FROM ubuntu/nginx

RUN rm -rf /var/www/html/index*

COPY ./dist /var/www/html/