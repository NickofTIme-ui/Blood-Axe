// controls.js — Rebindable controls. Change the lists below to rebind.
//
// KEYBOARD: use Phaser key names, e.g. 'A', 'SPACE', 'SHIFT', 'LEFT', 'ENTER', 'F2',
//           'ONE' (the 1 key), 'NUMPAD_ZERO'. You can list several keys per action.
// GAMEPAD:  button numbers in the "standard" layout (Xbox names shown):
//           0=A 1=B 2=X 3=Y 4=LB 5=RB 6=LT 7=RT 8=Back/View 9=Start/Menu
//           10=left stick click 12=D-pad Up 13=D-pad Down 14=D-pad Left 15=D-pad Right
//           The left analog stick always moves.

export const CONTROLS = {
  keyboard: {
    // Movement
    left:  ['A', 'LEFT'],
    right: ['D', 'RIGHT'],
    up:    ['W', 'UP'],
    down:  ['S', 'DOWN'],

    // Combat actions
    attack: ['J'],          // light attack (press repeatedly for a 3-hit combo)
    heavy:  ['K'],          // heavy attack
    block:  ['L'],          // hold to block; tap right before a hit to PARRY
    dodge:  ['SHIFT', 'I'], // dodge roll (direction = movement keys)
    magic:  ['U'],          // cast spell
    kick:   ['O'],          // forward Sparta kick: breaks guards, sends people flying
    jump:   ['SPACE'],
    sprint: ['C'],          // sprint on / off (while moving)

    // Menus / system
    confirm: ['ENTER', 'J', 'SPACE'],
    debug:   ['F2', 'BACKTICK'], // show hitboxes & state info
    gore:    ['G'],              // cycle gore level
    pause:   ['P', 'ENTER'],     // pause / resume (the game also pauses itself if you tab away)
    restart: ['R'],              // dead: rise at the checkpoint. Paused / won: restart the stage
    menu:    ['ESC'],            // playing: pause. Paused / dead / won: back to character select
    mute:    ['M'],              // music on/off
  },

  gamepad: {
    left: [14], right: [15], up: [12], down: [13],
    attack: [2],     // X
    heavy:  [3],     // Y
    jump:   [0],     // A
    dodge:  [1],     // B
    block:  [5],     // RB
    kick:   [7],     // RT — Sparta kick
    magic:  [4, 6],  // LB or LT
    sprint: [10],    // click the left stick: sprint on / off
    confirm: [0, 9],
    pause:   [9],    // Start
    restart: [3],    // Y — only acts when dead, paused or after winning (it's the heavy button in a fight)
    menu:    [8],    // Back / View
  },

  stickDeadzone: 0.3,
};

// TWO PLAYERS ON ONE COMPUTER. Gamepads are handed out first (one pad: player 2 gets
// it; two pads: one each). Whoever is left on the keyboard uses these: player 1 keeps
// the left side as above (minus the arrow keys), player 2 takes the arrows + number pad.
export const CONTROLS_P1_SHARED = {
  ...CONTROLS,
  keyboard: { ...CONTROLS.keyboard, left: ['A'], right: ['D'], up: ['W'], down: ['S'], confirm: ['J', 'SPACE'], pause: ['P'] },
};
export const CONTROLS_P2 = {
  keyboard: {
    left: ['LEFT'], right: ['RIGHT'], up: ['UP'], down: ['DOWN'],
    attack: ['NUMPAD_ONE'], heavy: ['NUMPAD_TWO'], block: ['NUMPAD_THREE'],
    dodge: ['NUMPAD_ZERO'], kick: ['NUMPAD_FOUR'], magic: ['NUMPAD_FIVE'], jump: ['NUMPAD_SIX'], sprint: ['NUMPAD_SEVEN'],
    confirm: ['NUMPAD_ONE', 'ENTER'], pause: ['ENTER'], restart: [], menu: [], debug: [], gore: [], mute: [],
  },
  gamepad: CONTROLS.gamepad,
  stickDeadzone: CONTROLS.stickDeadzone,
};
