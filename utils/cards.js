function cardEmoji(type) {
  switch (type) {
    case "ace": return "🂡";
    case "king": return "🂮";
    case "queen": return "🂭";
    default: return "🂠";
  }
}

module.exports = { cardEmoji };