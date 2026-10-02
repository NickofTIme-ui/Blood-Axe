// fonts.js — The game's typefaces (loaded from Google Fonts in index.html).
//
//   display  MedievalSharp — hand-cut medieval capitals: titles, call-outs, YOU DIED
//   ui       MedievalSharp too — names, labels, hints (one face keeps it all of a piece)
//   body     Cormorant Garamond — longer descriptive text
// MedievalSharp has a single weight, so text using it is never set bold (a faked bold
// smears its sharp edges). Each falls back to Georgia if the fonts couldn't be fetched.

export const FONT = {
  display: "'MedievalSharp', Georgia, serif",
  ui: "'MedievalSharp', Georgia, serif",
  body: "'Cormorant Garamond', Georgia, serif",
};

// Canvas text only uses a web font once it has loaded, so wait for them before the game
// draws anything (never longer than `timeout` ms — offline, just carry on).
export function loadFonts(timeout = 3000) {
  if (!document.fonts?.load) return Promise.resolve();
  const loads = [
    "400 64px 'MedievalSharp'",
    "600 20px 'Cormorant Garamond'", "700 20px 'Cormorant Garamond'",
  ].map((f) => document.fonts.load(f).catch(() => null));
  return Promise.race([Promise.all(loads), new Promise((r) => setTimeout(r, timeout))]);
}

// Gradient fill + soft drop shadow on a Phaser Text, top-to-bottom colours.
// Call again after changing the text (the gradient is sized to it).
export function epicFill(text, stops = ['#ff5a3a', '#b3000f', '#3d0004']) {
  const h = text.canvas.height / (text.style.resolution || 1);
  const g = text.context.createLinearGradient(0, 0, 0, h);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  text.setFill(g);
  text.setShadow(0, 3, 'rgba(0,0,0,0.85)', 8, true, true);
  return text;
}
