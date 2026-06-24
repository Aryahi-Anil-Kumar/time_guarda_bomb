const { SlashCommandBuilder } = require('discord.js');
const { joinGame } = require('../game');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Join the game'),

  async execute(interaction) {
    joinGame(interaction.user);
    await interaction.reply(`${interaction.user.username} joined!`);
  }
};