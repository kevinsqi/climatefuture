exports.up = function(knex) {
  return Promise.all([
    knex.schema.raw(`
      CREATE TABLE temperatures_cmip5 (
        id SERIAL PRIMARY KEY,
        place_name text NOT NULL,
        attribute text NOT NULL,
        year_start integer NOT NULL,
        year_end integer NOT NULL,
        lat float8 NOT NULL,
        lon float8 NOT NULL,
        geography geography NOT NULL,
        observed_warming float8 NOT NULL,
        model_26_warming float8 NOT NULL,
        model_45_warming float8 NOT NULL,
        model_60_warming float8 NOT NULL,
        model_85_warming float8 NOT NULL
      )
    `),
    knex.schema.raw(`
      CREATE TABLE noaa_projections (
        id SERIAL PRIMARY KEY,
        place_name text NOT NULL,
        attribute text NOT NULL,
        year integer NOT NULL,
        lat float8 NOT NULL,
        lon float8 NOT NULL,
        geography geography NOT NULL,
        rcp45_weighted_mean float8 NOT NULL,
        rcp45_min float8 NOT NULL,
        rcp45_max float8 NOT NULL,
        rcp85_weighted_mean float8 NOT NULL,
        rcp85_min float8 NOT NULL,
        rcp85_max float8 NOT NULL
      )
    `),
    knex.schema.raw(`
      CREATE TABLE climate_central_sea_levels (
        id SERIAL PRIMARY KEY,
        place_name text NOT NULL,
        attribute text NOT NULL,
        year integer NOT NULL,
        lat float8 NOT NULL,
        lon float8 NOT NULL,
        geography geography NOT NULL,
        rcp26 float8 NOT NULL,
        rcp45 float8 NOT NULL,
        rcp85 float8 NOT NULL
      )
    `),
    knex.schema.raw(`
      CREATE TABLE noaa_observations (
        id SERIAL PRIMARY KEY,
        place_name text NOT NULL,
        attribute text NOT NULL,
        year_start integer NOT NULL,
        year_end integer NOT NULL,
        lat float8 NOT NULL,
        lon float8 NOT NULL,
        geography geography NOT NULL,
        avg_temp_max_f float8 NOT NULL,
        num_days_above_100f float8 NOT NULL,
        num_dry_days float8 NOT NULL
      )
    `),
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.raw(`DROP TABLE temperatures_cmip5`),
    knex.schema.raw(`DROP TABLE noaa_projections`),
    knex.schema.raw(`DROP TABLE climate_central_sea_levels`),
    // TODO: add noaa_observations
  ]);
};
