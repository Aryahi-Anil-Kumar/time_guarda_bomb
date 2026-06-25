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

function getTableLayout() {
  const players = game.players;

  const mark = (p) =>
    p.id === game.currentPlayer
      ? `🎯 <@${p.id}>`
      : `▪️ <@${p.id}>`;

  const names = players.map(mark);

  if (players.length <= 4) return names.join("     ");

  const half = Math.ceil(players.length / 2);
  const top = names.slice(0, half).join("     ");
  const bottom = names.slice(half).reverse().join("     ");

  return `
      ${top}

      ${bottom}
`;
}

async function setupGame(interaction, settings) {
  if (!game) {
    return interaction.reply({
      content: "❌ Start with /startgame",
      flags: 64
    });
  }

  if (interaction.user.id !== game.host.id) {
    return interaction.reply({
      content: "❌ Only host can setup",
      flags: 64
    });
  }

  game.settings = settings;
  let ids = generateIdentities(settings);

  for (let i = 0; i < game.players.length; i++) {
    let p = game.players[i];
    game.identities[p.id] = ids[i];

    try {
      await p.send(`🎭 Your role: **${ids[i].toUpperCase()}**`);
    } catch {
      console.log("DM role failed");
    }
  }

  await startRound(interaction);
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

    try {
      await p.send(`🃏 Round ${game.round}\n${msg}`);
    } catch {
      console.log("DM cards failed");
    }
  }

  let table = getTableLayout();

  await interaction.channel.send(
    `🌀 Round ${game.round} begins!

🎯 Current Turn: <@${game.currentPlayer}>

${table}`
  );

  sendPlayerButtons(interaction.channel);
}

function sendPlayerButtons(channel) {
  const table = getTableLayout();

  const buttons = game.players.map(p =>
    new ButtonBuilder()
      .setCustomId(`target_${p.id}`)
      .setLabel(p.username)
      .setStyle(
        p.id === game.currentPlayer
          ? ButtonStyle.Success
          : ButtonStyle.Primary
      )
  );

  channel.send({
    content: `🎯 **Choose a player:**\n\n${table}`,
    components: [new ActionRowBuilder().addComponents(buttons)]
  });
}

function sendCardButtons(channel, targetId) {
  let hand = game.hands[targetId];

  let buttons = hand.map((_, i) =>
    new ButtonBuilder()
      .setCustomId(`card_${targetId}_${i}`)
      .setLabel(`🂠 ${i + 1}`)
      .setStyle(ButtonStyle.Secondary)
  );

  channel.send({
    content: "🂠 Choose a card:",
    components: [new ActionRowBuilder().addComponents(buttons)]
  });
}

async function handleButton(interaction) {
  if (!game || !game.active) return;

  if (interaction.user.id !== game.currentPlayer) {
    return interaction.reply({
      content: "Not your turn!",
      flags: 64
    });
  }

  const id = interaction.customId;

  if (id.startsWith("target_")) {
    let targetId = id.split("_")[1];
    await interaction.deferUpdate();
    sendCardButtons(interaction.channel, targetId);
    return;
  }

  if (id.startsWith("card_")) {
    await interaction.deferUpdate();

    let [, targetId, index] = id.split("_");
    index = parseInt(index);

    let card = game.hands[targetId].splice(index, 1)[0];
    game.center.push(card);

    let reveal = ["ace", "king", "queen"].includes(card.type);

    let centerDisplay = game.center
      .map(c =>
        ["ace", "king", "queen"].includes(c.type)
          ? cardEmoji(c.type)
          : "🎴"
      )
      .join(" ");

    game.currentPlayer = targetId;
    game.flips++;

    let turnsLeft = game.players.length - game.flips;
    let table = getTableLayout();

    await interaction.channel.send(
      `🎴 <@${interaction.user.id}> flipped <@${targetId}>: ${
        reveal
          ? `${cardEmoji(card.type)} **${card.type.toUpperCase()}**`
          : "🎴 Hidden"
      }

🧩 Center:
${centerDisplay}

🎯 Current Turn: <@${game.currentPlayer}>
⏳ Turns Left: ${turnsLeft}

${table}`
    );

    if (card.type === "ace") {
      interaction.channel.send("🛑 ACE FOUND — GAME OVER");
      game.active = false;
      return;
    }

    let faces = game.center.filter(c =>
      ["king", "queen"].includes(c.type)
    );

    if (faces.length === game.players.length) {
      interaction.channel.send("🛑 All face cards revealed — GAME OVER");
      game.active = false;
      return;
    }

    if (game.flips >= game.players.length) {
      await nextRound(interaction);
      return;
    }

    sendPlayerButtons(interaction.channel);
  }
}

async function nextRound(interaction) {
  let remaining = [];
  Object.values(game.hands).forEach(h => remaining.push(...h));

  game.round++;

  if (game.round > 5) {
    interaction.channel.send("🏁 Game complete!");
    game.active = false;
    return;
  }

  let deck = shuffle(remaining);
  let cardsPerPlayer = 6 - game.round;

  game.players.forEach(p => {
    game.hands[p.id] = deck.splice(0, cardsPerPlayer);
  });

  game.flips = 0;

  for (let p of game.players) {
    let msg = game.hands[p.id]
      .map((c, i) => `${i + 1}: ${cardEmoji(c.type)}`)
      .join("\n");

    try {
      await p.send(`🃏 Round ${game.round}\n${msg}`);
    } catch {}
  }

  let table = getTableLayout();

  await interaction.channel.send(
    `🔁 Round ${game.round} begins!

🎯 Current Turn: <@${game.currentPlayer}>

${table}`
  );

  sendPlayerButtons(interaction.channel);
}

function endGame(interaction) {
  if (!game) return;

  if (interaction.user.id !== game.host.id) {
    return interaction.reply({
      content: "Only host can end",
      flags: 64
    });
  }

  game = null;
  interaction.reply("✅ Game ended");
}

module.exports = {
  createGame,
  joinGame,
  setupGame,
  handleButton,
  endGame
};