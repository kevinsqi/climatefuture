exports.up = function(knex) {
  return Promise.all([
    knex.schema.raw(
      `
        CREATE TABLE acis_responses (
          grid text NOT NULL,
          lat text NOT NULL,
          lng text NOT NULL,
          date_start date NOT NULL,
          date_end date NOT NULL,
          api_url text NOT NULL,
          response jsonb NOT NULL,
          expires_at date,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `,
    ),
    knex.schema.raw(
      `
        CREATE UNIQUE INDEX unique_keys ON acis_responses (grid, lat, lng, date_start, date_end, api_url)
      `,
    ),
  ]);
};

exports.down = function(knex) {
  return knex.schema.raw(`DROP TABLE acis_responses`);
};
