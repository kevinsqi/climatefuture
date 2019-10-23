const path = require('path');

module.exports = {
  development: {
    client: 'postgresql',
    connection: 'postgres://climate_change_projections_user@localhost/climate_change_projections',
    migrations: {
      directory: path.join(__dirname, '/migrations'),
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './seeds',
    },
  },
};
