FROM node:20-bookworm

# Update Local Repository Index
RUN apt-get update
# Upgrade packages in the base image and apply security updates
RUN DEBIAN_FRONTEND=noninteractive apt-get dist-upgrade -yq
# Install package utils
RUN DEBIAN_FRONT=noninteractive apt-get install -yq apt-utils
# Install MongoDB
RUN DEBIAN_FRONT=noninteractive apt-get install -yq ca-certificates gnupg curl
RUN curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
RUN echo 'deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main' | tee /etc/apt/sources.list.d/mongodb.list
RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive apt-get install -yq mongodb-org

# Remove package files fetched for install
RUN apt-get clean
# Remove unwanted files
RUN rm -rf /var/lib/apt/lists/

COPY . /app
WORKDIR /app/server

ENV NODE_ENV=production
ENV MONGO=mongodb://127.0.0.1:27017/octofarm

RUN npm install -g npm@latest
RUN npm install -g pm2

RUN npm ci --omit=dev

EXPOSE 4000
WORKDIR /app

COPY docker/monolithic-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT ["bash", "/usr/local/bin/entrypoint.sh"]
