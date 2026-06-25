require('dotenv').config();
const fs = require('fs');
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const { handleButton } = require('./game');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
const commands = [];

// ✅ ADD IT HERE (after client is created)
client.once('clientReady', () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);
});

// Load commands
const files = fs.readdirSync('./commands');

for (const file of files) {
  const cmd = require(`./commands/${file}`);
  client.commands.set(cmd.data.name, cmd);
  commands.push(cmd.data.toJSON());
}

// Register commands
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  );
  console.log("✅ Slash commands registered");
})();

// Interaction handler
client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const cmd = client.commands.get(interaction.commandName);
    if (cmd) await cmd.execute(interaction);
  }

  if (interaction.isButton()) {
    await handleButton(interaction);
  }
});

// ✅ login stays LAST
client.login(process.env.TOKEN);
``