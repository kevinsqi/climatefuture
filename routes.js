const express = require('express');
const axios = require('axios');
const knex = require('./db/knex');

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

async function getProjections({ lat, lng, year, maxDistance }) {
  return Promise.all([
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
}

router.get('/locations', async (req, res) => {
  // Validate params
  if (!req.query.address) {
    return res.status(400).json({ error: 'MISSING_ADDRESS' });
  }
  if (!req.query.year) {
    return res.status(400).json({ error: 'MISSING_YEAR' });
  }

  const geo = await geocodeLocation(req.query.address);
  const { lat, lng } = geo.geometry.location;

  const dbResults = await getProjections({
    lat,
    lng,
    year: req.query.year,
    maxDistance: 50000,
  });
  const results = dbResults.map((result) => result.rows[0]).filter((result) => result);

  return res.status(200).json({
    geo,
    results,
  });
});

module.exports = router;
