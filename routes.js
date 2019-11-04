const express = require('express');
const axios = require('axios');
const knex = require('./db/knex');
const _ = require('lodash');

const router = express.Router();

const ACIS_API_ENDPOINT = 'https://grid2.rcc-acis.org/GridData';

const ACIS_ELEMS = [
  {
    name: 'maxt',
    interval: 'yly',
    duration: 'yly',
    reduce: 'cnt_gt_100',
  },
  {
    name: 'maxt',
    interval: 'yly',
    duration: 'yly',
    reduce: 'mean',
  },
  {
    name: 'mint',
    interval: 'yly',
    duration: 'yly',
    reduce: 'cnt_lt_32',
  },
  {
    name: 'pcpn',
    interval: 'yly',
    duration: 'yly',
    reduce: 'cnt_lt_0.01',
  },
  {
    name: 'pcpn',
    interval: 'yly',
    duration: 'yly',
    reduce: 'sum',
    units: 'inch',
  },
];

async function geocodeLocation(address) {
  const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
    params: {
      address: address,
      key: process.env.GOOGLE_MAPS_PLATFORM_KEY,
    },
  });

  if (response.data.results.length === 0) {
    return null;
  }

  return response.data.results[0];
}

async function getCounty({ lat, lng }) {
  const response = await axios.get('https://geo.fcc.gov/api/census/block/find', {
    params: {
      latitude: lat,
      longitude: lng,
      format: 'json',
    },
  });

  return response.data.County.FIPS;
}

async function getProjections({ lat, lng, year, maxDistance }) {
  const results = await Promise.all([
    knex.raw(
      `
        SELECT * FROM temperatures_cmip5
        WHERE year_start <= :year
        ORDER BY geography <-> :point
        LIMIT 1
      `,
      { year, point: `SRID=4326;POINT(${lng} ${lat})` },
    ),
    knex.raw(
      `
        SELECT *, (
          SELECT num_days_above_100f FROM noaa_observations
          WHERE ST_Distance(
            ST_Transform(:point::geometry, 3857),
            ST_Transform(noaa_observations.geography::geometry, 3857)
          ) < :maxDistance
          ORDER BY geography <-> :point
          LIMIT 1
        ) as historical_average
        FROM noaa_projections
        WHERE ST_Distance(
          ST_Transform(:point::geometry, 3857),
          ST_Transform(noaa_projections.geography::geometry, 3857)
        ) < :maxDistance
        AND attribute = 'num_days_above_100f'
        AND year = :year
        ORDER BY geography <-> :point
        LIMIT 1
      `,
      {
        year,
        point: `SRID=4326;POINT(${lng} ${lat})`,
        maxDistance,
      },
    ),
    knex.raw(
      `
        SELECT *, (
          SELECT num_dry_days FROM noaa_observations
          WHERE ST_Distance(
            ST_Transform(:point::geometry, 3857),
            ST_Transform(noaa_observations.geography::geometry, 3857)
          ) < :maxDistance
          ORDER BY geography <-> :point
          LIMIT 1
        ) as historical_average
        FROM noaa_projections
        WHERE ST_Distance(
          ST_Transform(:point::geometry, 3857),
          ST_Transform(noaa_projections.geography::geometry, 3857)
        ) < :maxDistance
        AND attribute = 'num_dry_days'
        AND year = :year
        ORDER BY geography <-> :point
        LIMIT 1
      `,
      {
        year,
        point: `SRID=4326;POINT(${lng} ${lat})`,
        maxDistance,
      },
    ),
    knex.raw(
      `
        SELECT * FROM climate_central_sea_levels
        WHERE ST_Distance(
          ST_Transform(:point::geometry, 3857),
          ST_Transform(climate_central_sea_levels.geography::geometry, 3857)
        ) < :maxDistance
        AND year = :year
        ORDER BY geography <-> :point
        LIMIT 1
      `,
      {
        year,
        point: `SRID=4326;POINT(${lng} ${lat})`,
        maxDistance,
      },
    ),
  ]);

  // Get first row of each result, and filter out nulls
  return results.map((result) => result.rows[0]).filter((result) => result);
}

async function getAcisProjections({ lat, lng, year }) {
  const params = {
    grid: 'loca:wmean:rcp85',
    loc: `${lng},${lat}`,
    date: `${year}`,
    elems: ACIS_ELEMS,
  };
  const response = await axios.post(ACIS_API_ENDPOINT, params);
  const elemNames = params.elems.map((elem) => `${elem.name},${elem.reduce}`);
  const [yearValue, ...elemValues] = response.data.data[0];

  if (Number(year) !== Number(yearValue) || elemValues.length !== elemNames.length) {
    throw new Error('Unexpected year or elems');
  }

  return elemNames.reduce((obj, name, idx) => {
    obj[name] = elemValues[idx];
    return obj;
  }, {});
}

async function getAcisObservations({ lat, lng, dateStart, dateEnd }) {
  const params = {
    grid: 'livneh',
    loc: `${lng},${lat}`,
    sdate: dateStart,
    edate: dateEnd,
    elems: ACIS_ELEMS,
  };
  const response = await axios.post(ACIS_API_ENDPOINT, params);
  const elemNames = params.elems.map((elem) => `${elem.name}:${elem.reduce}`);

  const dataByYear = response.data.data;
  return elemNames.reduce((obj, name, idx) => {
    obj[name] = _.mean(
      dataByYear.map((row) => {
        return row[idx + 1]; // Add 1 because first element of each row is the year
      }),
    );
    return obj;
  }, {});
}

router.get('/locations', async (req, res, next) => {
  try {
    // Validate params
    if (!req.query.address) {
      return res.status(400).json({ error: 'MISSING_ADDRESS' });
    }
    if (!req.query.year) {
      return res.status(400).json({ error: 'MISSING_YEAR' });
    }

    // Location
    const geo = await geocodeLocation(req.query.address);
    const { lat, lng } = geo.geometry.location;

    const results = await getProjections({
      lat,
      lng,
      year: req.query.year,
      maxDistance: 50000,
    });

    // TODO: promise.all with other stuff
    const [acisResults, acisObsResults] = await Promise.all([
      getAcisProjections({ lat, lng, year: req.query.year }),
      getAcisObservations({
        lat,
        lng,
        dateStart: `1950-01-01`,
        dateEnd: `2013-01-01`, // Observation data stops at 2013
      }),
    ]);
    console.log('acisResults', acisResults);
    console.dir(acisObsResults, { depth: null });

    return res.status(200).json({
      geo,
      results,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});

module.exports = router;
