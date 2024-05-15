/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('art').del()
  await knex('art').insert([
    {title: "Stanczyk", authorid: 1, description: "jakis opis", image: "link do obrazka"},
    {title: "The starry night", authorid: 2, description: "fajen :)", image: "link do obrazka"},
    {title: "Mona Lisa", authorid: 3, description: "jooooo calkiem niezle", image: "link do obrazka"}
  ]);
};
