// Options Account Editor Module
// Handles the Options List Account editor functionality
// Special thanks to sciomachist for his great work in finding out a lot off stuff in the OLA

// Import schema (will be loaded via script tag in HTML)
const optionsListAccountSchema = {
    0: { name: "Player Character Count (AI)", description: "Number of characters on account", type: "number" },
    1: { name: "Chest System (AI)", description: "Controls chest functionality and storage operations", type: "number" },
    2: { name: "UI Scaling Factor (AI)", description: "Interface scaling setting for display size", type: "number" },
    3: { name: "Quick Tap Feature Toggle (AI)", description: "Enable/disable quick tap feature (1=On)", type: "number" },
    4: { name: "Quick Tap Secondary State (AI)", description: "Secondary state tracking for quick tap", type: "number" },
    5: { name: "Skill Point Allocation Amount (AI)", description: "Cycling amount (1, 5, 10, 25, 900) for skill points", type: "number" },
    6: { name: "Enhanced Skill Allocation Mode (AI)", description: "Toggle for enhanced skill point allocation interface", type: "number" },
    7: { name: "AFK Detection/Party Counter (AI)", description: "Tracks AFK detection or party member count", type: "number" },
    8: { name: "Chat Window X Position (AI)", description: "Horizontal position of chat window", type: "number" },
    9: { name: "Chat Window Y Position (AI)", description: "Vertical position of chat window", type: "number" },
    10: { name: "Chat Window Width/Columns (AI)", description: "Controls chat window width/column count", type: "number" },
    11: { name: "Chat Window Height/Rows (AI)", description: "Controls chat window height/row count", type: "number" },
    12: { name: "Chat Window Active State", description: "Chat window visibility state (-1=Inactive, 1=Active)", type: "number" },
    13: { name: "Auto-Transfer/Banking (AI)", description: "Toggle for automated banking/transfer features", type: "number" },
    14: { name: "Achievement/Quest System (AI)", description: "Tracks completion of special achievements/trophies", type: "number" },
    15: { name: "Unclaimed W1 Colosseum Ticket Days", description: "Number of unclaimed W1 colosseum ticket days", type: "number" },
    16: { name: "Unclaimed W1 Boss Keys Days", description: "Number of unclaimed W1 boss keys days", type: "number" },
    17: { name: "Settings Toggle (AI)", description: "General settings binary toggle", type: "number" },
    18: { name: "Chest UI Management (AI)", description: "Controls chest interface style and active element", type: "number" },
    19: { name: "Task Completion Tracking (AI)", description: "Tracks completed tasks/skills string", type: "string" },
    20: { name: "Rating/Popup System (AI)", description: "Manages rating prompts display state", type: "number" },
    21: { name: "Advanced Settings Toggle (AI)", description: "Controls advanced settings menu state", type: "number" },
    22: { name: "Chat Server Message Tracking (AI)", description: "Tracks chat-related server message states", type: "number" },
    23: { name: "Forge/Inventory Auto-Move Toggle (AI)", description: "Toggle for auto-move feature in forge/inventory (0/1)", type: "number" },
    24: { name: "Player/Character Actor Type ID (AI)", description: "Player/character actor type identifier and coordinate offset constant", type: "number" },
    25: { name: "Seasonal Event Item Counter opened", description: "Tracks collected event items opened (coolers, presents, baskets)", type: "number" },
    26: { name: "Shadowban", description: "Set to 0 to remove shadowban", type: "number", warning: "Modifying this may affect your account status" },
    27: { name: "Idleon Discord Button Clicked", description: "Idleon discord button clicked (50 gems)", type: "number" },
    28: { name: "Lava's Twitch Button Clicked", description: "Lava's twitch button clicked (50 gems)", type: "number" },
    29: { name: "Daily Seasonal Event Item Counter dropped", description: "Daily Seasonal Event Item Counter dropped / Event progression counter for free spins", type: "number" },
    30: { name: "BoltCutter Quest Progress (AI)", description: "Flag for BoltCutter secret unlock on Map 9", type: "number" },
    31: { name: "Unclaimed W2 Boss Keys Days", description: "Number of unclaimed W2 boss keys days", type: "number" },
    32: { name: "Cauldron Boost Status (AI)", description: "String flags (e.g., '0000') for 4 cauldrons (1=boost active)", type: "string" },
    33: { name: "Minigames Amount", description: "Number of minigames", type: "number" },
    34: { name: "Inventory Operation Mode (AI)", description: "Current inventory interaction mode", type: "number" },
    35: { name: "Unclaimed W2 Colosseum Ticket Days", description: "Number of unclaimed W2 colosseum ticket days", type: "number" },
    36: { name: "Player Nametag Display Toggle (AI)", description: "Controls display of player nametags (0=Enabled)", type: "number" },
    37: { name: "Guild Name", description: "Your guild name", type: "string" },
    38: { name: "Guild Icon Index (AI)", description: "Index of the selected guild icon", type: "number" },
    39: { name: "Weekly Reset Counter (AI)", description: "Tracks weekly reset cycles for shops/divinity", type: "number" },
    40: { name: "Star Sign Progress (AI)", description: "Tracks progress in star sign constellation system", type: "number" },
    41: { name: "Quest38 Item Counter (AI)", description: "Counts special items related to Quest38", type: "number" },
    42: { name: "Multiplayer Account Flag (AI)", description: "Flags accounts with multiple characters", type: "number" },
    43: { name: "Asset Management System (AI)", description: "Asset loading, compression algorithm constants, and actor type identifier", type: "number" },
    44: { name: "Bundle Expiration Timer (AI)", description: "Tracks days remaining for bundle offers", type: "number" },
    45: { name: "Bundle Cooldown Timer (AI)", description: "Tracks bundle activation status and cooldown", type: "number" },
    46: { name: "Bundle Activation Flag (AI)", description: "Indicates if a bundle offer is currently active", type: "number" },
    47: { name: "Critter Spawning Counter (AI)", description: "Tracks NONdummies array for Quest69/critters", type: "number" },
    48: { name: "Account List Display Mode (AI)", description: "Controls player list display style", type: "number" },
    49: { name: "Starter Bundle Reset (AI)", description: "Tracks starter bundle reset timing", type: "number" },
    50: { name: "Master Volume Control (AI)", description: "Overall game audio volume (0-100)", type: "number" },
    51: { name: "Music Volume Control (AI)", description: "Background music volume (0-100)", type: "number" },
    52: { name: "Effects Volume Control (AI)", description: "Sound effects volume (0-100)", type: "number" },
    53: { name: "Electron App Version (AI)", description: "Tracks Desktop/Electron app version state", type: "number" },
    54: { name: "Asset Positioning System (AI)", description: "Asset loading, sprite management, and coordinate positioning", type: "number" },
    55: { name: "Accumulated Talent Skill Book Checkouts", description: "Total talent skill book checkouts", type: "number" },
    56: { name: "Unclaimed W3 Colosseum Ticket Days", description: "Number of unclaimed W3 colosseum ticket days", type: "number" },
    57: { name: "Giant Mobs Spawn Decrease Multiplier", description: "Controls giant mob spawn rate", type: "number" },
    58: { name: "Quest Categorization & Star Sign Progression", description: "Quest categorization with '^' prefix display marker + StarSignProg tracking array (index 0)", type: "number" },
    59: { name: "Graphics Vertex Buffer & Food System", description: "59th vertex buffer coordinate for rendering + quest item quantities in _ScrollCircleINFO[59] + food slot purchases (2 + GemItemsPurchased[59])", type: "number" },
    60: { name: "Item Shop Popup", description: "Item shop popup setting", type: "number" },
    61: { name: "Localized Text & World Selection", description: "Localized text storage in RANDOlist[61] + world selection system with pagination math ((worldIndex - 1) / 20)", type: "number" },
    62: { name: "Low Capacity Threshold & Hole Parser", description: "Low capacity threshold (80) + primary hole info parser + cooking/anvil/guild state management + quest tracking", type: "number" },
    63: { name: "Medium Capacity Threshold & UI Control", description: "Medium capacity threshold (160) + hole info parsing + monster scaling exponent + UI scrolling control", type: "number" },
    64: { name: "Quest Completion & Monster Scaling", description: "Quest completion flag + high capacity threshold (320) + equipment validation + monster scaling multiplier", type: "number" },
    65: { name: "Frame Rate Configuration", description: "Game frame rate configuration and actor management", type: "number" },
    66: { name: "UI Container & Spirit Reindeer Tracker", description: "UI object container + option cache system + exponential decay timing threshold + Spirit Reindeer location tracking", type: "number" },
    67: { name: "Option Cache & Spelunk Data", description: "Option tracking cache + counter with threshold checking + Spelunk data storage system", type: "number" },
    68: { name: "DO NOT TOUCH", description: "Triggers Abuse Message (different shadowban)", type: "number", warning: "DO NOT MODIFY - Will trigger shadowban" },
    69: { name: "Camera Positioning Actor (AI)", description: "Special camera and positioning actor type identifier", type: "number" },
    70: { name: "Recipe Points (AI)", description: "Recipe points tracking", type: "number" },
    71: { name: "Dungeon Credits (Blue) - Total", description: "Total number - determines rank - keep lower than 100m", type: "number", warning: "Keep lower than 100m" },
    72: { name: "Dungeon Credits (Blue) - Actual", description: "Actual amount of blue dungeon credits", type: "number" },
    73: { name: "Dungeon Credits (Pink/Flurbos)", description: "Pink dungeon credits (flurbos)", type: "number" },
    74: { name: "Arcade Balls (Normal)", description: "Normal arcade balls", type: "number" },
    75: { name: "Arcade Balls (Golden)", description: "Golden arcade balls", type: "number" },
    76: { name: "Character Code L (AI)", description: "Character encoding for keyboard input (L=76)", type: "number" },
    77: { name: "Character Code M (AI)", description: "Character encoding for keyboard input (M=77)", type: "number" },
    78: { name: "Character Code N (AI)", description: "Character encoding for keyboard input (N=78)", type: "number" },
    79: { name: "Character Code O (AI)", description: "Character encoding for keyboard input (O=79)", type: "number" },
    80: { name: "Unclaimed W3 Boss Keys Days", description: "Number of unclaimed W3 boss keys days", type: "number" },
    81: { name: "Tome/Guild State (AI)", description: "Tome UI state and Guild join functionality", type: "number" },
    82: { name: "DoOnceREAL Init (AI)", description: "System initialization flag (approx -6.3)", type: "number" },
    83: { name: "Character Code S (AI)", description: "Character encoding for keyboard input (S=83)", type: "number" },
    84: { name: "Character Code T (AI)", description: "Character encoding for keyboard input (T=84)", type: "number" },
    85: { name: "Quest/Progress Limiter (AI)", description: "Quest integration and DoOnce capping logic", type: "number" },
    86: { name: "Recipe Points", description: "Recipe points (needs confirmation)", type: "number" },
    87: { name: "Character Code W (AI)", description: "Character encoding for keyboard input (W=87)", type: "number" },
    88: { name: "W4 Arena Timer", description: "World 4 arena timer", type: "number" },
    89: { name: "Character Code Y (AI)", description: "Character encoding for keyboard input (Y=89)", type: "number" },
    90: { name: "Cooking Timer (AI)", description: "Tracks cooking activity time", type: "number" },
    91: { name: "Chip Jewel System (AI)", description: "Special item crafting/spawn system", type: "number" },
    92: { name: "4-Star Cardifiers", description: "Number of 4-star cardifiers", type: "number" },
    93: { name: "Scene Event Identifier (AI)", description: "Scene event identification and positioning coordinates", type: "number" },
    94: { name: "Gem Bundle Tracker (AI)", description: "Tracks gem bundle purchases", type: "number" },
    95: { name: "Asset Management 95 (AI)", description: "Asset management and positioning coordinate constant", type: "number" },
    96: { name: "Accumulated Dilapidated Slush Days", description: "Days of accumulated dilapidated slush", type: "number" },
    97: { name: "Character Code A/NUMPAD_1 (AI)", description: "Character encoding for keyboard and numpad input", type: "number" },
    98: { name: "Accumulated Mutated Mush Days", description: "Days of accumulated mutated mush", type: "number" },
    99: { name: "Pen-pal Minigame Counter", description: "Pen-pal minigame counter max bonus at 225", type: "number" },
    100: { name: "Pet Maintenance Counter (AI)", description: "Daily counter for pet food/maintenance", type: "number" },
    101: { name: "Killroy Crystals", description: "Killroy crystals (minus value)", type: "number" },
    102: { name: "Event Spawn Limiter (AI)", description: "Caps daily special event spawns (e.g. Twitch events)", type: "number" },
    103: { name: "Lava Guide / Tutorial Progression", description: "Tracks Lava tutorial/story stages (-2 to 7)", type: "number" },
    104: { name: "Tutorial UI Toggle (AI)", description: "Controls tutorial UI visibility (LavaTutStuff)", type: "number" },
    105: { name: "Killroy Skulls", description: "Killroy skulls currency", type: "number" },
    106: { name: "Killroy Upgrade - Timer", description: "Killroy timer upgrade level", type: "number" },
    107: { name: "Killroy Upgrade - Talent Drops", description: "Killroy talent drops upgrade level", type: "number" },
    108: { name: "Killroy Upgrade - Bonus Skulls", description: "Killroy bonus skulls upgrade (do not set if not unlocked)", type: "number", warning: "Do not set if you haven't unlocked this upgrade yet" },
    109: { name: "Killroy Upgrade - Respawn", description: "Killroy respawn upgrade (do not set if not unlocked)", type: "number", warning: "Do not set if you haven't unlocked this upgrade yet" },
    110: { name: "Killroy Upgrade - 5th", description: "Killroy 5th upgrade (do not set if not unlocked)", type: "number", warning: "Do not set if you haven't unlocked this upgrade yet" },
    111: { name: "Killroy Upgrade - 6th", description: "Killroy 6th upgrade (do not set if not unlocked)", type: "number", warning: "Do not set if you haven't unlocked this upgrade yet" },
    112: { name: "Killroy Runs Total", description: "Total number of finished Killroy runs", type: "number" },
    113: { name: "Killroy Wake Status", description: "Set to 0 to wake up Killroy", type: "number" },
    114: { name: "Talent Point System (AI)", description: "Tracks/cycles talent point rewards", type: "number" },
    115: { name: "Killroy Airhorn Reset", description: "Set to 0 to make airhorn reset available", type: "number" },
    116: { name: "Vertex Buffer Index (AI)", description: "Vertex buffer index and map identifier in rendering system", type: "number" },
    117: { name: "Boss Kill Achievement (AI)", description: "Tracks major boss kills, unlocks breeding/classes", type: "number" },
    118: { name: "Town Popup for Gemshop", description: "Controls town popup for gemshop", type: "number" },
    // 118: { name: "Limited Shop Manager (AI)", description: "Syncs limited-time shop offerings with server", type: "number" },
    119: { name: "Story Quest Completion (AI)", description: "Tracks major story quests and world access", type: "number" },
    120: { name: "Idle Skilling Code Tracker (AI)", description: "Tracks sequential code input for rewards", type: "number" },
    121: { name: "Next Idleskilling Codes Days", description: "Days left for next idleskilling codes", type: "number" },
    122: { name: "UI Inventory Management (AI)", description: "UI inventory slot configurations and player preferences", type: "number" },
    123: { name: "Draconic Cauldrons", description: "Number of draconic cauldrons for liquid cauldrons in alchemy", type: "number" },
    124: { name: "Sailing Time Tracker (AI)", description: "Tracks sailing activity time for display", type: "number" },
    125: { name: "3D Printer Days for Multi", description: "3D printer days for multi artifact", type: "number" },
    126: { name: "Gallery State Machine", description: "4-mode gallery system state: 1=trophy, 2=trophy info, 3=nametag, 4=nametag info with toggle mechanisms", type: "number" },
    127: { name: "Status Effect Timers & Graphics Data", description: "Status effect countdown timers using Math.round(c.asNumber(_GenINFO[127]) + -1) + 3D vertex buffer graphics data", type: "number" },
    128: { name: "UTF-8 Encoding & Graphics Constants", description: "UTF-8 encoding threshold + 128x128 graphics dimensions + power-of-2 values for graphics efficiency + mode flags", type: "number" },
    129: { name: "Gem Economy & Chest Spawn System", description: "Gem shop purchase tracking → chest spawn mechanics using Math.ceil(GemItemsPurchased[129] / 3.5) with 120ms timer delay", type: "number" },
    130: { name: "Skill Tree Tutorial Gate (AI)", description: "Flag for tutorial completion/skill tree unlock", type: "number" },
    131: { name: "Silver Pen Tracker (AI)", description: "Tracks accumulated silver pens from bonuses", type: "number" },
    132: { name: "Atom Collider Interface (AI)", description: "Visual state control for Atom Collider UI", type: "number" },
    133: { name: "Atom Threshold Multiplier (AI)", description: "Cycles threshold difficulty (0-3)", type: "number" },
    134: { name: "Hydrogen Bonus Stamp Days", description: "Days of accumulated hydrogen bonus for stamp", type: "number" },
    135: { name: "Current Daily Boron Clicks Left", description: "Current daily boron clicks left", type: "number" },
    // 135: { name: "Bubble Particles (AI)", description: "Consumable for Atom Collider bubble upgrades", type: "number" },
    136: { name: "UI Component Lava Message", description: "Lava message", type: "number" },
    137: { name: "Progression State Flag (AI)", description: "Controls tutorial/dungeon access state", type: "number" },
    138: { name: "Divine Knight Orb Kill Count", description: "Divine knight orb kill count (Divine Orb skill)", type: "number" },
    139: { name: "Siege Breaker Flag Kill Count", description: "Siege breaker flag kill count (Pirate Flag skill)", type: "number" },
    140: { name: "Keybind: Move Up/W (AI)", description: "Keycode for upward movement", type: "number" },
    141: { name: "Keybind: Move Down/S (AI)", description: "Keycode for downward movement", type: "number" },
    142: { name: "Keybind: Move Left/A (AI)", description: "Keycode for left movement", type: "number" },
    143: { name: "Keybind: Move Right/D (AI)", description: "Keycode for right movement", type: "number" },
    144: { name: "Keybind: Action/E (AI)", description: "Keycode for action/interact", type: "number" },
    145: { name: "Keybind: Special/R (AI)", description: "Keycode for special action", type: "number" },
    146: { name: "Keybind Display: Up/W (AI)", description: "Display string for Up key", type: "string" },
    147: { name: "Keybind Display: Down/S (AI)", description: "Display string for Down key", type: "string" },
    148: { name: "Keybind Display: Left/A (AI)", description: "Display string for Left key", type: "string" },
    149: { name: "Keybind Display: Right/D (AI)", description: "Display string for Right key", type: "string" },
    150: { name: "Keybind Display: Action/E (AI)", description: "Display string for Action key", type: "string" },
    151: { name: "Keybind Display: Special/R (AI)", description: "Display string for Special key", type: "string" },
    152: { name: "Mage Kill Count", description: "Mage kill count (Wormhole skill)", type: "number" },
    153: { name: "Language Selection (AI)", description: "Selected language index (1-7)", type: "number" },
    154: { name: "95% Stamp Cost Reduction", description: "95% stamp cost reduction amount", type: "number" },
    155: { name: "Card Level Override (AI)", description: "Comma-separated Card IDs forced to level 6", type: "string" },
    156: { name: "5-Star Cardifiers", description: "Number of 5-star cardifiers", type: "number" },
    157: { name: "Player Auto-Move (AI)", description: "Toggle for player auto-movement (1=On)", type: "number" },
    158: { name: "Void Man Portals Cleared", description: "Void man portals cleared highscore (for talent calculations)", type: "number" },
    159: { name: "Sailing/Gem Init Flag (AI)", description: "One-time initialization flag (Set to 1)", type: "number" },
    160: { name: "Uncollected Garbage (Ground)", description: "Uncollected garbage on the ground", type: "number" },
    161: { name: "Garbage Currency", description: "Garbage currency in Fishing Islands", type: "number" },
    162: { name: "Bottles Currency", description: "Bottles currency in Fishing Islands", type: "number" },
    163: { name: "Garbage Island - % Garbage", description: "Garbage Island upgrade (+% Garbage)", type: "number" },
    164: { name: "Garbage Island - % Bottles", description: "Garbage Island upgrade (+% Bottles)", type: "number" },
    165: { name: "Emporium Bonus Bribe (AI)", description: "Controls premium bribe features for fishing islands", type: "number" },
    166: { name: "Rando Island - % Loot", description: "Rando Island upgrade (+% Loot - all random events)", type: "number" },
    167: { name: "Rando Island - Double Boss", description: "Rando Island upgrade (+% for Double Boss)", type: "number" },
    168: { name: "Graphics Rendering Index (AI)", description: "Graphics rendering pipeline, vertex buffer operations and font rendering", type: "number" },
    169: { name: "Unlocked Islands", description: "Unlocked islands (all islands: 'abcde_')", type: "string", hint: "Format: 'abcde_' for all islands" },
    170: { name: "Uncollected Bottles (Docks)", description: "Uncollected bottles in the docks", type: "number" },
    171: { name: "Temp Bottle Collection (AI)", description: "Temporary bottle counter with scaling logic", type: "number" },
    172: { name: "Shimmer Island Dummy DPS", description: "Shimmer Island dummy DPS", type: "number" },
    173: { name: "Shimmers Currency", description: "Shimmers currency in Fishing Islands", type: "number" },
    174: { name: "Shimmer Island - Base STR", description: "Shimmer Island upgrade (+ Base STR)", type: "number" },
    175: { name: "Shimmer Island - Base AGI", description: "Shimmer Island upgrade (+ Base AGI)", type: "number" },
    176: { name: "Shimmer Island - Base WIS", description: "Shimmer Island upgrade (+ Base WIS)", type: "number" },
    177: { name: "Shimmer Island - Base LUK", description: "Shimmer Island upgrade (+ Base LUK)", type: "number" },
    178: { name: "Shimmer Island - % Total Damage", description: "Shimmer Island upgrade (+% Total Damage)", type: "number" },
    179: { name: "Shimmer Island - % Class EXP", description: "Shimmer Island upgrade (+% Class EXP)", type: "number" },
    180: { name: "Shimmer Island - % Skill Eff", description: "Shimmer Island upgrade (+% Skill Eff)", type: "number" },
    181: { name: "Shimmer Island Trial Damage", description: "Shimmer Island trial damage", type: "number" },
    182: { name: "Shimmer Trial Flag (AI)", description: "Binary flag (0/1) for trial completion", type: "number" },
    183: { name: "Weekly DPS Challenge (AI)", description: "Selector (0-21) for weekly DPS challenge", type: "number" },
    184: { name: "Fractal Isle AFK Time", description: "Fractal isle AFK time", type: "number" },
    185: { name: "WeeklyBoss Player Turn (AI)", description: "Tracks which player's turn it is in WeeklyBoss", type: "number" },
    186: { name: "W2 Town Boss Damage", description: "Damage done to W2 town boss", type: "number" },
    187: { name: "W2 Town Boss Status", description: "W2 town boss status (5=dead, 0-4=alive)", type: "number" },
    188: { name: "Trophy Currency", description: "Trophy currency for W2 town boss", type: "number" },
    189: { name: "Max W2 Town Weekly Boss Skulls", description: "Max W2 town weekly boss skulls reached (up to 5)", type: "number" },
    190: { name: "W2 Town Boss Attempt Reset", description: "Set to 0 to make reset available", type: "number" },
    191: { name: "WeeklyBoss Timer (AI)", description: "Weekly timer tracking for boss rotation", type: "number" },
    192: { name: "Amount of Gold Nuggets dug since last max in Gaming", description: "Amount of Gold Nugget dug since last max in Gaming", type: "number" },
    193: { name: "Game Progression Array (AI)", description: "Game progression array for kill tracking and advancement", type: "number" },
    194: { name: "Kill Advance Condition (AI)", description: "Condition for advancing after kills", type: "number" },
    195: { name: "Gem Drop Counter Limit (AI)", description: "Maximum limit for gem drop counters", type: "number" },
    196: { name: "UI Control & Portal Positioning (AI)", description: "UI control foundation + wisdom calculations + portal positioning + game progression tracking with graphics integration", type: "number" },
    197: { name: "Tome UI & Wisdom Card Management (AI)", description: "Tome UI control + hole wisdom card management + dual interface system with N[127] coordination", type: "number" },
    198: { name: "Most Money held in Storage (Tome)", description: "Money tracking + tome inventory + companions system + card management with vertex buffer operations", type: "number" },
    199: { name: "Jackpots Counter in Arcade (Tome)", description: "Tracks the number of jackpots collected in Arcade", type: "number" },
    200: { name: "Highest Drop rarity Multi (Tome)", description: "Tracks the highest drop rarity multiplier", type: "number" },
    201: { name: "Best Spiketrap Surprise round (Tome)", description: "Tracks rounds in spike game logic", type: "number" },
    202: { name: "Crystal Spawn Tracking (Tome)", description: "Average kills for a Crystal Spawn", type: "number" },
    203: { name: "Most DMG Dealt to Gravestone in a Weekly Battle (Tome)", description: "Most DMG Dealt to Gravestone in a Weekly Battle", type: "number" },
    204: { name: "Killroy Kills - Melee (Tome)", description: "Killroy kills for melee classes", type: "number" },
    205: { name: "Killroy Kills - Ranged (Tome)", description: "Killroy kills for ranged classes", type: "number" },
    206: { name: "Killroy Kills - Magic (Tome)", description: "Killroy kills for magic classes", type: "number" },
    207: { name: "Boss Kill Timer Chaotic Efaunt (Tome)", description: "Fastest Time to kill Chaotic Efaunt (in Seconds)", type: "number" },
    208: { name: "Most Spore Caps held in Inventory at once (Tome)", description: "Tracks the most spore caps held in inventory at once", type: "number" },
    209: { name: "Best Non Duplicate Goblin Gorefest Wave (Tome)", description: "Tracks the best non-duplicate goblin gorefest wave", type: "number" },
    210: { name: "Highest Immortal Snail LV (Tome)", description: "Tracks the highest level of an immortal snail in Gaming", type: "number" },
    211: { name: "OakTree 3D Sampling Data (Tome)", description: "Sampling data for OakTree", type: "number" },
    212: { name: "Copper 3D Sampling Data (Tome)", description: "Sampling data for Copper", type: "number" },
    213: { name: "Spore 3D Sampling Data (Tome)", description: "Sampling data for Grasslands1", type: "number" },
    214: { name: "Goldfish 3D Sampling Data (Tome)", description: "Sampling data for Fish1", type: "number" },
    215: { name: "Fly 3D Sampling Data (Tome)", description: "Sampling data for Bug1", type: "number" },
    216: { name: "Nametags Found (Tome) (Unsure)", description: "Tracks the number of nametags found", type: "number" },
    217: { name: "Most Giants Killed in a Single Week (Tome)", description: "Tracks the most giants killed in a single week", type: "number" },
    218: { name: "Fastest Time to Kill 200 Tremor Wurms (Tome)", description: "Tracks the fastest time to kill 200 Tremor Wurms", warning: "The Tome system uses 1000 - this value", type: "number" },
    219: { name: "Highest Crop OG (Tome)", description: "Highest crop OG level achieved", warning: "The Tome system uses 2^this value as the actual value", type: "number" },
    220: { name: "Fastest Time reaching Round 100 Arena (Tome)", description: "Tracks the fastest time to reach round 100 in Arena", warning: "The Tome system uses 1000 - this value", type: "number" },
    221: { name: "Largest Magic Bean Trade (Tome)", description: "Maximum beans obtained in single trade", type: "number" },
    222: { name: "Most Balls earned from LBoFaF (Tome)", description: "Tracks the most balls earned from LBoFaF", type: "number" },
    223: { name: "Tome State Flag (AI)", description: "State/quality level of Tome system", type: "number" },
    224: { name: "Most Greenstacks in Storage (Tome)", description: "Tracks the most greenstacks in storage", type: "number" },
    225: { name: "Accumulated W5 Miniboss Days", description: "Tracks the accumulated w5 miniboss days", type: "number" },
    226: { name: "Accumulated W6 Miniboss Days", description: "Tracks the accumulated w6 miniboss days", type: "number" },
    227: { name: "Skull Shop Event Flag (AI)", description: "Single-use event trigger for skull shop", type: "number" },
    228: { name: "Skull Shop Counter 1 (AI)", description: "Progressive counter for skull shop reward tier 1", type: "number" },
    229: { name: "Skull Shop Counter 2 (AI)", description: "Progressive counter for skull shop reward tier 2", type: "number" },
    230: { name: "Skull Shop Counter 3 (AI)", description: "Progressive counter for skull shop reward tier 3", type: "number" },
    231: { name: "Ninja Floors System (AI)", description: "Tracks current floor progression in ninja system", type: "number" },
    232: { name: "Multi-System Bonus Calc (AI)", description: "Master bonus multiplier for talents/damage/drops", type: "number" },
    233: { name: "Sneaking Gems 1 counter", description: "Sneaking Gems counter", type: "number" },
    234: { name: "Sneaking Gems 2 counter", description: "Sneaking Gems counter", type: "number" },
    235: { name: "Sneaking Gems 3 counter", description: "Sneaking Gems counter", type: "number" },
    236: { name: "Sneaking Gems 4 counter", description: "Sneaking Gems counter", type: "number" },
    237: { name: "Sneaking Gems 5 counter", description: "Sneaking Gems counter", type: "number" },
    238: { name: "Sneaking Gems 6 counter", description: "Sneaking Gems counter", type: "number" },
    239: { name: "Sneaking Gems 7 counter", description: "Sneaking Gems counter", type: "number" },
    240: { name: "Sneaking Gems 8 counter", description: "Sneaking Gems counter", type: "number" },
    241: { name: "Time Tracking System (AI)", description: "Time-based achievement progress tracking", type: "number" },
    242: { name: "Hoops High Score", description: "Tracks best score in hoops game", type: "number" },
    243: { name: "Hoops State Manager (AI)", description: "Manages hoops game availability/cooldown", type: "number" },
    244: { name: "Basketball Achievement (AI)", description: "Unlocks basketball activity after level 20", type: "number" },
    245: { name: "Hoops Party Unlock (AI)", description: "Tracks party-based hoops game unlock", type: "number" },
    246: { name: "Tutorial Progress (AI)", description: "Tracks tutorial completion and milestones", type: "number" },
    247: { name: "NPC Interaction Visible (AI)", description: "Controls NPC interaction visibility", type: "number" },
    248: { name: "Mr. Pigibank Visible (AI)", description: "Controls Mr. Pigibank NPC appearance", type: "number" },
    249: { name: "UI Interaction Visible (AI)", description: "Controls UI element visibility states", type: "number" },
    250: { name: "Town_Marble Tracking (AI)", description: "Controls Town_Marble NPC and kill tracking", type: "number" },
    251: { name: "Grasslands_Gary Visible (AI)", description: "Controls Grasslands_Gary NPC appearance", type: "number" },
    252: { name: "Toggle for steam midweek madness gift bundle", description: "Toggle for steam midweek madness gift bundle", type: "number" },
    // 252: { name: "Special Achievement (AI)", description: "Tracks special achievement (pet-related)", type: "number" },
    253: { name: "Orion - Feathers", description: "Orion the Great Horned Owl feathers", type: "number" },
    254: { name: "Orion - Feather Generation", description: "Orion upgrade (Feather Generation)", type: "number" },
    255: { name: "Orion - Bonuses", description: "Orion upgrade (Bonuses of Orion) - permanent bonus value", type: "number", warning: "Keep reasonable like 70-90" },
    256: { name: "Orion - Feather Multiplier", description: "Orion upgrade (Feather Multiplier)", type: "number" },
    257: { name: "Orion - Feather Cheapener", description: "Orion upgrade (Feather Cheapener)", type: "number" },
    258: { name: "Orion - Feather Restart", description: "Orion upgrade (Feather Restart)", type: "number", warning: "Keep reasonable like 30-40" },
    259: { name: "Orion - Super Feather Production", description: "Orion upgrade (Super Feather Production)", type: "number" },
    260: { name: "Orion - Shiny Feathers", description: "Orion upgrade (Shiny Feathers)", type: "number" },
    261: { name: "Orion - Super Feather Cheapener", description: "Orion upgrade (Super Feather Cheapener)", type: "number" },
    262: { name: "Orion - Great Mega Reset", description: "Orion upgrade (The Great Mega Reset) - permanent bonus value", type: "number", warning: "Keep reasonable like 70-90" },
    263: { name: "Orion - Unknown Feathers", description: "Related to feathers (probably bar fill)", type: "number" },
    264: { name: "Orion - Shiny Feathers Amount", description: "Orion shiny feathers amount", type: "number" },
    265: { name: "Orion Complete Flag (AI)", description: "Orion system completion flag/Map 42 unlock", type: "number" },
    266: { name: "Poppy Complete Flag (AI)", description: "Poppy system completion flag/Map 73 unlock", type: "number" },
    267: { name: "Poppy - Fish Amount", description: "Poppy the Kangaroo fish amount (can use exponent like '5e+50')", type: "string", hint: "Can use scientific notation like '5e+50'" },
    268: { name: "Poppy - Tasty Fishbait", description: "Poppy upgrade (Tasty Fishbait)", type: "number" },
    269: { name: "Poppy - Quick Reeling", description: "Poppy upgrade (Quick Reeling)", type: "number" },
    270: { name: "Poppy - Shiny Lure", description: "Poppy upgrade (Shiny Lure)", type: "number" },
    271: { name: "Poppy - Bonuses", description: "Poppy upgrade (Bonuses from Poppy) - permanent bonus value", type: "number", warning: "Keep reasonable like 70-90" },
    272: { name: "Poppy - Fishy Discount", description: "Poppy upgrade (Fishy Discount)", type: "number" },
    273: { name: "Poppy - Juicy Worm", description: "Poppy upgrade (Juicy Worm)", type: "number" },
    274: { name: "Poppy - Fishero Reset", description: "Poppy upgrade (Fishero Reset)", type: "number", warning: "Keep reasonable like 30-40" },
    275: { name: "Poppy - Fishing Buddy", description: "Poppy upgrade (Fishing Buddy)", type: "number" },
    276: { name: "Poppy - Lightning Quickness", description: "Poppy upgrade (Lightning Quickness)", type: "number" },
    277: { name: "Poppy - Fisheroo Investing", description: "Poppy upgrade (Fisheroo Investing)", type: "number" },
    278: { name: "Poppy - Multihook Fishing", description: "Poppy upgrade (Multihook Fishing)", type: "number" },
    279: { name: "Poppy - Greatest Catch", description: "Poppy upgrade (Greatest Catch) - needs to be +12", type: "number", hint: "Counts all other 11 fishes in this value" },
    280: { name: "Roo Progress Tracker (AI)", description: "Tracks Roo system upgrade progress", type: "number" },
    281: { name: "Poppy - Fish (Yellow)", description: "Poppy yellow fish amount", type: "number" },
    282: { name: "Poppy - Fish (Red)", description: "Poppy red fish amount", type: "number" },
    283: { name: "Poppy - Fish (Green)", description: "Poppy green fish amount", type: "number" },
    284: { name: "Poppy - Fish (Purple)", description: "Poppy purple fish amount", type: "number" },
    285: { name: "Poppy - Fish (Silver)", description: "Poppy silver fish amount", type: "number" },
    286: { name: "Poppy - Fish (Blue)", description: "Poppy blue fish amount", type: "number" },
    287: { name: "Roo Mode Flag (AI)", description: "Toggles normal vs Megafish mode", type: "number" },
    288: { name: "Roo Catch Progress (AI)", description: "Tracks progress toward next Roo catch", type: "number" },
    289: { name: "Roo Silver Catch Progress (AI)", description: "Tracks silver tier Roo catch progress", type: "number" },
    290: { name: "Poppy - Reset Points", description: "Poppy reset points amount", type: "number" },
    291: { name: "Poppy - Reset Points (Blue)", description: "Poppy reset points upgrades (blue)", type: "number" },
    292: { name: "Poppy - Reset Points (Yellow)", description: "Poppy reset points upgrades (yellow)", type: "number" },
    293: { name: "Poppy - Reset Points (Green)", description: "Poppy reset points upgrades (green)", type: "number" },
    294: { name: "Poppy - Reset Points (Red)", description: "Poppy reset points upgrades (red)", type: "number" },
    295: { name: "Poppy - Reset Points (Silver)", description: "Poppy reset points upgrades (silver)", type: "number" },
    296: { name: "Poppy - Tartar Amount", description: "Poppy Tar pit tartar amount", type: "number" },
    297: { name: "Poppy - Super Yummy Bait", description: "Poppy Tar pit upgrade (Super Yummy Bait)", type: "number" },
    298: { name: "Poppy - Bonus Catching", description: "Poppy Tar pit upgrade (Bonus Catching)", type: "number" },
    299: { name: "Poppy - Bluefin Frenzy", description: "Poppy Tar pit upgrade (Bluefin Frenzy)", type: "number" },
    300: { name: "Poppy - Fishy Reductions", description: "Poppy Tar pit upgrade (Fishy Reductions)", type: "number" },
    301: { name: "Poppy - Super Tarbait", description: "Poppy Tar pit upgrade (Super Tarbait)", type: "number" },
    302: { name: "Poppy - Tarrific Resets", description: "Poppy Tar pit upgrade (Tarrific Resets)", type: "number" },
    303: { name: "Poppy - Mongo Multipliers", description: "Poppy Tar pit upgrade (Mongo Multipliers)", type: "number" },
    304: { name: "Poppy - King Worm", description: "Poppy Tar pit upgrade (King Worm)", type: "number" },
    305: { name: "Poppy - Tartar Progress", description: "Poppy Tar pit tartar fishing progress bar (0-100)", type: "number", hint: "Set between 0-100" },
    306: { name: "Farming Autofeeder (AI)", description: "Toggle for automated resource feeding", type: "number" },
    307: { name: "Farming Reset Flag (AI)", description: "Tracks reset state for farming upgrades", type: "number" },
    308: { name: "Voting Selection (AI)", description: "Tracks weekly community voting choice", type: "number" },
    309: { name: "Voting Week Tracker (AI)", description: "Tracks current voting week cycle", type: "number" },
    310: { name: "Event Points", description: "Event points (as displayed in account info)", type: "number" },
    311: { name: "Event Bonuses", description: "Tracks event bonuses", type: "string", hint: "Set to '0abc_defghijkmlopn' to apply all (up to 4th Anniversary)" },
    312: { name: "Villager Selection Tracking (AI)", description: "Part of Villager management system, tracks selected villager and increments selection count.", type: "number" },
    313: { name: "Villager Action Flag (AI)", description: "Set to 1 when villager actions are available; controls UI display conditions for villager interactions.", type: "number" },
    314: { name: "Coordinate/Length Value (AI)", description: "Used as X/Y coordinate for portal positioning and in monster/scene element placement calculations.", type: "number" },
    315: { name: "Daily Reset Trigger (AI)", description: "Manages time-based daily reset logic", type: "number" },
    316: { name: "Combat System Flag (AI)", description: "Generic combat state flag", type: "number" },
    317: { name: "Daily Event Counter (AI)", description: "Monitors daily event participation", type: "number" },
    318: { name: "Daily Hole Resources Destroyed", description: "Daily number of resource nodes in the Hole destroyed (max 5)", type: "number" },
    319: { name: "Endless Summoning Level", description: "Current endless summoning level", type: "number", warning: "Does not provide associated win rewards" },
    320: { name: "Equinox Pengy Count", description: "Number of equinox pengy (can be increased above 5)", type: "number" },
    321: { name: "Endless Summoning High Performance", description: "Endless summoning high performance toggle", type: "number" },
    322: { name: "Popup Cooldown Timer (AI)", description: "Controls gem/bundle popup display intervals", type: "number" },
    323: { name: "Supreme Wiring Bonus Days", description: "Accumulated days of Supreme Wiring Bonus (safe to max at 50)", type: "number", hint: "Safe to max at 50" },
    324: { name: "Cosmic Balls", description: "Number of Cosmic Balls", type: "number" },
    325: { name: "Event Tries Left", description: "Event (Valentines, Anniversaries...) tries left", type: "number" },
    326: { name: "Daily Event Tries Gem Purchases", description: "Cap of daily Event tries gem purchases (set to 0 to purchase again)", type: "number" },
    327: { name: "Quest93 Drop Prevention (AI)", description: "Flag for Quest93 drop prevention", type: "number" },
    328: { name: "Worship Totem Calculation Factor (AI)", description: "Used as a key ('_Plunderous_Kills') in the achievement system and as a division factor in worship/trial calculations (stores Meal Bonus).", type: "number" },
    329: { name: "Grimoire - total bones collected", description: "Accumulated total bones from Grimoire Wraith", type: "number" },
    330: { name: "Grimoire - current bone1 (femur)", description: "Current bone1 (femur) from Grimoire Wraith", type: "number" },
    331: { name: "Grimoire - current bone2 (ribcage)", description: "Current bone2 (ribcage) from Grimoire Wraith", type: "number" },
    332: { name: "Grimoire - current bone3 (cranium)", description: "Current bone3 (cranium) from Grimoire Wraith", type: "number" },
    333: { name: "Grimoire - current bone4 (bovinae)", description: "Current bone4 (bovinae) from Grimoire Wraith", type: "number" },
    334: { name: "Grimoire - knockout! level", description: "", type: "number" },
    335: { name: "Grimoire - elimination! level", description: "", type: "number" },
    336: { name: "Grimoire - annihilation! level", description: "", type: "number" },
    337: { name: "Ribbon Shelf/Event Activation Flag (AI)", description: "Tracks Ribbon Shelf unlock status and is set to 1 when a specific server event (e.g., 'ValOn') is active.", type: "number" },
    338: { name: "Vault Knockout Progress (AI)", description: "Tracks knockout achievements for Vault upgrades", type: "number" },
    339: { name: "Tutorial Hint Dismissal Flag (AI)", description: "Tracks tutorial hints/prompts; set to 1 upon interaction to dismiss the hint UI.", type: "number" },
    340: { name: "Total Ores Mined (AI)", description: "Accumulated total ores for bonuses", type: "number" },
    341: { name: "New Character Tutorial Flag (AI)", description: "Flag for new character tutorial display", type: "number" },
    342: { name: "Gaming Mutation Mechanics (AI)", description: "Gaming mutation mechanics and probability calculations", type: "number" },
    343: { name: "Chest View Mode (AI)", description: "Toggle for chest view display mode", type: "number" },
    344: { name: "Event Wheel Counter spins until event pity", description: "Remaining spins until event pity", type: "number" },
    345: { name: "Fish Caught Counter upgrade vault - schoolin the fish", description: "Cumulative fish caught for bonuses", type: "number" },
    346: { name: "Bugs Caught Counter upgrade vault - bug power en masse", description: "Cumulative bugs caught for bonuses", type: "number" },
    347: { name: "Delivery System Bonus (AI)", description: "Delivery box system tracking and bonus", type: "number" },
    348: { name: "Talent Reset Counter (AI)", description: "Tracks daily talent point resets", type: "number" },
    349: { name: "Menu Navigation State (AI)", description: "Manages multi-state menu navigation", type: "number" },
    350: { name: "Companion System Toggle (AI)", description: "Toggles companion system UI modes", type: "number" },
    351: { name: "Companion Selection Mode (AI)", description: "Controls companion selection interface", type: "number" },
    352: { name: "Quest Completion Flag (AI)", description: "One-time quest completion tracking", type: "number" },
    353: { name: "Hidden Wisdom Minigame High Score", description: "Hidden wisdom minigame high score", type: "number" },
    354: { name: "Companion Bonus Multi (AI)", description: "Companion system bonus tracker (Cap 100)", type: "number" },
    355: { name: "Rupie Slugs Purchased", description: "Number of rupie slugs purchased", type: "number" },
    356: { name: "Grimoire DMG Tracker (AI)", description: "Tracks peak Grimoire damage achieved", type: "number" },
    357: { name: "Compass - Dust Type 0 (stardust) Counter", description: "Accumulated Dust Type 0 drops", type: "number" },
    358: { name: "Compass - Dust Type 1 (moondust) Counter", description: "Accumulated Dust Type 1 drops", type: "number" },
    359: { name: "Compass - Dust Type 2 (solardust) Counter", description: "Accumulated Dust Type 2 drops", type: "number" },
    360: { name: "Compass - Dust Type 3 (cooldust) Counter", description: "Accumulated Dust Type 3 drops", type: "number" },
    361: { name: "Compass - Dust Type 4 (novadust) Counter", description: "Accumulated Dust Type 4 drops", type: "number" },
    362: { name: "Compass - Total Dust Accumulator", description: "Aggregates all dust types for global calcs", type: "number" },
    363: { name: "Magnesium, days stacked for critter bonus", description: "Trapping upgrade/bonus tracker (Cap 60)", type: "number" },
    364: { name: "Moon of Print, days stacked for printer bonus", description: "Windwalker Compass ultimate bonus (Cap 100)", type: "number" },
    365: { name: "Top of Morning count - daily kill count on windwalker for TOTM", description: "Counter for Windwalker/Compass Tempest system", type: "number" },
    366: { name: "Gem shop exalt stamps purchased", description: "Base/purchased count of Stamp Doublers (7 max as of 21.11.2025)", type: "number" },
    367: { name: "Charred Bones enabled (AFK deathbringer)", description: "Charred Bones enabled (AFK deathbringer)", type: "number" },
    368: { name: "Emperor Interface State (AI)", description: "Boolean flag for emperor interface visibility", type: "number" },
    369: { name: "Emperor Showdown Level", description: "Emperor Showdown Level (value+1 is current showdown)", type: "number" },
    370: { name: "Emperor Entries Left", description: "Entries left for Emperor (negative number, goes up to 0)", type: "number" },
    371: { name: "UI Inventory Expansion", description: "Stores reference to inventory expansion UI image, dynamically calculated based on owned inventory slots", type: "number" },
    372: { name: "Achievement Progress Tracker (AI)", description: "Achievement system tracking for progression monitoring", type: "number" },
    373: { name: "Game State Achievement Flag (AI)", description: "Game state flag for achievement system", type: "number" },
    374: { name: "Achievement Unlock Condition (AI)", description: "Achievement unlock condition tracking", type: "number" },
    375: { name: "Achievement Completion State (AI)", description: "Achievement completion state monitoring", type: "number" },
    376: { name: "Achievement System Variable (AI)", description: "General achievement system variable for tracking", type: "number" },
    377: { name: "Achievement Calculation Parameter (AI)", description: "Calculation parameter used in achievement processing", type: "number" },
    378: { name: "Actor Y-Coordinate System (AI)", description: "Y-coordinate parameter in actor creation system (used in createRecycledActor)", type: "number" },
    379: { name: "Armor Set Smithy Sets Unlocked", description: "Armor Set Smithy sets unlocked", type: "string" },
    380: { name: "Armor Set Smithy Unlocked", description: "Armor Set Smithy unlocked (set to 1)", type: "number" },
    381: { name: "Smithy 30-Day Counter (AI)", description: "Day counter for smithy time-gating", type: "number" },
    382: { name: "Lifetime FOMO Tickets", description: "Lifetime tickets bought from FOMO shop", type: "number" },
    383: { name: "Prisma Bubbles", description: "Prisma bubbles amount", type: "number" },
    384: { name: "Selected Prisma Bubbles Index", description: "Index of selected prisma bubbles", type: "number" },
    385: { name: "Treasure Hunt Event ID (AI)", description: "Tracks current treasure hunt event ID", type: "number" },
    386: { name: "Treasure Hunt Count (AI)", description: "Tracks found treasures (limit 25)", type: "number" },
    387: { name: "Windwalker Restriction (AI)", description: "Restriction flag for Windwalker class", type: "number" },
    388: { name: "Tachyon 1", description: "Tachyon 1 amount", type: "number" },
    389: { name: "Tachyon 2", description: "Tachyon 2 amount", type: "number" },
    390: { name: "Tachyon 3", description: "Tachyon 3 amount", type: "number" },
    391: { name: "Tachyon 4", description: "Tachyon 4 amount", type: "number" },
    392: { name: "Tachyon 5", description: "Tachyon 5 amount", type: "number" },
    393: { name: "Tachyon 6", description: "Tachyon 6 amount", type: "number" },
    394: { name: "Total Tachyon Collected", description: "Total Tachyon ever collected", type: "number" },
    396: { name: "Arcane Weapon Drops (AI)", description: "Tracks Arcane weapon drop progress", type: "number" },
    395: { name: "Prisma drop from active AC", description: "Prisma drop from active AC", type: "number" },
    396: { name: "Daily Arcane Weapon Drops", description: "Tracks Arcane weapon drop progress", type: "number" },
    397: { name: "Daily Arcane Ring Drops", description: "Tracks Arcane ring drop progress", type: "number" },
    398: { name: "Toggle Tempest Weapon Drops", description: "Tracks Tempest weapon drops", type: "number" },
    399: { name: "Toggle Tempest Ring Drops", description: "Tracks Tempest ring drops", type: "number" },
    400: { name: "Tempest Stone Drops (AI)", description: "Tracks Tempest stone drops", type: "number" },
    401: { name: "Enable AFK Windwalker", description: "Tracks Quest 100 progress", type: "number" },
    402: { name: "Items Discovered in Sneaking (AI)", description: "resets daily - controls ability to find pristine charms/symbols", type: "number" },
    403: { name: "Sailing Progression Unlock (AI)", description: "Unlocks sailing-related feature, displays 'S' marker in UI", type: "number" },
    404: { name: "Asset Positioning Literal 404 (AI)", description: "Literal numeric value used heavily in asset loading, coordinate layout, and UI element positioning (NOTE: Acts as a literal, not an array index).", type: "number" },
    405: { name: "UI State Manager 1 (AI)", description: "State transitions for UI components", type: "number" },
    406: { name: "UI State Manager 2 (AI)", description: "State transitions for UI components", type: "number" },
    407: { name: "UI State Manager 3 (AI)", description: "State transitions for UI components", type: "number" },
    408: { name: "Kill Quest Completion (AI)", description: "Tracks specific kill quest completion", type: "number" },
    409: { name: "Quest Item Drop Tracker (AI)", description: "Accumulates quest item drops", type: "number" },
    410: { name: "Loop Reset Counter (AI)", description: "Reset during game loop", type: "number" },
    411: { name: "Gaming Mode Toggle (AI)", description: "Controls gaming/Spelunky display mode and affects sprout growth time multiplier", type: "number" },
    412: { name: "Display Mode Selector (AI)", description: "Display mode selector cycling through 3 states", type: "number" },
    413: { name: "Gaming Palette Selection (AI)", description: "Tracks selected gaming palette/tab", type: "number" },
    414: { name: "Tower Building Claims (AI)", description: "Tracks tower/workbench building claims with SuperBit bonuses", type: "number" },
    415: { name: "Acorn Shop Purchases (AI)", description: "Tracks acorn shop purchase count, affects cost calculations", type: "number" },
    416: { name: "Exotic Market Purchased for Week", description: "Tracks exotic market purchase count for current week (set to 0 to reset)", type: "number" },
    417: { name: "Quest 107 Progress (AI)", description: "Tracks progress for Quest 107 (cap 50)", type: "number" },
    418: { name: "Hoops Minigame Points", description: "Hoops minigame points", type: "number" },
    419: { name: "Hoops - Damage Bonus", description: "Hoops minigame shop damage bonus", type: "number" },
    420: { name: "Hoops - Coin Drop Bonus", description: "Hoops minigame shop coin drop bonus", type: "number" },
    421: { name: "Hoops - Class EXP Bonus", description: "Hoops minigame shop class EXP bonus", type: "number" },
    422: { name: "Hoops - Skill Efficiency Bonus", description: "Hoops minigame shop skill efficiency bonus", type: "number" },
    423: { name: "Hoops Reset Timer", description: "Time until Hoops minigame resets (negative to play)", type: "number" },
    424: { name: "Hoops Played Today", description: "Number of Hoops minigame played today", type: "number" },
    425: { name: "Divinity God Selection (AI)", description: "Tracks selected divinity god (1-10)", type: "number" },
    426: { name: "Coral Kid - Unlocked", description: "Coral Kid unlocked or not", type: "number" },
    427: { name: "Coral Kid - Divinity XP Bonus", description: "Coral Kid divinity XP bonus level", type: "number" },
    428: { name: "Coral Kid - max blessing level", description: "Coral Kid max blessing level", type: "number" },
    429: { name: "Coral Kid - god rank class xp level", description: "Coral Kid god rank class xp level", type: "number" },
    430: { name: "Coral Kid - divinity minor link bonus level", description: "Coral Kid divinity minor link bonus level", type: "number" },
    431: { name: "Coral Kid - divinity pts coral reef bonus level", description: "Coral Kid divinity pts coral reef bonus level", type: "number" },
    432: { name: "Coral Kid - daily coral reef bonus level", description: "Coral Kid daily coral reef bonus level", type: "number" },
    433: { name: "Coral Kid - NPC Visibility Flag", description: "Controls visibility of Coral actors/NPCs", type: "number" },
    434: { name: "Darts Minigame Points", description: "Darts minigame points", type: "number" },
    435: { name: "Darts Minigame Shop - Extra Damage Bonus", description: "Darts minigame shop extra damage bonus", type: "number" },
    436: { name: "Darts Minigame Shop - Page 1 Talent Points bonus", description: "Darts minigame upgrade level", type: "number" },
    437: { name: "Darts Minigame Shop - Cheaper Vault Upgrades bonus", description: "Darts minigame upgrade level", type: "number" },
    438: { name: "Darts Minigame Shop - Movement Speed bonus", description: "Darts minigame upgrade level", type: "number" },
    439: { name: "Time until Darts Minigame resets, negative number to play", description: "Decrements over time", type: "number" },
    440: { name: "Number of Darts Minigame played today - makes successive reset timer longer", description: "Darts minigame upgrade level", type: "number" },
    441: { name: "Timer System 2 (AI)", description: "Related to countdown systems", type: "number" },
    442: { name: "Darts Minigame high score", description: "Darts minigame high score", type: "number" },
    443: { name: "Character Animation Sprite Foundation (AI)", description: "Foundation element in 447-444 resource allocation block + coordinated sprite reference system", type: "number" },
    444: { name: "Sequential Sprite References System (AI)", description: "Part of coordinated resource allocation block (447-444) + character animation foundation", type: "number" },
    445: { name: "Character Leg Animation Frames (AI)", description: "Character leg animation frames (lines 148934-148937) + part of 8-element sprite array structure (rl2, ll1, ll2)", type: "number" },
    446: { name: "Multi-Purpose Resource Identifier (AI)", description: "Sound resource ID (lines 238034, 247413) + character limb sprite reference (left hand, line 148931) + portal X-coordinate (line 262888) + mathematical lookup table (blur effects, line 267370)", type: "number" },
    447: { name: "Sound Resource ID with Audio Looping (AI)", description: "Audio system integration with looping functionality + channel-based sound management", type: "number" },
    448: { name: "Monthly Cycle Tracker (AI)", description: "Tracks monthly cycles (division by 2628000ms)", type: "number" },
    449: { name: "Unused (AI)", description: "unused index.", type: "number" },
    450: { name: "Meritocracy Voting Selection Flag (AI)", description: "Tracks selected meritocracy voting bonus from predefined bonus array", type: "number" },
    451: { name: "Meritocracy Voting Weekly Timestamp (AI)", description: "Tracks weekly timestamp for meritocracy voting", type: "number" },
    452: { name: "Quest 107 Counter (AI)", description: "Tracks Quest 107 progress", type: "number" },
    453: { name: "Meritocracy Bonus Selector (AI)", description: "Selects active meritocracy voting bonus from predefined bonus array", type: "number" },
    454: { name: "Clamworks - Current Total", description: "Clamworks current total", type: "number" },
    455: { name: "Clamworks - Pearl Value", description: "Clamworks Pearl Value level", type: "number" },
    456: { name: "Clamworks - Clam Comrades level", description: "Clamworks Clam Comrades level", type: "number" },
    457: { name: "Clamworks - Lucky Day level", description: "Clamworks Lucky Day level", type: "number" },
    458: { name: "Clamworks - Multi-Scalping level", description: "Clamworks Clamworks level", type: "number" },
    459: { name: "Clamworks - Frugality level", description: "Clamworks Clamworks level", type: "number" },
    460: { name: "Clamworks - Pure Pearls level", description: "Controls pearl drop mechanics in specific game areas (w7a6)", type: "number" },
    461: { name: "Clamworks - Encystation Up level", description: "_Leaves_Stored - Resource counter in named index mapping system", type: "number" },
    462: { name: "Clamworks - Shinier Pearls level", description: "Temporary flag that gets reset to zero state", type: "number" },
    463: { name: "Clamworks - Anti Inflation level", description: "_Choppin_Game_Hiscore - High score value, tracks choppin game high score", type: "number" },
    464: { name: "Clamworks - Worker Class level", description: "Experience multiplier component for LUK5 system", type: "number" },
    465: { name: "Clam Progression Counter (AI)", description: "Tracks clam upgrade system progression", type: "number" },
    466: { name: "Killroy Dialogue State (AI)", description: "Tracks Killroy dialogue sequence (1-4)", type: "number" },
    467: { name: "Killroy Gallery Bonus", description: "Killroy gallery bonus", type: "number" },
    468: { name: "Killroy Masterclass Bonus", description: "Killroy masterclass bonus", type: "number" },
    469: { name: "Killroy w7 skill xp bonus", description: "Tracks Killroy shop purchases/rewards", type: "number" },
    470: { name: "Killroy w7 daily coral bonus", description: "Tracks Killroy shop purchases/rewards", type: "number" },
    471: { name: "Killroy 'boost something' bonus", description: "Tracks Killroy shop purchases/rewards", type: "number" },
    472: { name: "Voting Eligibility (AI)", description: "Determines meritocracy voting eligibility", type: "number" },
    473: { name: "Reliquarium Power Divisor (AI)", description: "Divisor in Reliquarium power calculations", type: "number" },
    474: { name: "Current Food Grade (AI)", description: "Tracks current food grade level", type: "number" },
    475: { name: "Quest106/Emporium Unlock (AI)", description: "Quest106 completion unlock that enables Emporium dialogue and golden food upgrade tier 3", type: "number" },
    476: { name: "Friend Bonuses - Active", description: "Active friend bonuses", type: "string", hint: "Format: 'x,yyyy,name;x,yyyy,name' where x=bonus index, yyyy=account level, name=player name" },
    477: { name: "Friend Bonuses - Incoming", description: "Incoming friend bonuses", type: "string", hint: "Format: 'x,yyyy,name;x,yyyy,name' where x=bonus index, yyyy=account level, name=player name" },
    478: { name: "Spelunking Progress (AI)", description: "Tracks progression in spelunking system", type: "number" },
    479: { name: "Yet Another Printer Multi Days", description: "Days since last sample for legend talent (Brown 4) - cap 20", type: "number", hint: "Cap at 20" },
    480: { name: "Progression Counter for Upgrades (AI)", description: "Progression counter for major upgrades (Grimoire, Compass, Legend Points) with complex calculation formulas.", type: "number" },
    481: { name: "Weekly Time Tracking System (AI)", description: "Weekly time tracking system for shop and divinity resets (week number calculations).", type: "number" },
    482: { name: "Spelunking Tutorial Completion Flag (AI)", description: "Tutorial completion flag for Spelunking tutorial system with progress tracking.", type: "number" },
    483: { name: "New Player Bundle System Flag (AI)", description: "Bundle system flag for new player rewards and premium content access.", type: "number" },
    484: { name: "Event Counter with Math Formulas (AI)", description: "Event counter with mathematical formulas for reward calculations and progression tracking.", type: "number" },
    485: { name: "Event Management Timer System (AI)", description: "Timer system for event management and talent calculations with time-sensitive mechanics.", type: "number" },
    486: { name: "Zenith clusters for Zenith market", description: "Zenith market currency system - tracks Zenith currency for purchasing in the Zenith Market", type: "number" },
    487: { name: "Zenith cluster farming toggle", description: "Cluster farming system toggle - 0=OFF, 1=ON. Controls conversion of 1M Statues to Zenith Clusters", type: "number" },
    488: { name: "Cluster Farming Activation Flag", description: "Cluster farming activation system - set to 1 when cluster farming is enabled and active", type: "number" },
};

// State
let currentOptionsData = null;
let optionsAccountWarningAccepted = false;

function initOptionsAccount() {
    const loadButton = document.getElementById('load-options-button');
    const refreshButton = document.getElementById('refresh-options-button');
    const filterInput = document.getElementById('options-filter');
    const modal = document.getElementById('options-warning-modal');
    const modalAccept = document.getElementById('modal-accept');
    const modalCancel = document.getElementById('modal-cancel');
    const optionsTabButtons = document.querySelectorAll('.options-tab-button');

    // Show warning modal when load button is clicked
    if (loadButton) {
        loadButton.addEventListener('click', () => {
            if (!optionsAccountWarningAccepted) {
                modal.style.display = 'flex';
            } else {
                loadOptionsAccount();
            }
        });
    }

    // Refresh button - reloads options without warning
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            loadOptionsAccount();
        });
    }

    // Modal accept button
    if (modalAccept) {
        modalAccept.addEventListener('click', () => {
            optionsAccountWarningAccepted = true;
            modal.style.display = 'none';
            loadOptionsAccount();
        });
    }

    // Modal cancel button
    if (modalCancel) {
        modalCancel.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    // Filter input with debouncing
    if (filterInput) {
        const debouncedFilter = debounce(filterOptions, 300);
        filterInput.addEventListener('input', debouncedFilter);
    }

    // Options tab switching
    optionsTabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.optionsTab;
            optionsTabButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.options-tab-pane').forEach(pane => pane.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(`${targetTab}-options`).classList.add('active');
        });
    });
}

async function loadOptionsAccount() {
    const loadingEl = document.getElementById('loading-options');
    const contentEl = document.getElementById('options-account-content');
    const loadButton = document.getElementById('load-options-button');
    const refreshButton = document.getElementById('refresh-options-button');
    const filterInput = document.getElementById('options-filter');

    if (loadingEl) loadingEl.style.display = 'block';
    if (contentEl) contentEl.style.display = 'none';

    try {
        const response = await fetch('/api/options-account');
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        currentOptionsData = result.data;

        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) contentEl.style.display = 'block';
        if (loadButton) loadButton.style.display = 'none';
        if (refreshButton) refreshButton.style.display = 'inline-block';
        if (filterInput) filterInput.style.display = 'inline-block';

        renderOptionsAccount();
        showStatus('Options loaded successfully');
    } catch (error) {
        console.error('Error loading options:', error);
        if (loadingEl) {
            loadingEl.textContent = `Error: ${error.message}`;
            loadingEl.style.color = 'var(--error)';
        }
        showStatus(`Error loading options: ${error.message}`, true);
    }
}

function renderOptionsAccount() {
    const documentedContainer = document.getElementById('documented-options');
    const rawContainer = document.getElementById('raw-options');

    if (!documentedContainer || !rawContainer || !currentOptionsData) return;

    try {
        // Use DocumentFragment for batch DOM insertion
        const documentedFragment = document.createDocumentFragment();
        const rawFragment = document.createDocumentFragment();

        // Render documented options
        currentOptionsData.forEach((value, index) => {
            const schema = optionsListAccountSchema[index];

            if (schema) {
                // Render in documented tab
                const item = createOptionItem(index, value, schema, false);
                documentedFragment.appendChild(item);
            }

            // Render in raw tab (all indices)
            const rawItem = createOptionItem(index, value, schema, true);
            rawFragment.appendChild(rawItem);
        });

        // Single DOM update per container
        documentedContainer.innerHTML = '';
        documentedContainer.appendChild(documentedFragment);
        rawContainer.innerHTML = '';
        rawContainer.appendChild(rawFragment);
    } catch (error) {
        console.error('Error rendering options:', error);
        showStatus('Error rendering options', true);
    }
}

function createOptionItem(index, value, schema, isRaw) {
    const item = document.createElement('div');
    item.className = 'option-item';
    item.dataset.index = index;

    if (schema && schema.warning) {
        item.classList.add('has-warning');
    }

    if (!schema) {
        item.classList.add('unknown');
    }

    const header = document.createElement('div');
    header.className = 'option-header';

    const label = document.createElement('div');
    label.className = 'option-label';
    label.textContent = schema ? schema.name : `Unknown Setting`;

    const indexLabel = document.createElement('div');
    indexLabel.className = 'option-index';
    indexLabel.textContent = `Index: ${index}`;

    header.appendChild(label);
    header.appendChild(indexLabel);
    item.appendChild(header);

    if (schema && schema.description) {
        const desc = document.createElement('div');
        desc.className = 'option-description';
        desc.textContent = schema.description;
        item.appendChild(desc);
    }

    if (schema && schema.warning) {
        const warning = document.createElement('div');
        warning.className = 'option-warning';
        warning.textContent = schema.warning;
        item.appendChild(warning);
    }

    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'option-input-wrapper';

    const input = document.createElement('input');
    input.className = 'option-input';
    input.dataset.index = index;
    input.dataset.originalType = typeof value;

    // Determine input type and value
    if (typeof value === 'boolean') {
        input.type = 'checkbox';
        input.checked = value;
    } else if (typeof value === 'number') {
        input.type = 'text';
        input.value = value;
    } else if (typeof value === 'string') {
        input.type = 'text';
        input.value = value;
    } else {
        input.type = 'text';
        input.value = JSON.stringify(value);
    }

    inputWrapper.appendChild(input);

    const typeBadge = document.createElement('span');
    typeBadge.className = 'option-type-badge';
    typeBadge.textContent = typeof value;
    inputWrapper.appendChild(typeBadge);

    // Add Apply button for this specific index
    const applyButton = document.createElement('button');
    applyButton.className = 'option-apply-button';
    applyButton.textContent = 'Apply';
    applyButton.addEventListener('click', () => applySingleOption(index, input));
    inputWrapper.appendChild(applyButton);

    item.appendChild(inputWrapper);

    if (schema && schema.hint) {
        const hint = document.createElement('div');
        hint.className = 'option-hint';
        hint.textContent = `Hint: ${schema.hint}`;
        item.appendChild(hint);
    }

    if (!schema && isRaw) {
        const unknownNote = document.createElement('div');
        unknownNote.className = 'option-description';
        unknownNote.textContent = 'Unknown - edit at your own risk';
        unknownNote.style.color = 'var(--warning)';
        item.appendChild(unknownNote);
    }

    return item;
}

async function applySingleOption(index, inputElement) {
    if (!currentOptionsData) {
        showStatus('No options data loaded', true);
        return;
    }

    const originalType = inputElement.dataset.originalType;
    let newValue;

    try {
        // Get the value from input
        if (inputElement.type === 'checkbox') {
            newValue = inputElement.checked;
        } else {
            const inputValue = inputElement.value.trim();

            // Preserve original type
            if (originalType === 'number') {
                newValue = parseFloat(inputValue);
                if (isNaN(newValue)) {
                    showStatus(`Invalid number at index ${index}`, true);
                    return;
                }
            } else if (originalType === 'boolean') {
                newValue = inputValue.toLowerCase() === 'true';
            } else if (originalType === 'string') {
                newValue = inputValue;
            } else {
                // Try to parse as JSON for complex types
                try {
                    newValue = JSON.parse(inputValue);
                } catch {
                    newValue = inputValue;
                }
            }
        }

        // Send to server
        const response = await fetch('/api/options-account/index', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index: index, value: newValue })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        // Update local cache
        currentOptionsData[index] = newValue;

        // Visual feedback - briefly highlight the item
        const optionItem = inputElement.closest('.option-item');
        if (optionItem) {
            optionItem.style.borderColor = 'var(--success)';
            optionItem.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
            setTimeout(() => {
                optionItem.style.borderColor = '';
                optionItem.style.backgroundColor = '';
            }, 1000);
        }

        showStatus(`Index ${index} updated successfully`);
    } catch (error) {
        console.error(`Error applying option at index ${index}:`, error);
        showStatus(`Error updating index ${index}: ${error.message}`, true);
    }
}

function filterOptions() {
    try {
        const filterInput = document.getElementById('options-filter');
        if (!filterInput) return;

        const filterText = filterInput.value.toLowerCase().trim();
        const allItems = document.querySelectorAll('.option-item');

        allItems.forEach(item => {
            if (!filterText) {
                item.style.display = '';
                return;
            }

            const index = item.dataset.index;
            const label = item.querySelector('.option-label')?.textContent.toLowerCase() || '';
            const description = item.querySelector('.option-description')?.textContent.toLowerCase() || '';

            if (index.includes(filterText) || label.includes(filterText) || description.includes(filterText)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    } catch (error) {
        console.error('Error filtering options:', error);
        showStatus('Error filtering options', true);
    }
}


// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOptionsAccount);
} else {
    initOptionsAccount();
}
