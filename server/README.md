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
