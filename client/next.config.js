const API_HOSTS = {
  development: 'http://localhost:3001',
  production: 'http://api.climatefuture.io',
};

const API_HOST = API_HOSTS[process.env.NODE_ENV];

if (!API_HOST) {
  throw new Error(`No API host for ${process.env.NODE_ENV}`);
}

module.exports = {
  env: {
    API_HOST: API_HOST,
  },
};
