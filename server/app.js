require('dotenv').config();
const axios = require('axios');
const express = require('express');
const morgan = require('morgan');
const app = express();
const knex = require('./db/knex');

// Logging
app.use(morgan('combined'));

// Parse incoming request JSON
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
const router = express.Router();
router.get('/location', (req, res) => {
  if (!req.query.address) {
    return res.status(400).json({ error: 'MISSING_ADDRESS' });
  }
  if (!req.query.year) {
    return res.status(400).json({ error: 'MISSING_YEAR' });
  }
  axios
    .get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: req.query.address,
        key: process.env.GOOGLE_MAPS_PLATFORM_KEY,
      },
    })
    .then((response) => {
      if (response.data.results.length === 0) {
        return res.status(404).json({ error: 'NO_GEOCODING_RESULTS' });
      }
      const { lat, lng } = response.data.results[0].geometry.location;
      // TODO: fix sql injection, '?' and bindings isn't working with <->?
      return Promise.all([
        Promise.resolve(response.data.results[0]),
        knex.raw(
          `
            SELECT * FROM temperatures_cmip5
            WHERE year_start <= ?
            ORDER BY geography <-> 'SRID=4326;POINT(${lng} ${lat})'
            LIMIT 1
          `,
          [req.query.year],
        ),
        knex.raw(
          `
            SELECT *, (
              SELECT num_days_above_100f FROM noaa_observations
              WHERE ST_Distance(
                ST_Transform('SRID=4326;POINT(${lng} ${lat})'::geometry, 3857),
                ST_Transform(noaa_observations.geography::geometry, 3857)
              ) < 50000
              ORDER BY geography <-> 'SRID=4326;POINT(${lng} ${lat})'
              LIMIT 1
            ) as historical_average
            FROM noaa_projections
            WHERE ST_Distance(
              ST_Transform('SRID=4326;POINT(${lng} ${lat})'::geometry, 3857),
              ST_Transform(noaa_projections.geography::geometry, 3857)
            ) < 50000
            AND attribute = 'num_days_above_100f'
            AND year = ?
            ORDER BY geography <-> 'SRID=4326;POINT(${lng} ${lat})'
            LIMIT 1
          `,
          [req.query.year],
        ),
        knex.raw(
          `
            SELECT *, (
              SELECT num_dry_days FROM noaa_observations
              WHERE ST_Distance(
                ST_Transform('SRID=4326;POINT(${lng} ${lat})'::geometry, 3857),
                ST_Transform(noaa_observations.geography::geometry, 3857)
              ) < 50000
              ORDER BY geography <-> 'SRID=4326;POINT(${lng} ${lat})'
              LIMIT 1
            ) as historical_average
            FROM noaa_projections
            WHERE ST_Distance(
              ST_Transform('SRID=4326;POINT(${lng} ${lat})'::geometry, 3857),
              ST_Transform(noaa_projections.geography::geometry, 3857)
            ) < 50000
            AND attribute = 'num_dry_days'
            AND year = ?
            ORDER BY geography <-> 'SRID=4326;POINT(${lng} ${lat})'
            LIMIT 1
          `,
          [req.query.year],
        ),
        knex.raw(
          `
            SELECT * FROM climate_central_sea_levels
            WHERE ST_Distance(
              ST_Transform('SRID=4326;POINT(${lng} ${lat})'::geometry, 3857),
              ST_Transform(climate_central_sea_levels.geography::geometry, 3857)
            ) < 50000
            AND year = ?
            ORDER BY geography <-> 'SRID=4326;POINT(${lng} ${lat})'
            LIMIT 1
          `,
          [req.query.year],
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
app.use('/api', router);

// Listen
const port = process.env.PORT;
app.listen(port, () => console.log(`Server listening on port ${port}`));
