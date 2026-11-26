// Orsk's mountain siegeworks. Route geometry retained; garrison encounters expanded.
export const STAGE_ASCENT = {
  "id": "shatteredAscent",
  "name": "THE SHATTERED ASCENT",
  "chapter": "IV",
  "next": {
    "id": "ironGates",
    "name": "THE IRON GATES",
    "chapter": "V"
  },
  "doneTitle": "THE ASCENT IS TAKEN",
  "width": 9800,
  "theme": "ascent",
  "tall": true,
  "castle": {
    "x": 1250,
    "scale": 0.6,
    "detail": 0.85
  },
  "music": "cliffs",
  "companions": {
    "leaveAfter": "opening",
    "meet": 9200,
    "farewell": "gates"
  },
  "sections": [
    {
      "id": "road",
      "name": "THE CLIFF ROAD",
      "x0": 0,
      "x1": 1400,
      "spawn": {
        "x": 150,
        "z": 440
      },
      "objective": "Break through the cliff checkpoint",
      "hint": "Watch the falling-stone shadow, then take the road",
      "fightAt": 1020,
      "waves": [
        [
          "grunt",
          "siegeguard",
          "siegeguard",
          "grunt"
        ]
      ],
      "props": [
        {
          "kind": "barrel",
          "x": 420,
          "z": 300,
          "drop": null
        },
        {
          "kind": "crate",
          "x": 1300,
          "z": 480,
          "drop": "health"
        },
        {
          "kind": "crate",
          "look": "crate-long",
          "x": 980,
          "z": 302,
          "drop": null
        },
        {
          "kind": "barrel",
          "look": "keg2",
          "x": 1220,
          "z": 306,
          "drop": null
        }
      ],
      "hazards": [
        {
          "type": "beam",
          "look": "rock",
          "x": 820,
          "z": 420,
          "w": 80,
          "d": 80,
          "period": 200,
          "warn": 80,
          "phase": 0,
          "until": "clear"
        }
      ],
      "spawns": [
        [
          {
            "x": 1200,
            "z": 370,
            "inPlace": true
          },
          {
            "x": 1230,
            "z": 470,
            "inPlace": true
          },
          {
            "x": 1320,
            "z": 340,
            "inPlace": true
          },
          {
            "x": 1320,
            "z": 450,
            "inPlace": true
          }
        ]
      ]
    },
    {
      "id": "stair",
      "name": "THE CUT ROAD",
      "x0": 1400,
      "x1": 3000,
      "spawn": {
        "x": 1460,
        "z": 440
      },
      "objective": "Break through the road guard",
      "hint": "Keep the old road open",
      "fightAt": 2320,
      "spawns": [
        [
          {
            "x": 2480,
            "z": 400,
            "inPlace": true
          },
          {
            "x": 2500,
            "z": 475,
            "inPlace": true
          },
          {
            "x": 2560,
            "z": 355,
            "inPlace": true
          }
        ]
      ],
      "waves": [
        [
          "grunt",
          "stonebreaker",
          "siegeguard"
        ]
      ],
      "props": [
        {
          "kind": "urn",
          "x": 2480,
          "z": 310,
          "drop": "charm",
          "secret": true
        }
      ],
      "hazards": [],
      "rest": {
        "x": 2810,
        "z": 395,
        "kind": "oath"
      }
    },
    {
      "id": "shelter",
      "name": "THE SHELTER",
      "x0": 3000,
      "x1": 4500,
      "spawn": {
        "x": 3060,
        "z": 440
      },
      "objective": "Drive the siege troops from the refuge",
      "hint": "The overhang is safe. Their stones can kill their own men",
      "fightAt": 3620,
      "waves": [
        [
          "grunt",
          "siegeguard",
          "stalker",
          "siegeguard",
          "stonebreaker",
          "grunt",
          "stalker",
          "grunt"
        ]
      ],
      "props": [
        {
          "kind": "barrel",
          "x": 4400,
          "z": 490,
          "drop": "health"
        },
        {
          "kind": "crate",
          "look": "crate-long",
          "x": 3850,
          "z": 290,
          "drop": "mana"
        },
        {
          "kind": "barrel",
          "look": "keg2",
          "x": 4170,
          "z": 300,
          "drop": null
        },
        {
          "kind": "barrel",
          "x": 4360,
          "z": 335,
          "drop": "health"
        }
      ],
      "hazards": [
        {
          "type": "bombard",
          "period": 280,
          "warn": 145,
          "shots": 1,
          "silence": "battery",
          "until": "clear",
          "cover": {
            "x0": 3770,
            "x1": 4220,
            "z0": 282,
            "z1": 355
          },
          "destructive": true,
          "radius": 92,
          "depth": 44,
          "damage": 28
        }
      ],
      "spawns": [
        [
          {
            "x": 3640,
            "z": 430,
            "inPlace": true
          },
          {
            "x": 3750,
            "z": 485,
            "inPlace": true
          },
          {
            "x": 3870,
            "z": 395,
            "inPlace": true
          },
          {
            "x": 4050,
            "z": 465,
            "inPlace": true
          },
          {
            "x": 4220,
            "z": 410,
            "inPlace": true
          },
          {
            "x": 4330,
            "z": 485,
            "inPlace": true
          },
          {
            "x": 4120,
            "z": 350,
            "inPlace": true
          },
          {
            "x": 4420,
            "z": 410,
            "inPlace": true
          }
        ]
      ]
    },
    {
      "id": "bombardment",
      "name": "THE OLD CAUSEWAY",
      "x0": 4500,
      "x1": 6200,
      "spawn": {
        "x": 4560,
        "z": 440
      },
      "objective": "Cross the broken causeway",
      "hint": "Keep to the bridge deck. Move between volleys",
      "fightAt": 5650,
      "waves": [
        [
          "siegeguard",
          "grunt",
          "stalker"
        ]
      ],
      "props": [
        {
          "kind": "crate",
          "x": 6100,
          "z": 480,
          "drop": "health"
        },
        {
          "kind": "barrel",
          "look": "barrel-grey",
          "x": 4850,
          "z": 302,
          "drop": null
        },
        {
          "kind": "crate",
          "look": "crate-v6",
          "x": 5580,
          "z": 490,
          "drop": "mana"
        }
      ],
      "hazards": [
        {
          "type": "bombard",
          "period": 250,
          "warn": 145,
          "shots": 2,
          "silence": "battery",
          "destructive": true,
          "radius": 92,
          "depth": 44,
          "damage": 28
        },
        {
          "type": "bombard",
          "period": 250,
          "warn": 145,
          "shots": 1,
          "visualOnly": true,
          "scenery": [
            {
              "x": 5030,
              "z": 238
            },
            {
              "x": 5230,
              "z": 238
            },
            {
              "x": 5500,
              "z": 238
            }
          ],
          "destructive": true,
          "radius": 92,
          "depth": 44,
          "damage": 28
        }
      ],
      "spawns": [
        [
          {
            "x": 5740,
            "z": 390,
            "inPlace": true
          },
          {
            "x": 5870,
            "z": 470,
            "inPlace": true
          },
          {
            "x": 6010,
            "z": 350,
            "inPlace": true
          }
        ]
      ]
    },
    {
      "id": "battery",
      "name": "THE BATTERY",
      "x0": 6200,
      "x1": 7600,
      "spawn": {
        "x": 6260,
        "z": 440
      },
      "objective": "Destroy the battery and open the siege gate",
      "hint": "Bait their stones onto the engines, or smash them yourself",
      "fightAt": 6700,
      "needs": "battery",
      "spawns": [
        [
          {
            "x": 6660,
            "z": 450,
            "inPlace": true
          },
          {
            "x": 6770,
            "z": 350,
            "inPlace": true
          },
          {
            "x": 6880,
            "z": 485,
            "inPlace": true
          },
          {
            "x": 7010,
            "z": 420,
            "inPlace": true
          },
          {
            "x": 7170,
            "z": 350,
            "inPlace": true
          },
          {
            "x": 7280,
            "z": 480,
            "inPlace": true
          },
          {
            "x": 7370,
            "z": 410,
            "inPlace": true
          },
          {
            "x": 7460,
            "z": 350,
            "inPlace": true
          },
          {
            "x": 7130,
            "z": 485,
            "inPlace": true
          }
        ],
        [
          {
            "x": 6800,
            "z": 485,
            "inPlace": true
          },
          {
            "x": 7100,
            "z": 360,
            "inPlace": true
          },
          {
            "x": 7350,
            "z": 450,
            "inPlace": true
          }
        ]
      ],
      "waves": [
        [
          "siegeguard",
          "grunt",
          "siegeguard",
          "stonebreaker",
          "siegeguard",
          "stalker",
          "stonebreaker",
          "grunt",
          "siegeguard"
        ],
        [
          "stalker",
          "siegeguard",
          "stalker"
        ]
      ],
      "props": [
        {
          "kind": "catapult",
          "tag": "battery",
          "x": 6820,
          "z": 310,
          "drop": null
        },
        {
          "kind": "catapult",
          "tag": "battery",
          "x": 7060,
          "z": 420,
          "drop": "health"
        },
        {
          "kind": "catapult",
          "tag": "battery",
          "x": 7320,
          "z": 310,
          "drop": null
        },
        {
          "kind": "shackle",
          "tag": "bram",
          "x": 7190,
          "z": 300,
          "drop": null
        },
        {
          "kind": "barrel",
          "look": "keg2",
          "x": 6650,
          "z": 303,
          "drop": "mana"
        },
        {
          "kind": "crate",
          "look": "crate-long",
          "x": 7380,
          "z": 492,
          "drop": null
        },
        {
          "kind": "crate",
          "x": 6610,
          "z": 500,
          "drop": "mana"
        }
      ],
      "hazards": [
        {
          "type": "bombard",
          "period": 250,
          "warn": 145,
          "shots": 3,
          "silence": "battery",
          "destructive": true,
          "radius": 92,
          "depth": 44,
          "damage": 28
        }
      ]
    },
    {
      "id": "camp",
      "name": "THE SIEGE CAMP",
      "x0": 7600,
      "x1": 9000,
      "spawn": {
        "x": 7660,
        "z": 440
      },
      "objective": "Kill Siege Commander Orsk",
      "hint": "When the Keep fires on the camp, watch the shadows",
      "fightAt": 7980,
      "waves": [
        [
          "siegeguard",
          "stonebreaker",
          "siegeguard"
        ]
      ],
      "props": [
        {
          "kind": "barrel",
          "x": 8200,
          "z": 300,
          "drop": null
        },
        {
          "kind": "crate",
          "x": 8900,
          "z": 480,
          "drop": "health"
        },
        {
          "kind": "crate",
          "look": "crate-v5",
          "x": 7820,
          "z": 495,
          "drop": "mana"
        }
      ],
      "hazards": [
        {
          "type": "bombard",
          "when": "phase:barrage",
          "period": 250,
          "warn": 145,
          "shots": 1,
          "damage": 28,
          "destructive": true,
          "radius": 92,
          "depth": 44
        }
      ],
      "rest": {
        "x": 7680,
        "z": 320,
        "kind": "oath"
      },
      "boss": {
        "type": "berserker",
        "look": "orsk",
        "name": "Orsk - The Siege Commander",
        "health": 3,
        "damage": 1.15,
        "entrance": {
          "from": 160,
          "to": 360,
          "speed": 70,
          "stepEvery": 28,
          "awe": 30
        },
        "sentence": {
          "speaker": "ORSK",
          "crimes": [
            "You loosed your stones on miners pinned under the rock.",
            "You chained Bram to your catapults and worked him like a mule.",
            "You burned the road behind us, and your own men with it."
          ],
          "last": "The King sent me to bury you. He will send another."
        },
        "phases": [
          {
            "id": "barrage",
            "at": 0.66
          },
          {
            "id": "berserk",
            "at": 0.33,
            "rage": true,
            "damage": 1.1
          }
        ]
      },
      "spawns": [
        [
          {
            "x": 8010,
            "z": 390,
            "inPlace": true
          },
          {
            "x": 8230,
            "z": 470,
            "inPlace": true
          },
          {
            "x": 8420,
            "z": 390,
            "inPlace": true
          }
        ]
      ]
    },
    {
      "id": "pass",
      "name": "THE HIGH PASS",
      "x0": 9000,
      "x1": 9800,
      "spawn": {
        "x": 9060,
        "z": 440
      },
      "objective": "Gather the survivors and descend to the Iron Gates",
      "hint": "",
      "waves": [],
      "props": [],
      "hazards": []
    }
  ],
  "exit": {
    "x": 9600,
    "after": "gates"
  },
  "terrain": [
    {
      "kind": "block",
      "x0": 560,
      "x1": 650,
      "z0": 390,
      "z1": 470,
      "top": 35
    },
    {
      "kind": "block",
      "x0": 6320,
      "x1": 6400,
      "z0": 282,
      "z1": 520,
      "top": 35
    },
    {
      "kind": "block",
      "x0": 6400,
      "x1": 6480,
      "z0": 282,
      "z1": 520,
      "top": 70
    },
    {
      "kind": "block",
      "x0": 6480,
      "x1": 6560,
      "z0": 282,
      "z1": 520,
      "top": 105
    },
    {
      "kind": "block",
      "x0": 6560,
      "x1": 7500,
      "mat": "siegeGround",
      "z0": 282,
      "z1": 520,
      "top": 140
    },
    {
      "kind": "block",
      "x0": 7500,
      "x1": 7580,
      "z0": 282,
      "z1": 520,
      "top": 70
    },
    {
      "kind": "block",
      "x0": 7465,
      "x1": 7500,
      "z0": 282,
      "z1": 520,
      "top": 330,
      "tag": "batteryGate",
      "mat": "siegeGate"
    },
    {
      "kind": "pit",
      "x0": 5000,
      "x1": 5600,
      "z0": 282,
      "z1": 520
    },
    {
      "kind": "block",
      "x0": 4940,
      "x1": 5660,
      "z0": 350,
      "z1": 465,
      "top": 0,
      "hideArt": true,
      "tag": "causeway"
    }
  ],
  "lanterns": [
    {
      "x": 500,
      "z": 290
    },
    {
      "x": 1600,
      "z": 290
    },
    {
      "x": 2900,
      "z": 290
    },
    {
      "x": 3500,
      "z": 290
    },
    {
      "x": 4600,
      "z": 290
    },
    {
      "x": 5600,
      "z": 290
    },
    {
      "x": 7700,
      "z": 290
    },
    {
      "x": 9100,
      "z": 290
    }
  ],
  "bodies": [
    {
      "x": 1200,
      "z": 480,
      "pose": 1
    },
    {
      "x": 3300,
      "z": 490,
      "pose": 0
    },
    {
      "x": 4800,
      "z": 470,
      "pose": 2
    },
    {
      "x": 5900,
      "z": 340,
      "pose": 1
    }
  ],
  "npcs": [
    {
      "id": "nicholas",
      "name": "Nicholas",
      "art": "nicholas",
      "x": 330,
      "z": 420,
      "guide": {
        "section": "camp",
        "falls": [
          "clear:camp"
        ],
        "cry": "struck",
        "words": "lastWords"
      }
    },
    {
      "id": "wren",
      "name": "Wren",
      "x": 2450,
      "z": 310,
      "pose": "child",
      "rescue": "reach",
      "flee": null,
      "gather": {
        "x": 9300,
        "z": 330
      }
    },
    {
      "id": "shelter",
      "name": "the miners under the rock",
      "x": 3960,
      "z": 310,
      "pose": "group",
      "rescue": "defend",
      "flee": {
        "x": 3200,
        "z": 330
      },
      "gather": {
        "x": 9220,
        "z": 480
      }
    },
    {
      "id": "bram",
      "name": "Bram",
      "x": 7190,
      "z": 312,
      "pose": "chained",
      "rescue": "wreckage",
      "tag": "bram",
      "flee": {
        "x": 6300,
        "z": 480
      },
      "gather": {
        "x": 9380,
        "z": 420
      }
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
          "VEXA",
          "The Keep. Across the gorge."
        ],
        [
          "ORYN",
          "His guns cover the road."
        ],
        [
          "RURIK",
          "Take the high paths. We take the battery."
        ]
      ]
    },
    {
      "id": "guide",
      "on": "start",
      "hold": false,
      "lines": [
        [
          "NICHOLAS",
          "The prisoners are up there. I know a way in."
        ],
        [
          "RURIK",
          "Stay close."
        ]
      ]
    },
    {
      "id": "horn",
      "at": 420,
      "lines": [
        [
          "ORSK",
          "(from the battery above) The Oath Keepers. Break the road beneath them!"
        ]
      ]
    },
    {
      "id": "rocks",
      "at": 640,
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
      "id": "stair",
      "at": 1500,
      "calm": true,
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
      "id": "wren",
      "on": "rescued:wren",
      "lines": [
        [
          "WREN",
          "My goats ran when the stones came. I know the back path. Thank you!"
        ]
      ]
    },
    {
      "id": "shelterCry",
      "at": 3200,
      "lines": [
        [
          "VOICE",
          "Help! Up here, under the rock! They have us pinned!"
        ]
      ]
    },
    {
      "id": "stones",
      "at": 3320,
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
      "id": "shelter",
      "on": "rescued:shelter",
      "lines": [
        [
          "MINER",
          "We came up ahead of you and walked into their catapults. We'll hold here."
        ]
      ]
    },
    {
      "id": "hilde",
      "on": "rescued:shelter",
      "if": "saved:hilde",
      "lines": [
        [
          "HILDE",
          "You came for us again. My brother's up at the catapults. They've got him hauling stones."
        ]
      ]
    },
    {
      "id": "bridge",
      "at": 4900,
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
      "id": "battery",
      "on": "enter:battery",
      "lines": [
        [
          "ORYN",
          "Break the guns. Or let their own stones do it."
        ]
      ]
    },
    {
      "id": "silenced",
      "on": "broken:battery",
      "lines": [
        [
          "RURIK",
          "Quiet at last."
        ]
      ]
    },
    {
      "id": "bram",
      "on": "rescued:bram",
      "if": "saved:hilde",
      "lines": [
        [
          "BRAM",
          "Hilde lives? Then I'm going to find her. Go. Finish this."
        ]
      ]
    },
    {
      "id": "bramAlone",
      "on": "rescued:bram",
      "unless": "saved:hilde",
      "lines": [
        [
          "BRAM",
          "They worked me like a mule. Never again. Go on, I'll find my way down."
        ]
      ]
    },
    {
      "id": "camp",
      "at": 7700,
      "calm": true,
      "lines": [
        [
          "VEXA",
          "(from the cliff) Orsk is in the camp ahead. He burned the road behind us with his own hands."
        ]
      ]
    },
    {
      "id": "orsk",
      "on": "boss:camp",
      "lines": [
        [
          "ORSK",
          "So these are the Oath Keepers. The King sent me to bury you. I brought a mountain."
        ]
      ]
    },
    {
      "id": "barrage",
      "on": "phase:camp:barrage",
      "lines": [
        [
          "ORSK",
          "Signal the Keep! Fire on my position! Bring it all down!"
        ]
      ]
    },
    {
      "id": "struck",
      "on": "cut:nicholas",
      "lines": [
        [
          "RURIK",
          "Nicholas!",
          {
            "minFrames": 50
          }
        ]
      ]
    },
    {
      "id": "berserk",
      "on": "phase:camp:berserk",
      "lines": [
        [
          "ORSK",
          "Enough! I'll break you myself!"
        ]
      ]
    },
    {
      "id": "retreat",
      "on": "clear:camp",
      "calm": true,
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
      "id": "lastWords",
      "boxed": true,
      "on": "clear:camp",
      "calm": true,
      "hold": true,
      "lines": [
        [
          "RURIK",
          "Nicholas.",
          {
            "moment": "nicholasAttend",
            "minFrames": 55
          }
        ],
        [
          "NICHOLAS",
          "You got him?",
          {
            "moment": "nicholasReach",
            "minFrames": 55
          }
        ],
        [
          "RURIK",
          "He's dead.",
          {
            "moment": "nicholasSettle",
            "minFrames": 50
          }
        ],
        [
          "NICHOLAS",
          "Good.",
          {
            "moment": "nicholasFade",
            "minFrames": 60
          }
        ],
        [
          "VOICE",
          "",
          {
            "moment": "nicholasDies",
            "minFrames": 150,
            "autoAdvance": true
          }
        ],
        [
          "RURIK",
          "Rest, my friend.",
          {
            "minFrames": 75
          }
        ]
      ],
      "delay": 45
    },
    {
      "id": "gathered",
      "at": 9150,
      "calm": true,
      "if": "rescued:shelter",
      "lines": [
        [
          "MINER",
          "We hold the pass. Nobody comes up this road again."
        ]
      ]
    },
    {
      "id": "gates",
      "at": 9300,
      "calm": true,
      "hold": true,
      "lines": [
        [
          "VEXA",
          "Look at them. Every man on the mountain, running for the Iron Gates."
        ],
        [
          "ORYN",
          "He's pulling his army behind his walls. That isn't strength."
        ],
        [
          "RURIK",
          "It's fear. The gates, then the Keep. For Nicholas."
        ]
      ]
    }
  ],
  "cutaway": "retreat"
};
