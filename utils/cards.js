function cardEmoji(type) {
  switch (type) {
    case "ace": return "♠️ (Ace)";
    case "king": return "🤴 (King)";
    case "queen": return "👸 (Queen)";
    default: return "🎴 (card)";
  }
}

module.exports = { cardEmoji };