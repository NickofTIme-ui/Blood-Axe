// MoveRunner.js — Helpers for reading a move's frame data.
//
// Every attack has three phases, measured in frames (frame 1 = first frame of the move):
//   startup  -> wind-up, no hitbox yet
//   active   -> hitbox is out and can hit
//   recovery -> hitbox gone, fighter is still committed
//
// "Windows" like { from: 8, to: 20 } are inclusive frame ranges within the move,
// used for combo chains and cancels.

export function totalFrames(move) {
  return move.startup + move.active + move.recovery;
}

export function movePhase(move, frame) {
  if (frame <= move.startup) return 'startup';
  if (frame <= move.startup + move.active) return 'active';
  if (frame <= totalFrames(move)) return 'recovery';
  return 'done';
}

export function inWindow(win, frame) {
  return frame >= win.from && frame <= win.to;
}
