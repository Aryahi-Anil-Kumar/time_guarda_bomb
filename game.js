const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { cardEmoji } = require('./utils/cards');

let game = null;

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function createGame(user) {
  game = {
    host: user,
    players: [user],
    identities: {},
    hands: {},
    center: [],
    currentPlayer: user.id,
    round: 1,
    flips: 0,
    active: true,
    settings: null
  };
}

function joinGame(user) {
  if (!game || !game.active) return;

  if (!game.players.find(p => p.id === user.id)) {
    game.players.push(user);
  }
}

function generateDeck(n) {
  let deck = [{ type: "ace" }];

  let kings = Math.ceil(n / 2);
  let queens = Math.floor(n / 2);

  for (let i = 0; i < kings; i++) deck.push({ type: "king" });
  for (let i = 0; i < queens; i++) deck.push({ type: "queen" });

  while (deck.length < n * 5) deck.push({ type: "number" });

  return shuffle(deck);
}

function generateIdentities({ good, bad, wild }) {
  let ids = [];

  for (let i = 0; i < good; i++) ids.push("red");
  for (let i = 0; i < bad; i++) ids.push("black");

  for (let i = 0; i < wild; i++) {
    ids.push(Math.random() < 0.5 ? "red" : "black");
  }

  return shuffle(ids);
}

async function setupGame(interaction, settings) {
  if (interaction.user.id !== game.host.id) {
    return interaction.reply({ content: "Only host can setup!", ephemeral: true });
  }

  game.settings = settings;

  let ids = generateIdentities(settings);

  for (let i = 0; i < game.players.length; i++) {
    let p = game.players[i];
    game.identities[p.id] = ids[i];
    await p.send(`🎭 Your role: **${ids[i].toUpperCase()}**`);
  }

  startRound(interaction);
}

async function startRound(interaction) {
  let deck = generateDeck(game.players.length);
  let cardsPerPlayer = 6 - game.round;

  game.flips = 0;

  game.players.forEach(p => {
    game.hands[p.id] = deck.splice(0, cardsPerPlayer);
  });

  for (let p of game.players) {
    let msg = game.hands[p.id]
      .map((c, i) => `${i + 1}: ${cardEmoji(c.type)}`)
      .join("\n");

    await p.send(`🃏 Round ${game.round}\n${msg}`);
  }

  await interaction.channel.send(
    `🌀 Round ${game.round} begins!\n<@${game.currentPlayer}> plays`
  );

  sendPlayerButtons(interaction.channel);
}

function sendPlayerButtons(channel) {
  let buttons = game.players.map(p =>
    new ButtonBuilder()
      .setCustomId(`target_${p.id}`)
      .setLabel(p.username)
      .setStyle(ButtonStyle.Primary)
  );

  channel.send({
    content: "Choose a player:",
    components: [new ActionRowBuilder().addComponents(buttons)]
  });
}

function sendCardButtons(channel, targetId) {
  let hand = game.hands[targetId];

  let buttons = hand.map((_, i) =>
    new ButtonBuilder()
      .setCustomId(`card_${targetId}_${i}`)
      .setLabel(`${i + 1}`)
      .setStyle(ButtonStyle.Secondary)
  );

  channel.send({
    content: "Choose a card:",
    components: [new ActionRowBuilder().addComponents(buttons)]
  });
}

async function handleButton(interaction) {
  if (!game || !game.active) return;

  if (interaction.user.id !== game.currentPlayer) {
    return interaction.reply({ content: "Not your turn!", ephemeral: true });
  }

  const id = interaction.customId;

  if (id.startsWith("target_")) {
    let targetId = id.split("_")[1];
    sendCardButtons(interaction.channel, targetId);
    return interaction.deferUpdate();
  }

  if (id.startsWith("card_")) {
    let [, targetId, index] = id.split("_");
    index = parseInt(index);

    let card = game.hands[targetId].splice(index, 1)[0];
    game.center.push(card);

    let reveal = ["ace", "king", "queen"].includes(card.type);

    await interaction.channel.send(
      `🎴 <@${interaction.user.id}> flipped <@${targetId}>: ${
        reveal ? `${card.type.toUpperCase()} ${cardEmoji(card.type)}` : "Hidden 🂠"
      }`
    );

    game.currentPlayer = targetId;
    game.flips++;

    if (card.type === "ace") {
      await interaction.channel.send("🛑 ACE FOUND — GAME OVER");
      game.active = false;
      return;
    }

    let faces = game.center.filter(c => ["king", "queen"].includes(c.type));
    if (faces.length === game.players.length) {
      await interaction.channel.send("🛑 All face cards revealed — GAME OVER");
      game.active = false;
      return;
    }

    if (game.flips >= game.players.length) {
      nextRound(interaction);
      return;
    }

    sendPlayerButtons(interaction.channel);
  }
}

function nextRound(interaction) {
  let remaining = [];

  Object.values(game.hands).forEach(h => remaining.push(...h));

  game.round++;

  if (game.round > 5) {
    interaction.channel.send("🏁 Game finished!");
    game.active = false;
    return;
  }

  let deck = shuffle(remaining);

  let cardsPerPlayer = 6 - game.round;

  game.players.forEach(p => {
    game.hands[p.id] = deck.splice(0, cardsPerPlayer);
  });

  game.flips = 0;

  interaction.channel.send(`🔁 Round ${game.round} begins!`);

  sendPlayerButtons(interaction.channel);
}

function endGame(interaction) {
  if (interaction.user.id !== game.host.id) {
    return interaction.reply({ content: "Only host can end!", ephemeral: true });
  }

  game = null;
  interaction.reply("Game ended.");
}

module.exports = {
  createGame,
  joinGame,
  setupGame,
  handleButton,
  endGame
};