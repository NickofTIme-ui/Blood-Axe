// The Iron Gates: Vincent, the scorpion, and the Iron Marshal.
export const STAGE_GATES = {
  "id": "ironGates",
  "name": "THE IRON GATES",
  "chapter": "V",
  "next": {
    "id": "blackKeep",
    "name": "THE BLACK KEEP",
    "chapter": "VI"
  },
  "doneTitle": "THE GATES HAVE FALLEN",
  "width": 10400,
  "theme": "gates",
  "tall": true,
  "castle": {
    "x": 1150,
    "scale": 0.95,
    "detail": 1
  },
  "companions": {
    "leaveAfter": "opening",
    "meet": 9600,
    "farewell": "keep"
  },
  "sections": [
    {
      "id": "field",
      "name": "THE KILLING GROUND",
      "x0": 0,
      "x1": 1500,
      "spawn": {
        "x": 150,
        "z": 440
      },
      "objective": "Reach the gates",
      "hint": "Stones from the wall: watch the ground for the shadow",
      "fightAt": 980,
      "waves": [
        [
          "thrall",
          "thrall",
          "thrall",
          "thrall",
          "thrall",
          "thrall",
          "thrall"
        ],
        [
          "grunt",
          "stalker",
          "butcher"
        ]
      ],
      "props": [
        {
          "kind": "barrel",
          "x": 460,
          "z": 300,
          "drop": null
        },
        {
          "kind": "crate",
          "x": 1400,
          "z": 480,
          "drop": "health"
        }
      ],
      "hazards": [
        {
          "type": "bombard",
          "period": 250,
          "warn": 90,
          "shots": 1,
          "damage": 16
        }
      ]
    },
    {
      "id": "gatehouse",
      "name": "THE GATEHOUSE",
      "x0": 1500,
      "x1": 3200,
      "spawn": {
        "x": 1560,
        "z": 440
      },
      "objective": "Climb the gatehouse. Free the Gatewright",
      "hint": "Pitch through the murder holes: go round the grates when they glow",
      "fightAt": 2500,
      "frees": "vincent",
      "spawns": [
        [
          {
            "x": 2580,
            "z": 380,
            "inPlace": true
          },
          {
            "x": 2640,
            "z": 440,
            "inPlace": true
          },
          {
            "x": 2660,
            "z": 370,
            "inPlace": true
          }
        ],
        [
          {
            "x": 2660,
            "z": 380
          },
          {
            "x": 2660,
            "z": 470
          }
        ]
      ],
      "waves": [
        [
          "grunt",
          "stalker",
          "grunt"
        ],
        [
          "butcher",
          "penitent"
        ]
      ],
      "props": [
        {
          "kind": "crate",
          "x": 3000,
          "z": 480,
          "drop": "mana"
        },
        {
          "kind": "barrel",
          "x": 1720,
          "z": 300,
          "drop": "health"
        }
      ],
      "hazards": [
        {
          "type": "fire",
          "x": 1640,
          "z": 330,
          "w": 80,
          "d": 90,
          "phase": 0
        },
        {
          "type": "fire",
          "x": 1640,
          "z": 460,
          "w": 80,
          "d": 90,
          "phase": 105
        },
        {
          "type": "beam",
          "look": "rock",
          "x": 1900,
          "z": 440,
          "w": 80,
          "d": 80,
          "period": 230,
          "warn": 80,
          "phase": 90
        }
      ],
      "rest": {
        "x": 3060,
        "z": 320,
        "kind": "oath"
      }
    },
    {
      "id": "winch",
      "name": "THE WINCH ROOM",
      "x0": 3200,
      "x1": 4800,
      "spawn": {
        "x": 3260,
        "z": 440
      },
      "objective": "Kill the twins. Break the winch",
      "hint": "Both chains hold the gate: break them both",
      "fightAt": 3640,
      "needs": "winch",
      "waves": [
        [
          "grunt",
          "grunt",
          "stalker"
        ],
        [
          "butcher",
          "grunt"
        ]
      ],
      "props": [
        {
          "kind": "winch",
          "tag": "winch",
          "x": 4380,
          "z": 300,
          "opens": "gate",
          "drop": null
        },
        {
          "kind": "winch",
          "tag": "winch",
          "x": 4600,
          "z": 300,
          "opens": "gate",
          "drop": "health"
        },
        {
          "kind": "barrel",
          "x": 3500,
          "z": 490,
          "drop": null
        }
      ],
      "hazards": [],
      "boss": {
        "type": "gladiator",
        "look": "twin",
        "name": "Hask of the Gate",
        "health": 1.8,
        "damage": 1.1,
        "twin": {
          "type": "gladiator",
          "look": "twin",
          "name": "Hrolf of the Gate",
          "health": 1.8,
          "damage": 1.1
        },
        "grief": {
          "damage": 1.3,
          "speed": 1.2
        },
        "sentence": {
          "crimes": [
            "You held this gate while your king left his own people outside it to die.",
            "You threw them at our blades to slow us down."
          ],
          "last": "Brother... wait for me."
        },
        "phases": []
      }
    },
    {
      "id": "yard",
      "name": "THE GATE YARD",
      "x0": 4800,
      "x1": 6400,
      "spawn": {
        "x": 4900,
        "z": 440
      },
      "objective": "Hold the gate",
      "hint": "They want the gate back. Do not let them have it",
      "fightAt": 5300,
      "waves": [
        [
          "thrall",
          "thrall",
          "thrall",
          "thrall",
          "thrall",
          "thrall",
          "thrall",
          "thrall"
        ],
        [
          "grunt",
          "butcher",
          "stalker",
          "grunt"
        ],
        [
          "gladiator",
          "grunt",
          "penitent"
        ]
      ],
      "props": [
        {
          "kind": "crate",
          "x": 5100,
          "z": 300,
          "drop": "health"
        },
        {
          "kind": "barrel",
          "x": 6300,
          "z": 480,
          "drop": "health"
        }
      ],
      "hazards": [
        {
          "type": "bombard",
          "friendly": true,
          "if": "saved:shelter",
          "period": 150,
          "warn": 50,
          "shots": 2,
          "damage": 22,
          "radius": 52
        },
        {
          "type": "bombard",
          "friendly": true,
          "if": "saved:convoy",
          "period": 210,
          "warn": 50,
          "shots": 1,
          "damage": 22,
          "radius": 52,
          "phase": 70
        },
        {
          "type": "ballista",
          "crew": "vincent",
          "if": "saved:vincent",
          "x": 4960,
          "z": 400
        }
      ]
    },
    {
      "id": "town",
      "name": "THE LOWER TOWN",
      "x0": 6400,
      "x1": 7900,
      "fireBed": 1,
      "spawn": {
        "x": 6460,
        "z": 440
      },
      "objective": "Save the townsfolk",
      "hint": "Break the bar on the granary door. Wreck the catapult up the street",
      "fightAt": 6900,
      "waves": [
        [
          "grunt",
          "butcher",
          "stalker"
        ],
        [
          "penitent",
          "grunt",
          "grunt"
        ]
      ],
      "props": [
        {
          "kind": "wreckage",
          "tag": "granary",
          "x": 7380,
          "z": 300,
          "drop": null
        },
        {
          "kind": "crate",
          "x": 7800,
          "z": 480,
          "drop": "mana"
        },
        {
          "kind": "catapult",
          "tag": "townCatapult",
          "x": 7700,
          "z": 300,
          "drop": "health"
        }
      ],
      "hazards": [
        {
          "type": "bombard",
          "silence": "townCatapult",
          "period": 220,
          "warn": 75,
          "shots": 1,
          "damage": 18
        }
      ],
      "rest": {
        "x": 7820,
        "z": 320,
        "kind": "oath"
      }
    },
    {
      "id": "marshal",
      "name": "THE MARSHAL'S YARD",
      "x0": 7900,
      "x1": 9400,
      "spawn": {
        "x": 7960,
        "z": 440
      },
      "objective": "Kill Malgor, the Iron Marshal",
      "hint": "When the archers loose, watch the shadows. Jump his Earthbreaker",
      "fightAt": 8260,
      "waves": [
        [
          "grunt",
          "stalker",
          "grunt"
        ]
      ],
      "props": [
        {
          "kind": "barrel",
          "x": 8100,
          "z": 300,
          "drop": "health"
        },
        {
          "kind": "crate",
          "x": 9300,
          "z": 490,
          "drop": "health"
        }
      ],
      "hazards": [
        {
          "type": "bombard",
          "when": "phase:walls",
          "period": 180,
          "warn": 70,
          "shots": 2,
          "damage": 16
        },
        {
          "type": "bombard",
          "friendly": true,
          "if": "saved:shelter",
          "when": "phase:walls",
          "period": 160,
          "warn": 50,
          "shots": 1,
          "damage": 22,
          "radius": 52
        },
        {
          "type": "ballista",
          "crew": "vincent",
          "if": "saved:vincent",
          "x": 8060,
          "z": 400,
          "when": "phase:walls",
          "bossShot": "iron"
        }
      ],
      "boss": {
        "type": "warlord",
        "name": "Malgor, the Iron Marshal",
        "health": 4,
        "damage": 1.1,
        "escort": [
          "grunt",
          "grunt"
        ],
        "entrance": {
          "from": 160,
          "to": 340,
          "speed": 58,
          "stepEvery": 34,
          "awe": 30
        },
        "sentence": {
          "speaker": "MALGOR",
          "raise": 54,
          "after": 155,
          "lines": [
            ["$HERO", "You heard them at the gate."],
            ["MALGOR", "I had my orders."],
            ["$HERO", "And you kept it shut."],
            ["MALGOR", "Get on with it."],
            ["$HERO", "For everyone outside."]
          ],
          "crimes": [
            "Three times you begged your king for our heads.",
            "You loosed his archers on your own men to reach us.",
            "You held his gates while he burned his own town behind them."
          ],
          "last": "I asked him for one thing. To face you. Make it clean."
        },
        "phases": [
          {
            "id": "walls",
            "at": 0.66,
            "adds": [
              "thrall",
              "thrall",
              "thrall",
              "thrall"
            ],
            "callout": "ARCHERS ON THE WALLS!"
          },
          {
            "id": "iron",
            "at": 0.33,
            "rage": true,
            "adds": [
              "gladiator"
            ],
            "damage": 1.2,
            "speed": 1.15,
            "callout": "HE WILL NOT FALL!",
            "ai": {
              "attackCooldown": [
                25,
                55
              ],
              "specialEvery": 18
            }
          }
        ]
      }
    },
    {
      "id": "keep",
      "name": "THE KEEP ROAD",
      "x0": 9400,
      "x1": 10400,
      "spawn": {
        "x": 9460,
        "z": 440
      },
      "objective": "On to the Black Keep",
      "hint": "",
      "waves": [],
      "props": [],
      "hazards": []
    }
  ],
  "exit": {
    "x": 10200,
    "after": "keep"
  },
  "terrain": [
    {
      "kind": "block",
      "x0": 640,
      "x1": 760,
      "z0": 380,
      "z1": 470,
      "top": 40,
      "look": "ram"
    },
    {
      "kind": "block",
      "x0": 1750,
      "x1": 1950,
      "z0": 282,
      "z1": 520,
      "top": 70
    },
    {
      "kind": "block",
      "x0": 1950,
      "x1": 2150,
      "z0": 282,
      "z1": 520,
      "top": 140
    },
    {
      "kind": "pit",
      "x0": 2150,
      "x1": 2360,
      "z0": 282,
      "z1": 520
    },
    {
      "kind": "crumble",
      "x0": 2190,
      "x1": 2250,
      "z0": 350,
      "z1": 480,
      "top": 140,
      "fall": 40,
      "back": 200
    },
    {
      "kind": "crumble",
      "x0": 2295,
      "x1": 2360,
      "z0": 350,
      "z1": 480,
      "top": 140,
      "fall": 40,
      "back": 200
    },
    {
      "kind": "block",
      "x0": 2360,
      "x1": 2700,
      "z0": 282,
      "z1": 520,
      "top": 140
    },
    {
      "kind": "block",
      "x0": 2700,
      "x1": 2850,
      "z0": 282,
      "z1": 520,
      "top": 70
    },
    {
      "kind": "block",
      "tag": "gate",
      "mat": "iron",
      "x0": 4740,
      "x1": 4775,
      "z0": 282,
      "z1": 520,
      "top": 300
    },
    {
      "kind": "block",
      "x0": 6640,
      "x1": 6740,
      "z0": 400,
      "z1": 480,
      "top": 40,
      "look": "cart"
    }
  ],
  "lanterns": [
    {
      "x": 400,
      "z": 290
    },
    {
      "x": 1300,
      "z": 290
    },
    {
      "x": 1600,
      "z": 290
    },
    {
      "x": 3000,
      "z": 290
    },
    {
      "x": 3400,
      "z": 290
    },
    {
      "x": 4300,
      "z": 290
    },
    {
      "x": 5000,
      "z": 290
    },
    {
      "x": 6000,
      "z": 290
    },
    {
      "x": 7100,
      "z": 290
    },
    {
      "x": 8000,
      "z": 290
    },
    {
      "x": 9200,
      "z": 290
    },
    {
      "x": 9800,
      "z": 290
    }
  ],
  "bodies": [
    {
      "x": 300,
      "z": 480,
      "pose": 1
    },
    {
      "x": 860,
      "z": 470,
      "pose": 0
    },
    {
      "x": 1180,
      "z": 330,
      "pose": 2
    },
    {
      "x": 5600,
      "z": 480,
      "pose": 1
    },
    {
      "x": 6600,
      "z": 330,
      "pose": 0
    },
    {
      "x": 7200,
      "z": 490,
      "pose": 2
    }
  ],
  "npcs": [
    {
      "id": "vincent",
      "name": "Vincent",
      "x": 2470,
      "z": 330,
      "pose": "gatewright",
      "rescue": "cage",
      "section": "gatehouse",
      "hold": 70,
      "gather": {
        "x": 4900,
        "z": 400
      },
      "posts": [
        {
          "section": "yard",
          "x": 4900,
          "z": 400
        },
        {
          "section": "marshal",
          "x": 8000,
          "z": 400
        },
        {
          "section": "keep",
          "x": 9660,
          "z": 420
        }
      ]
    },
    {
      "id": "townsfolk",
      "name": "the townsfolk",
      "x": 7100,
      "z": 320,
      "pose": "group",
      "rescue": "defend",
      "section": "town",
      "wave": 1,
      "flee": {
        "x": 6500,
        "z": 330
      },
      "gather": {
        "x": 10060,
        "z": 330
      }
    },
    {
      "id": "granary",
      "name": "the reeve's family",
      "x": 7380,
      "z": 296,
      "pose": "family",
      "rescue": "wreckage",
      "tag": "granary",
      "flee": {
        "x": 6500,
        "z": 470
      },
      "gather": {
        "x": 10120,
        "z": 460
      }
    },
    {
      "id": "minersBack",
      "name": "the miners",
      "x": 9720,
      "z": 330,
      "pose": "group",
      "if": "saved:shelter"
    },
    {
      "id": "bramBack",
      "name": "Bram",
      "x": 9880,
      "z": 470,
      "if": "saved:bram"
    },
    {
      "id": "hildeBack",
      "name": "Hilde",
      "x": 9920,
      "z": 450,
      "if": "saved:hilde"
    },
    {
      "id": "jorenBack",
      "name": "Joren",
      "x": 9580,
      "z": 470,
      "if": "saved:joren"
    },
    {
      "id": "convoyBack",
      "name": "the convoy's prisoners",
      "x": 9960,
      "z": 340,
      "pose": "group",
      "if": "saved:convoy"
    }
  ],
  "story": [
    {
      "id": "opening",
      "on": "start",
      "hold": true,
      "delay": 150,
      "lines": [
        [
          "ORYN",
          "The Iron Gates. Shut. And every bow in his army on that wall."
        ],
        [
          "VEXA",
          "He shut them on his own men. Hear them hammering?"
        ],
        [
          "RURIK",
          "Men with nothing left fight hardest. There's a sally port under the east tower. Find it. I'll clear the road."
        ]
      ]
    },
    {
      "id": "stones",
      "at": 420,
      "lines": [
        [
          "ORYN",
          "(from the ditch) Stones from the wall! Watch for the shadow!"
        ]
      ]
    },
    {
      "id": "thralls",
      "at": 900,
      "lines": [
        [
          "VOICE",
          "(at the gates) Open up! Open up, they are coming! OPEN THE GATES!"
        ]
      ]
    },
    {
      "id": "shut",
      "on": "clear:field",
      "calm": true,
      "lines": [
        [
          "VEXA",
          "(from the tower's foot) He left them out here to die in our way. Sally port's open. In!"
        ]
      ]
    },
    {
      "id": "pitch",
      "at": 1580,
      "lines": [
        [
          "ORYN",
          "(from inside the wall) Murder holes! When the grates glow, go round."
        ]
      ]
    },
    {
      "id": "floor",
      "at": 2100,
      "calm": true,
      "lines": [
        [
          "VEXA",
          "(from below) Rotten floor, and an oubliette under it. Stay off it."
        ]
      ]
    },
    {
      "id": "caged",
      "at": 2380,
      "lines": [
        [
          "VINCENT",
          "Here! In the cage!"
        ]
      ]
    },
    {
      "id": "cageAgain",
      "on": "clear:gatehouse",
      "unless": "rescued:vincent",
      "lines": [
        [
          "VINCENT",
          "The lock. Keep pulling."
        ]
      ]
    },
    {
      "id": "vincent",
      "on": "rescued:vincent",
      "hold": true,
      "lines": [
        [
          "VINCENT",
          "They locked me up for opening the gate."
        ],
        [
          "RURIK",
          "Can you open it again?"
        ],
        [
          "VINCENT",
          "The winch is inside. Cut both chains. I'll cover you."
        ]
      ]
    },
    {
      "id": "winchRoom",
      "on": "enter:winch",
      "lines": [
        [
          "ORYN",
          "(from the stair) The winch room. Break the chains on the drums and the gate goes up."
        ]
      ]
    },
    {
      "id": "twins",
      "on": "boss:winch",
      "lines": [
        [
          "HASK",
          "The Marshal said you'd come up the stair."
        ],
        [
          "HROLF",
          "Nobody touches the winch, brother. Nobody."
        ]
      ]
    },
    {
      "id": "grief",
      "on": "twin:winch",
      "lines": [
        [
          "VOICE",
          "(a roar, the twin over his brother) BROTHER! I'll tear you apart!"
        ]
      ]
    },
    {
      "id": "gateUp",
      "on": "broken:winch",
      "lines": [
        [
          "VOICE",
          "(iron grinding, chains running, the great gate rising)"
        ],
        [
          "RURIK",
          "The gate's up! Down to the yard!"
        ]
      ]
    },
    {
      "id": "tower",
      "on": "broken:winch",
      "if": "rescued:vincent",
      "lines": [
        [
          "VINCENT",
          "It's open. Move!"
        ]
      ]
    },
    {
      "id": "answer",
      "at": 5000,
      "lines": [
        [
          "VOICE",
          "(behind you, through the open gate) OATH KEEPERS!"
        ]
      ]
    },
    {
      "id": "miners",
      "at": 5060,
      "if": "saved:shelter",
      "lines": [
        [
          "MINER",
          "Followed you down from the pass! On the wall, lads! Slings!"
        ]
      ]
    },
    {
      "id": "convoy",
      "at": 5120,
      "if": "saved:convoy",
      "lines": [
        [
          "PRISONER",
          "You broke our cage on the wood road. We kept the stones!"
        ]
      ]
    },
    {
      "id": "joren",
      "at": 5180,
      "if": "saved:joren",
      "lines": [
        [
          "JOREN",
          "Mira sent me. I wasn't sitting this one out."
        ]
      ]
    },
    {
      "id": "alone",
      "at": 5060,
      "unless": "saved:shelter",
      "lines": [
        [
          "RURIK",
          "No one's coming. Then we hold it ourselves."
        ]
      ]
    },
    {
      "id": "retake",
      "on": "enter:yard",
      "lines": [
        [
          "VOICE",
          "(drums from the town) Take back the gate! Take it back!"
        ]
      ]
    },
    {
      "id": "scorpion",
      "on": "enter:yard",
      "if": "rescued:vincent",
      "lines": [
        [
          "VOICE",
          "",
          {
            "autoAdvance": true,
            "minFrames": 1
          }
        ]
      ]
    },
    {
      "id": "skewer",
      "on": "bolt:many",
      "lines": [
        [
          "VOICE",
          "",
          {
            "autoAdvance": true,
            "minFrames": 1
          }
        ]
      ]
    },
    {
      "id": "held",
      "on": "clear:yard",
      "calm": true,
      "lines": [
        [
          "RURIK",
          "The gate is ours. Now the town."
        ]
      ]
    },
    {
      "id": "drag",
      "on": "clear:yard",
      "calm": true,
      "if": "rescued:vincent",
      "lines": [
        [
          "VOICE",
          "",
          {
            "autoAdvance": true,
            "minFrames": 1
          }
        ]
      ]
    },
    {
      "id": "fires",
      "at": 6560,
      "lines": [
        [
          "ORYN",
          "(from the rooftops) He's burning his own town to slow us. There's a catapult up the street!"
        ]
      ]
    },
    {
      "id": "townCatapult",
      "on": "broken:townCatapult",
      "lines": [
        [
          "RURIK",
          "No more fire on these streets."
        ]
      ]
    },
    {
      "id": "granaryCry",
      "at": 6900,
      "lines": [
        [
          "VOICE",
          "The granary! They barred the door! My children are in there!"
        ]
      ]
    },
    {
      "id": "townsfolk",
      "on": "rescued:townsfolk",
      "lines": [
        [
          "TOWNSMAN",
          "He told us you were monsters. Monsters don't stop for us."
        ]
      ]
    },
    {
      "id": "granary",
      "on": "rescued:granary",
      "lines": [
        [
          "REEVE",
          "We were his people. He burned us anyway. End him."
        ]
      ]
    },
    {
      "id": "oath",
      "on": "clear:town",
      "calm": true,
      "unless": "lost:townsfolk",
      "lines": [
        [
          "RURIK",
          "His people or ours. Whoever harms them answers to us."
        ]
      ]
    },
    {
      "id": "shrine",
      "at": 7700,
      "calm": true,
      "lines": [
        [
          "VEXA",
          "(from the wall) The Marshal waits in the yard. Alone. He sent his men away. Kneel first."
        ]
      ]
    },
    {
      "id": "malgor",
      "on": "boss:marshal",
      "lines": [
        [
          "MALGOR",
          "Three times I asked him for your heads. Three times he refused me."
        ],
        [
          "MALGOR",
          "Today he gave me the gates. Come. Nothing passes me."
        ]
      ]
    },
    {
      "id": "walls",
      "on": "phase:marshal:walls",
      "lines": [
        [
          "MALGOR",
          "Archers! Loose on the yard! On me too! I'll stand in it!"
        ]
      ]
    },
    {
      "id": "slings",
      "on": "phase:marshal:walls",
      "if": "saved:shelter",
      "lines": [
        [
          "MINER",
          "(from the outer wall) Their archers! Slings on the inner wall!"
        ]
      ]
    },
    {
      "id": "iron",
      "on": "phase:marshal:iron",
      "lines": [
        [
          "MALGOR",
          "I have never fallen under this banner. Never!"
        ]
      ]
    },
    {
      "id": "everyone",
      "on": "phase:marshal:iron",
      "if": "rescued:vincent",
      "lines": [
        [
          "VINCENT",
          "I've got a shot."
        ]
      ]
    },
    {
      "id": "felled",
      "on": "bolt:boss",
      "lines": [
        [
          "VINCENT",
          "Now!"
        ]
      ]
    },
    {
      "id": "fallen",
      "on": "clear:marshal",
      "calm": true,
      "lines": [
        [
          "RURIK",
          "The best man he had. Dead at a door, for a king who never once rode out."
        ],
        [
          "VEXA",
          "(from the wall) Listen. No drums. No horns. Nothing."
        ]
      ]
    },
    {
      "id": "returned",
      "at": 9560,
      "calm": true,
      "if": "saved:shelter",
      "lines": [
        [
          "MINER",
          "The gate stays open. Nobody shuts it again. We'll see to that."
        ]
      ]
    },
    {
      "id": "bramHilde",
      "at": 9800,
      "calm": true,
      "if": "saved:bram",
      "lines": [
        [
          "BRAM",
          "Hilde and I hold the gatehouse. Go. Bring the rest of them home."
        ]
      ]
    },
    {
      "id": "reeve",
      "at": 9900,
      "calm": true,
      "if": "rescued:granary",
      "lines": [
        [
          "REEVE",
          "The Keep has a prison wing on its east side. Our sons are in there."
        ]
      ]
    },
    {
      "id": "postern",
      "at": 9620,
      "calm": true,
      "if": "rescued:vincent",
      "lines": [
        [
          "VINCENT",
          "There's a service door below the old well. I'll meet you there."
        ]
      ]
    },
    {
      "id": "keep",
      "at": 10000,
      "calm": true,
      "hold": true,
      "lines": [
        [
          "ORYN",
          "There it is. The Black Keep. And nothing between us and him now."
        ],
        [
          "VEXA",
          "No one left to send. Only walls."
        ],
        [
          "RURIK",
          "Then we go through them. For the ones still inside. Now we end it."
        ]
      ]
    }
  ],
  "cutaway": "fear"
};
