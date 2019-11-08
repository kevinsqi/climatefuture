const express = require('express');
const axios = require('axios');
const _ = require('lodash');
const knex = require('../db/knex');

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
    reduce: 'cnt_gt_90',
  },
  {
    name: 'avgt',
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

const ACIS_ELEM_NAMES = ACIS_ELEMS.map((elem) => `${elem.name}:${elem.reduce}`);
const ACIS_ELEM_NAME_TO_ATTRIBUTE = {
  'maxt:cnt_gt_100': 'temp_num_days_above_100f',
  'maxt:cnt_gt_90': 'temp_num_days_above_90f',
  'avgt:mean': 'temp_avg',
  'mint:cnt_lt_32': 'temp_num_days_below_32f',
  'pcpn:cnt_lt_0.01': 'precipitation_num_dry_days',
  'pcpn:sum': 'precipitation_total',
};
if (!ACIS_ELEM_NAMES.every((name) => ACIS_ELEM_NAME_TO_ATTRIBUTE[name])) {
  throw new Error(`Missing name mapping in ACIS_ELEM_NAME_TO_ATTRIBUTE`);
}

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

async function getProjectionsFromDB({ lat, lng, year, maxDistance }) {
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

async function getCachedAcisResponse(cacheParams) {
  const results = await knex('acis_responses').where(cacheParams);
  return results.length > 0 && results[0].response;
}

async function getAcisProjections({ lat, lng, year, projectionType }) {
  const params = {
    // TODO: parameterize wmean, add allMin/allMax
    grid: `loca:wmean:${projectionType}`,
    loc: `${lng},${lat}`,
    sdate: `${year}-01-01`,
    edate: `${year}-12-31`,
    elems: ACIS_ELEMS,
  };

  // Try fetching from cache
  const cacheParams = {
    grid: params.grid,
    lat,
    lng,
    date_start: params.sdate,
    date_end: params.edate,
    api_url: ACIS_API_ENDPOINT,
  };
  let responseData = await getCachedAcisResponse(cacheParams);

  if (!responseData) {
    // Fetch from API
    try {
      const response = await axios.post(ACIS_API_ENDPOINT, params);
      responseData = response.data;
    } catch (errorResponse) {
      if (errorResponse.response && errorResponse.response.data) {
        const { status, error } = errorResponse.response.data;
        if (status === 'Invalid request.' && error === 'bad ur') {
          // No data available for location, handle gracefully.
          return {};
        }
      }
      throw errorResponse;
    }
    // Cache response data
    await knex('acis_responses').insert({
      response: responseData,
      ...cacheParams,
    });
  }

  const [yearValue, ...elemValues] = responseData.data[0];

  if (Number(year) !== Number(yearValue) || elemValues.length !== ACIS_ELEM_NAMES.length) {
    throw new Error('Unexpected year or elems');
  }

  return ACIS_ELEM_NAMES.reduce((obj, name, idx) => {
    // Value will be set to -999 if there's no data for the given date.
    // Skip the value in that case.
    if (elemValues[idx] === -999) {
      console.warn(`Value of ${name} is ${elemValues[idx]} for ${year}`);
      return obj;
    }
    obj[name] = elemValues[idx];
    return obj;
  }, {});
}

async function getAcisHistoricalAverages({ lat, lng, dateStart, dateEnd }) {
  const params = {
    grid: 'livneh',
    loc: `${lng},${lat}`,
    sdate: dateStart,
    edate: dateEnd,
    elems: ACIS_ELEMS,
  };
  const cacheParams = {
    grid: params.grid,
    lat,
    lng,
    date_start: params.sdate,
    date_end: params.edate,
    api_url: ACIS_API_ENDPOINT,
  };
  let responseData = await getCachedAcisResponse(cacheParams);

  if (!responseData) {
    // Fetch from API
    try {
      const response = await axios.post(ACIS_API_ENDPOINT, params);
      responseData = response.data;
    } catch (errorResponse) {
      if (errorResponse.response && errorResponse.response.data) {
        const { status, error } = errorResponse.response.data;
        if (status === 'Invalid request.' && error === 'bad ur') {
          // No data available for location, handle gracefully.
          return {};
        }
      }
      throw errorResponse;
    }

    // Cache response data
    await knex('acis_responses').insert({
      response: responseData,
      ...cacheParams,
    });
  }

  const resultsByYear = responseData.data;

  return ACIS_ELEM_NAMES.reduce((obj, name, idx) => {
    obj[name] = _.mean(
      resultsByYear.map((row) => {
        const value = row[idx + 1]; // Add 1 because first element of each row is the year
        if (value < 0) {
          throw new Error(`No data for ${name} for year ${row[0]}`);
        }
        return value;
      }),
    );
    return obj;
  }, {});
}

async function getAcisResults({ lat, lng, year }) {
  const [rcp45, rcp85, historicalAverages] = await Promise.all([
    getAcisProjections({ lat, lng, year, projectionType: 'rcp45' }),
    getAcisProjections({ lat, lng, year, projectionType: 'rcp85' }),
    getAcisHistoricalAverages({
      lat,
      lng,
      dateStart: `1950-01-01`,
      dateEnd: `2013-01-01`, // Observation data stops at 2013
    }),
  ]);

  return ACIS_ELEM_NAMES.map((name) => {
    const attribute = ACIS_ELEM_NAME_TO_ATTRIBUTE[name];
    if (rcp45[name] == null || rcp85[name] == null || historicalAverages[name] == null) {
      return null;
    }
    return {
      attribute,
      rcp45_mean: rcp45[name],
      rcp85_mean: rcp85[name],
      historical_average: historicalAverages[name],
    };
  }).filter((result) => result); // Remove nulls
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

    const [dbResults, acisResults] = await Promise.all([
      getProjectionsFromDB({
        lat,
        lng,
        year: req.query.year,
        maxDistance: 50000,
      }),
      getAcisResults({
        lat,
        lng,
        year: req.query.year,
      }),
    ]);

    return res.status(200).json({
      geo,
      results: [...dbResults, ...acisResults],
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});

module.exports = router;
