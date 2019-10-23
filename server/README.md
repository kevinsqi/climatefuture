# Climate Change Projections - Server

Backend server for https://github.com/kevinsqi/climate-change-projections

## Setup

First, you'll need to [install Homebrew](https://brew.sh/). Then:

```
brew install node
brew install postgresql
brew install postgis
```

Warning: installing these may take a while.

### Geocoding API

Go here and create an API key: https://developers.google.com/maps/documentation/geocoding/start#get-a-key

Create a .env file that contains the following:

```
GOOGLE_MAPS_PLATFORM_KEY=<your api key>
```

### Database

Create user and DB:

```
createuser climate_change_projections_user --createdb
createdb climate_change_projections -U climate_change_projections_user
```

Creating extension in psql (requires superuser):

```
psql climate_change_projections
CREATE EXTENSION postgis;
```

DB setup:

```
node_modules/.bin/knex --knexfile ./db/knexfile.js migrate:latest
node_modules/.bin/knex --knexfile ./db/knexfile.js seed:run
```

## Running the app

```
yarn install
yarn start
```


## Database actions

Console:

```
psql climate_change_projections -U climate_change_projections_user
```

New migration:

```
node_modules/.bin/knex --knexfile ./db/knexfile.js migrate:make [MIGRATION_NAME]
```

Reset seed data:

```
psql -U climate_change_projections_user -d climate_change_projections -c 'DELETE FROM temperatures_cmip5; DELETE FROM noaa_projections; DELETE FROM climate_central_sea_levels;'
node_modules/.bin/knex --knexfile ./db/knexfile.js seed:run
```

Rollback and rerun migration:

```
node_modules/.bin/knex --knexfile ./db/knexfile.js migrate:rollback
node_modules/.bin/knex --knexfile ./db/knexfile.js migrate:latest
```
