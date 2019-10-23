const parse = require('csv-parse/lib/sync');
const fs = require('fs');
const path = require('path');

function load_cmip5(knex) {
  const csv = fs.readFileSync(path.join(__dirname, '../../data/cmip5.csv'));
  const records = parse(csv, { columns: true });
  console.log('cmip5 CSV parsed, records:', records.length);

  // Geography column:
  // https://stackoverflow.com/questions/8150721/which-data-type-for-latitude-and-longitude
  return records.map((record) => {
    const fullRecord = {
      attribute: 'temperature_increase',
      year_start: 2080,
      year_end: 2100,
      ...record,
    };
    return knex.raw(
      `
        INSERT INTO temperatures_cmip5 (
          place_name,
          attribute,
          year_start,
          year_end,
          lat,
          lon,
          observed_warming,
          model_26_warming,
          model_45_warming,
          model_60_warming,
          model_85_warming,
          geography
        )
        VALUES (
          :place_name,
          :attribute,
          :year_start,
          :year_end,
          :lat_label,
          :lon_label,
          :obs_warming,
          :model_26_warming,
          :model_45_warming,
          :model_60_warming,
          :model_85_warming,
          'SRID=4326;POINT(${record.lon_label} ${record.lat_label})'
        )
      `,
      fullRecord,
    );
  });
}

function load_noaa_climate_explorer(knex) {
  const files = [
    {
      attribute: 'num_days_above_100f',
      place_name: 'San Francisco, CA',
      lat: 37.773972,
      lon: -122.431297,
      path: 'san_francisco_num_days_above_100f.csv',
    },
    {
      attribute: 'num_dry_days',
      place_name: 'San Francisco, CA',
      lat: 37.773972,
      lon: -122.431297,
      path: 'san_francisco_num_dry_days.csv',
    },
    {
      attribute: 'num_days_above_100f',
      place_name: 'Dallas, TX',
      lat: 32.777,
      lon: -96.797,
      path: 'dallas_tx_num_days_above_100f.csv',
    },
    {
      attribute: 'num_dry_days',
      place_name: 'Dallas, TX',
      lat: 32.777,
      lon: -96.797,
      path: 'dallas_tx_num_dry_days.csv',
    },
    {
      attribute: 'num_dry_days',
      place_name: 'Idaho Falls, ID',
      lat: 43.49165,
      lon: -112.033966,
      path: 'idaho_falls_num_dry_days.csv',
    },
  ];

  return files
    .map((file) => {
      const csv = fs.readFileSync(
        path.join(__dirname, '../../data/noaa_climate_explorer', file.path),
      );
      const records = parse(csv, { columns: true });
      console.log(`${file.attribute} ${file.place_name} CSV parsed, records:`, records.length);

      return records.map((record) => {
        const { year, rcp45_weighted_mean, rcp45_min, rcp45_max, rcp85_min, rcp85_max } = record;

        const fullRecord = {
          attribute: file.attribute,
          place_name: file.place_name,
          // TODO: automate this with google geolocation queries
          lat: file.lat,
          lon: file.lon,
          year,
          rcp45_weighted_mean,
          rcp45_min,
          rcp45_max,
          rcp85_weighted_mean: record['rcp85_weighted mean'],
          rcp85_min,
          rcp85_max,
        };

        return knex.raw(
          `
          INSERT INTO noaa_projections (
            place_name,
            attribute,
            year,
            lat,
            lon,
            geography,
            rcp45_weighted_mean,
            rcp45_min,
            rcp45_max,
            rcp85_weighted_mean,
            rcp85_min,
            rcp85_max
          )
          VALUES (
            :place_name,
            :attribute,
            :year,
            :lat,
            :lon,
            'SRID=4326;POINT(${fullRecord.lon} ${fullRecord.lat})',
            :rcp45_weighted_mean,
            :rcp45_min,
            :rcp45_max,
            :rcp85_weighted_mean,
            :rcp85_min,
            :rcp85_max
          )
        `,
          fullRecord,
        );
      });
    })
    .flat();
}

function load_noaa_observations(knex) {
  const filePath = 'noaa_observations_avg_1950_to_2013.csv';
  const csv = fs.readFileSync(path.join(__dirname, '../../data', filePath));

  const records = parse(csv, { columns: true });
  console.log(`CSV parsed, records:`, records.length);
  return records.map((record) => {
    const fullRecord = {
      attribute: 'noaa_observations_historical_average',
      place_name: record.CityName,
      lat: record.Lat,
      lon: record.Lon,
      year_start: 1950,
      year_end: 2013,
      avg_temp_max_f: record.avgTmaxF,
      num_days_above_100f: record.days_gt_100,
      num_dry_days: record.dry_days,
    };

    return knex.raw(
      `
      INSERT INTO noaa_observations (
        attribute,
        place_name,
        lat,
        lon,
        geography,
        year_start,
        year_end,
        avg_temp_max_f,
        num_days_above_100f,
        num_dry_days
      )
      VALUES (
        :attribute,
        :place_name,
        :lat,
        :lon,
        'SRID=4326;POINT(${fullRecord.lon} ${fullRecord.lat})',
        :year_start,
        :year_end,
        :avg_temp_max_f,
        :num_days_above_100f,
        :num_dry_days
      )
    `,
      fullRecord,
    );
  });
}

function load_climate_central_sea_levels(knex) {
  const files = [
    {
      attribute: 'coastal_flooding_single_year_5ft',
      place_name: 'New York, NY',
      lat: 40.73061,
      lon: -73.935242,
      records: [
        // https://riskfinder.climatecentral.org/state/new-york.us?comparisonType=county&forecastName=Single-year&forecastType=AR5_RCP45_p50&level=5&unit=ft&zillowPlaceType=county
        { year: 2040, rcp26: 0.05, rcp45: 0.05, rcp85: 0.05 },
        { year: 2060, rcp26: 0.07, rcp45: 0.08, rcp85: 0.09 },
        { year: 2080, rcp26: 0.11, rcp45: 0.13, rcp85: 0.21 },
        { year: 2100, rcp26: 0.17, rcp45: 0.24, rcp85: 0.59 },
      ],
    },
    {
      attribute: 'coastal_flooding_single_year_5ft',
      place_name: 'San Francisco, CA',
      lat: 37.773972,
      lon: -122.431297,
      records: [
        // https://riskfinder.climatecentral.org/place/san-francisco.ca.us?comparisonType=place&forecastType=AR5_RCP26_p50&level=5&unit=ft&zillowPlaceType=place
        { year: 2040, rcp26: 0.0, rcp45: 0.0, rcp85: 0.0 },
        { year: 2060, rcp26: 0.0, rcp45: 0.0, rcp85: 0.01 },
        { year: 2080, rcp26: 0.01, rcp45: 0.01, rcp85: 0.02 },
      ],
    },
  ];

  return files
    .map((file) => {
      return file.records.map((record) => {
        const fullRecord = {
          attribute: file.attribute,
          place_name: file.place_name,
          // TODO: automate this with google geolocation queries
          lat: file.lat,
          lon: file.lon,
          year: record.year,
          rcp26: record.rcp26,
          rcp45: record.rcp45,
          rcp85: record.rcp85,
        };
        return knex.raw(
          `
        INSERT INTO climate_central_sea_levels (
          place_name,
          attribute,
          year,
          lat,
          lon,
          geography,
          rcp26,
          rcp45,
          rcp85
        )
        VALUES (
          :place_name,
          :attribute,
          :year,
          :lat,
          :lon,
          'SRID=4326;POINT(${fullRecord.lon} ${fullRecord.lat})',
          :rcp26,
          :rcp45,
          :rcp85
        )
        `,
          fullRecord,
        );
      });
    })
    .flat();
}

exports.seed = function(knex) {
  const insertions = [];
  insertions.push(...load_cmip5(knex));
  insertions.push(...load_noaa_climate_explorer(knex));
  insertions.push(...load_noaa_observations(knex));
  insertions.push(...load_climate_central_sea_levels(knex));
  return Promise.all(insertions);
};
