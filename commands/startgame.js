const { SlashCommandBuilder } = require('discord.js');
const { createGame } = require('../game');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('startgame')
    .setDescription('Start a game'),

  async execute(interaction) {
    createGame(interaction.user);
    await interaction.reply("✅ Game started! Use /join");
  }
};