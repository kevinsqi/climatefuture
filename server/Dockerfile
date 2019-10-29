FROM node:12.4.0-alpine

WORKDIR /usr/server

# Install dependencies
COPY package.json .
COPY yarn.lock .
RUN yarn install

# Copy app source code into docker image
COPY . .

# Needed here instead of docker-compose.yml for
# elastic beanstalk deployment
EXPOSE 3001

CMD ["yarn", "start"]
