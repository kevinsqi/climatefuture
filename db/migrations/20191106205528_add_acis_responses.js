
exports.up = function(knex) {
  return knex.schema.raw(
    `
      CREATE_TABLE acis_responses (
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
    `
  );
};

exports.down = function(knex) {
  return knex.schema.raw(`DROP TABLE acis_responses`),
};
