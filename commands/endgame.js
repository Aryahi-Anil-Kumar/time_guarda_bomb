const { SlashCommandBuilder } = require('discord.js');
const { endGame } = require('../game');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('endgame')
    .setDescription('End the current game'),

  async execute(interaction) {
    endGame(interaction);
  }
};