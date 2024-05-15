/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('art', (table) => {
    table.increments('id');
    table.string('title').notNullable();
    table.integer('authorid').notNullable();
    table.string('description').notNullable();
    table.string('image').notNullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('art');
};
