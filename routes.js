const express = require('express');
const axios = require('axios');
const knex = require('./db/knex');

const router = express.Router();

router.get('/locations', (req, res) => {
  if (!req.query.address) {
    return res.status(400).json({ error: 'MISSING_ADDRESS' });
  }
  if (!req.query.year) {
    return res.status(400).json({ error: 'MISSING_YEAR' });
  }
  axios
    // Geocode location
    .get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: req.query.address,
        key: process.env.GOOGLE_MAPS_PLATFORM_KEY,
      },
    })
    // Query relevant data based on location
    .then((response) => {
      if (response.data.results.length === 0) {
        return res.status(404).json({ error: 'NO_GEOCODING_RESULTS' });
      }
      const { lat, lng } = response.data.results[0].geometry.location;
      const MAX_DISTANCE = 50000;
      return Promise.all([
        Promise.resolve(response.data.results[0]),
        knex.raw(
          `
            SELECT * FROM temperatures_cmip5
            WHERE year_start <= :year
            ORDER BY geography <-> :point
            LIMIT 1
          `,
          { year: req.query.year, point: `SRID=4326;POINT(${lng} ${lat})` },
        ),
        knex.raw(
          `
            SELECT *, (
              SELECT num_days_above_100f FROM noaa_observations
              WHERE ST_Distance(
                ST_Transform(:point::geometry, 3857),
                ST_Transform(noaa_observations.geography::geometry, 3857)
              ) < :maxdistance
              ORDER BY geography <-> :point
              LIMIT 1
            ) as historical_average
            FROM noaa_projections
            WHERE ST_Distance(
              ST_Transform(:point::geometry, 3857),
              ST_Transform(noaa_projections.geography::geometry, 3857)
            ) < :maxdistance
            AND attribute = 'num_days_above_100f'
            AND year = :year
            ORDER BY geography <-> :point
            LIMIT 1
          `,
          {
            year: req.query.year,
            point: `SRID=4326;POINT(${lng} ${lat})`,
            maxdistance: MAX_DISTANCE,
          },
        ),
        knex.raw(
          `
            SELECT *, (
              SELECT num_dry_days FROM noaa_observations
              WHERE ST_Distance(
                ST_Transform(:point::geometry, 3857),
                ST_Transform(noaa_observations.geography::geometry, 3857)
              ) < :maxdistance
              ORDER BY geography <-> :point
              LIMIT 1
            ) as historical_average
            FROM noaa_projections
            WHERE ST_Distance(
              ST_Transform(:point::geometry, 3857),
              ST_Transform(noaa_projections.geography::geometry, 3857)
            ) < :maxdistance
            AND attribute = 'num_dry_days'
            AND year = :year
            ORDER BY geography <-> :point
            LIMIT 1
          `,
          {
            year: req.query.year,
            point: `SRID=4326;POINT(${lng} ${lat})`,
            maxdistance: MAX_DISTANCE,
          },
        ),
        knex.raw(
          `
            SELECT * FROM climate_central_sea_levels
            WHERE ST_Distance(
              ST_Transform(:point::geometry, 3857),
              ST_Transform(climate_central_sea_levels.geography::geometry, 3857)
            ) < :maxdistance
            AND year = :year
            ORDER BY geography <-> :point
            LIMIT 1
          `,
          {
            year: req.query.year,
            point: `SRID=4326;POINT(${lng} ${lat})`,
            maxdistance: MAX_DISTANCE,
          },
        ),
      ]);
    })
    .then(([geoResult, ...dbResults]) => {
      const results = dbResults.map((result) => result.rows[0]).filter((result) => result);
      return res.status(200).json({
        geo: geoResult,
        results,
      });
    })
    .catch((error) => {
      console.error(error);
    });
});

module.exports = router;
