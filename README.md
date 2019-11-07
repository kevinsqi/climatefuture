# ClimateFuture API

This is the API server that powers [climatefuture.io](https://www.climatefuture.io/). The frontend code is at [kevinsqi/climatefuture-client](https://github.com/kevinsqi/climatefuture-client).

## Setup

Go here and create an API key: https://developers.google.com/maps/documentation/geocoding/start#get-a-key

Create a .env file that contains the following:

```
GOOGLE_MAPS_PLATFORM_KEY=<your api key>
```

If not using docker-compose to run in development, see [MANUAL_SETUP.md](./MANUAL_SETUP.md) to see how to set server up with locally running postgres/postgis.

## Running

You'll need Docker installed. In this directory, run:

```
docker-compose build
docker-compose up
```

## Actions


Shell into database:

```
yarn db:shell
```

Creating a new migration and updating the DB snapshot:

```
node_modules/.bin/knex --knexfile ./db/knexfile.js migrate:make [MIGRATION_NAME]
# ...make changes to the migration file...
docker exec -it climatefuture_server_1 yarn run db:migrate
docker exec climatefuture_postgres_1 pg_dump -U climatefuture_user climatefuture > db/init.sql
```

## Deploying to production

SSH setup:

* [Upload your public ssh key](https://www.digitalocean.com/docs/droplets/how-to/add-ssh-keys/to-existing-droplet/) to the droplet to be able to SSH into droplet with `ssh root@climatefuture.io`
* [Add your SSH key to dokku](http://dokku.viewdocs.io/dokku/deployment/user-management/#adding-ssh-keys) to be able to run `git push dokku master`

[Deploying](http://dokku.viewdocs.io/dokku~v0.12.13/deployment/application-deployment/):

* SSH into dokku droplet: `ssh root@climatefuture.io`
* Create app: `dokku apps:create climatefuture`
* Create postgres plugin if it doesn't exist: `sudo dokku plugin:install https://github.com/dokku/dokku-postgres.git`
* Create postgres service with postgis image:
  * `export POSTGRES_IMAGE="mdillon/postgis"`
  * `export POSTGRES_IMAGE_VERSION=latest`
  * `dokku postgres:create climatefuture`
  * `dokku postgres:connect climatefuture` and `CREATE EXTENSION postgis;`
* Link postgres to application (this sets `DATABASE_URL` env var): `dokku postgres:link climatefuture climatefuture`
* Add dokku remote: `git remote add dokku dokku@climatefuture.io:climatefuture`
* Push to dokku: `git push dokku master`
* Load up DB schema and seed data:
  * `dokku enter climatefuture`
  * `cd server`
  * `yarn run db:load`
* Add domains: `dokku domains:add climatefuture api.climatefuture.io`
* Add env vars (find in 1password "ClimateFuture"): `dokku config:set climatefuture GOOGLE_MAPS_PLATFORM_KEY=<key>`
