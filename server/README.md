# ClimateFuture server

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

## Deploying to production

SSH setup:

* [Upload your public ssh key](https://www.digitalocean.com/docs/droplets/how-to/add-ssh-keys/to-existing-droplet/) to the droplet to be able to SSH into droplet with `ssh root@climatefuture.io`
* [Add your SSH key to dokku](http://dokku.viewdocs.io/dokku/deployment/user-management/#adding-ssh-keys) to be able to run `git push dokku master`

[Deploying](http://dokku.viewdocs.io/dokku~v0.12.13/deployment/application-deployment/):

* SSH into dokku droplet: `ssh root@climatefuture.io`
* Create app: `dokku apps:create climatefuture`
* Create postgres plugin if it doesn't exist: `sudo dokku plugin:install https://github.com/dokku/dokku-postgres.git`
* Create postgres service: `dokku postgres:create climatefuture`
* Link postgres to application: `dokku postgres:link climatefuture climatefuture`
* Add dokku remote: `git remote add dokku dokku@climatefuture.io:climatefuture`
* Push to dokku: `git push dokku master`
