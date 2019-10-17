## Running the app

```
yarn dev
```

## Database setup

```
brew install postgresql
brew install postgis
```

Create user and DB:

```
createuser climate_change_projections_user --createdb
createdb climate_change_projections -U climate_change_projections_user
```

Connecting:

```
psql climate_change_projections -U climate_change_projections_user
```

Creating extension in psql:

```
CREATE EXTENSION postgis;
```

## Datasets

```
brew install gdal  # For ogr2ogr
```
