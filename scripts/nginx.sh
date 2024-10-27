sudo yum update -y
sudo yum install nginx -y

sudo yum install php php-fpm php-xml php-mbstring php-zip php-bcmath php-tokenizer ruby wget sqlite -y

# Install Composer
cd ~
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

NGINX_CONF="/etc/nginx/conf.d/laravel.conf"
sudo bash -c "cat > $NGINX_CONF" <<EOL
server {
    listen 80 default_server;

    server_name localhost;
    root /var/www/app/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";

    error_log /var/www/app/nginx-error.log; 
    access_log /var/www/app/nginx-access.log;

    index index.php;
    charset utf-8;

    client_max_body_size 5M;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php-fpm/www.sock;
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
        include fastcgi_params;
    }
 
    location ~ /\.(?!well-known).* {
        deny all;
    }
}
EOL

sudo chmod -R 777 /var/www
sudo chown -R nginx:nginx /var/www

# Set Ownership: Change the ownership of the Laravel app files to the www-data user and group.
# sudo chown -R nginx:nginx /var/www/app
#
# # Set Permissions for Storage and Cache Directories: Laravel needs write permissions on storage and bootstrap/cache.
# sudo chmod -R 775 /var/www/app/storage/*
# sudo chmod -R 775 /var/www/app/bootstrap/cache
#
# # Set Permissions for the SQLite Database (if applicable): If you’re using an SQLite database, ensure the database file has the correct permissions.
# sudo chmod 664 /var/www/app/database/database.sqlite
# sudo chown nginx:nginx /var/www/app/database/database.sqlite
#
# # File Permissions for Security: For better security, you can set more restrictive permissions for other files.
# sudo find /var/www/app -type f -exec chmod 644 {} \;
# sudo find /var/www/app -type d -exec chmod 755 {} \;

sudo systemctl restart nginx
sudo systemctl enable nginx
