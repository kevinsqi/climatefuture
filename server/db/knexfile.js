const path = require('path');

module.exports = {
  development: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: path.join(__dirname, '/migrations'),
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './seeds',
    },
  },
  production: {
    client: 'postgresql',
    connection: {
      host: process.env.RDS_HOSTNAME,
      user: process.env.RDS_USERNAME,
      password: process.env.RDS_PASSWORD,
      port: process.env.RDS_PORT,
    },
    migrations: {
      directory: path.join(__dirname, '/migrations'),
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './seeds',
    },
  },
};
