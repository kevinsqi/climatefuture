const express = require('express');
const axios = require('axios');

const knex = require('../db/knex');
const { getAcisResults } = require('./acis.js');

const router = express.Router();

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
    if (!geo) {
      return res.status(404).json({
        error: 'LOCATION_NOT_FOUND',
      });
    }
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
