const axios = require('axios');
const _ = require('lodash');

const knex = require('../db/knex');

const ACIS_API_ENDPOINT = 'https://grid2.rcc-acis.org/GridData';

// If you update this, acis_responses cache table should be invalidated.
// See https://github.com/nemac/climate-explorer/blob/master/resources/vendor/climate-widget-graph/src/main.js
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

async function getCachedAcisResponse(params) {
  const results = await knex('acis_responses').where(params);
  return results.length > 0 && results[0];
}

async function fetchAcisData({ grid, lat, lng, date_start, date_end, api_url }) {
  try {
    const response = await axios.post(api_url, {
      // TODO: parameterize wmean, add allMin/allMax
      grid,
      loc: `${lng},${lat}`,
      sdate: date_start,
      edate: date_end,
      elems: ACIS_ELEMS,
    });
  } catch (errorResponse) {
    if (errorResponse.response && errorResponse.response.data) {
      const { status, error } = errorResponse.response.data;
      if (status === 'Invalid request.' && error === 'bad ur') {
        // No data available for location, handle gracefully.
        return errorResponse.response.data;
      }
    }
    throw errorResponse;
  }
  return response.data;
}

async function getAcisProjections({ lat, lng, year, projectionType }) {
  // Try fetching from cache
  const params = {
    grid: `loca:wmean:${projectionType}`,
    lat,
    lng,
    date_start: `${year}-01-01`,
    date_end: `${year}-12-31`,
    api_url: ACIS_API_ENDPOINT,
  };
  const result = await getCachedAcisResponse(params);
  let responseData;

  if (result) {
    responseData = result.response;
  } else {
    responseData = await fetchAcisData(params);

    // Cache response data
    await knex('acis_responses').insert({
      response: responseData,
      ...params,
    });
  }

  if (responseData.error) {
    return {};
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
    lat,
    lng,
    date_start: dateStart,
    date_end: dateEnd,
    api_url: ACIS_API_ENDPOINT,
  };
  const result = await getCachedAcisResponse(params);
  let responseData;

  if (result) {
    responseData = result.response;
  } else {
    responseData = await fetchAcisData(params);

    // Cache response data
    await knex('acis_responses').insert({
      response: responseData,
      ...params,
    });
  }

  if (responseData.error) {
    return {};
  }

  const resultsByYear = responseData.data;

  return ACIS_ELEM_NAMES.reduce((obj, name, idx) => {
    // Average the data across all years
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

exports.getAcisResults = getAcisResults;
