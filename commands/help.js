const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show help'),

  async execute(interaction) {
    await interaction.reply(`
🎮 COMMANDS:
/startgame
/join
/setup
/endgame

🔘 Use buttons to play!
`);
  }
};