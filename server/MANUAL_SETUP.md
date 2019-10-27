## Manual setup

First, you'll need to [install Homebrew](https://brew.sh/). Then:

```
brew install node
brew install postgresql
brew install postgis
```

Warning: installing these may take a while.

### Database

Create user and DB:

```
createuser climatefuture_user --createdb
createdb climatefuture -U climatefuture_user
```

Creating extension in psql (requires superuser):

```
psql climatefuture
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
psql climatefuture -U climatefuture_user
```

New migration:

```
node_modules/.bin/knex --knexfile ./db/knexfile.js migrate:make [MIGRATION_NAME]
```

Reset seed data:

```
psql -U climatefuture_user -d climatefuture -c 'DELETE FROM temperatures_cmip5; DELETE FROM noaa_projections; DELETE FROM climate_central_sea_levels;'
node_modules/.bin/knex --knexfile ./db/knexfile.js seed:run
```

Rollback and rerun migration:

```
node_modules/.bin/knex --knexfile ./db/knexfile.js migrate:rollback
node_modules/.bin/knex --knexfile ./db/knexfile.js migrate:latest
```
