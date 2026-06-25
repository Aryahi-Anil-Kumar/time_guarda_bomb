const { SlashCommandBuilder } = require('discord.js');
const { setupGame } = require('../game');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Setup roles for the game')

    .addIntegerOption(o =>
      o.setName('good')
        .setDescription('Number of good players')
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName('bad')
        .setDescription('Number of bad players')
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName('wild')
        .setDescription('Number of wild players')
        .setRequired(true)
    ),

  async execute(interaction) {

  await interaction.deferReply(); // ✅ tell Discord “working”

  await setupGame(interaction, {
    good: interaction.options.getInteger('good'),
    bad: interaction.options.getInteger('bad'),
    wild: interaction.options.getInteger('wild')
  });

  await interaction.editReply("✅ Game configured!");
}
};