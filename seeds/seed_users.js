/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('users').del()
  await knex('users').insert([
    {name: "Jan Kowalski", age: 25},
    {name: "Anna Nowak", age: 19},
    {name: "Julia Ala", age: 20},
  ]);
};
