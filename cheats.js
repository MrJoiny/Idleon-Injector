/****************************************************************************************************
 *  This file will be executed in the context of the browser.
 *  The context "this" is set to the variable u from N.js
 *  Setting the initial stage of the cheating tool and some quick definitions.
 */
const cheats = {}; // Used to store the cheat functions
const cheatState = {}; // Used to store the state of the cheats

let dictVals = {}; // Used to store things like item and card definitions
let setupDone = false;
let bEngine; // The Stencyl engine
let itemDefs; // The item definitions
let monsterDefs;
let CList; // The custom list definitions
let events; // function that returns actorEvent script by it's number
let behavior; // Stencyl behavior object
// let CListFuncDict = {}; // Dictionary of custom list entries
let CListCached;

let iframe; // Declare iframe globally, initialize later

const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));

async function gameReady() {
  while (
    !this["com.stencyl.Engine"] ||
    !this["com.stencyl.Engine"].hasOwnProperty("engine") ||
    !this["com.stencyl.Engine"].engine.hasOwnProperty("scene") ||
    !this["com.stencyl.Engine"].engine.sceneInitialized ||
    this["com.stencyl.Engine"].engine.behaviors.behaviors[0].script._CloudLoadComplete !== 1
  ) {
    // disabled because of spamming console
    // console.log("Waiting", this);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  await new Promise((resolve) => setTimeout(resolve, 100));
  registerCommonVariables.call(this);
  return true;
}

function registerCommonVariables() {
  bEngine = this["com.stencyl.Engine"].engine;
  itemDefs = bEngine.getGameAttribute("ItemDefinitionsGET").h;
  monsterDefs = bEngine.getGameAttribute("MonsterDefinitionsGET").h;
  // CList = bEngine.getGameAttribute("CustomLists").h;
  CList = bEngine.gameAttributes.h.CustomLists.h;
  behavior = this["com.stencyl.behavior.Script"];
  events = function (num) {
    return this["scripts.ActorEvents_" + num];
  }.bind(this);
}

// The main function that executes all cheats
function cheat(action) {
  try {
    if (!setupDone) {
      (async () => {
        await setup();
      })();
    }
    const command = action.split(" ");
    const params = [];
    let foundCheat = cheats[command.join(" ")];
    while (!foundCheat && command.length > 0) {
      params.unshift(command.pop());
      foundCheat = cheats[command.join(" ")];
    }
    if (foundCheat) {
      const result = foundCheat.fn.call(this, params);
      return result ?? "Done.";
    } else return `${command} is not a valid option.`;
  } catch (error) {
    return `Error: ${error.stack}`;
  }
}

function registerCheat(command, fn, message) {
  cheats[command] = { fn: fn, message: message };
}

function registerCheats(cheatMap, higherKeys = []) {
  const cmd = higherKeys.concat(cheatMap.name).join(" ");
  let stateObject = higherKeys.reduce((obj, key) => obj[key], cheatState);
  stateObject[cheatMap.name] = cheatMap.hasOwnProperty("subcheats") ? {} : false;
  cheatMap["canToggleSubcheats"] ? (stateObject[cheatMap.name + "s"] = false) : null;

  let fn = function (params) {
    // cheat uses a custom function
    if (cheatMap.hasOwnProperty("fn"))
      return cheatMap.fn.call(this, higherKeys.concat(cheatMap.name).concat(params).splice(1));

    if (params.length > 0) {
      if (!cheatMap.hasOwnProperty("configurable"))
        return (
          `Wrong subcommand, use one of these:\n` +
          cheatMap.subcheats.map((p) => `${cmd} ${p.name} (${p.message})`).join("\n")
        );

      let config = higherKeys.reduce((obj, key) => obj[key], cheatConfig);

      let val = params.slice(cheatMap.configurable["isObject"] ? 1 : 0).join(" ");
      if (val === "")
        return `Invalid value, must be a boolean, number or function that returns a number.`;
      try {
        val = JSON.parse(val);
      } catch (e) {
        val = new Function("return " + val)();
        if (isNaN(val(1)))
          return `Invalid value, must be a boolean, number or function that returns a number.`;
      }

      stateObject[cheatMap.name] = true;
      if (cheatMap.configurable["isObject"]) {
        config[cheatMap.name][params[0]] = val;
        return `Set ${cmd} ${params[0]} to ${val}`;
      } else {
        config[cheatMap.name] = val;
        return `Set ${cmd} to ${val}`;
      }
    }
    if (!params[0] && cheatMap["subcheats"]) {
      for (const i in stateObject[cheatMap.name])
        stateObject[cheatMap.name][i] = !stateObject[cheatMap.name + "s"];
      stateObject[cheatMap.name + "s"] = !stateObject[cheatMap.name + "s"];
      return `${stateObject[cheatMap.name + "s"] ? "Activated" : "Deactived"} ${cheatMap.message}`;
    }

    stateObject[cheatMap.name] = !stateObject[cheatMap.name];
    return `${stateObject[cheatMap.name] ? "Activated" : "Deactived"} ${cheatMap.message}.`;
  };
  registerCheat(cmd, fn, cheatMap["message"]);

  if (cheatMap.hasOwnProperty("subcheats")) {
    cheatMap.subcheats.forEach((map) => registerCheats(map, higherKeys.concat(cheatMap.name)));
  }
}

// Function called by the backend API to update the config in the game context
function updateCheatConfig(newConfig) {
  // Simple merge: Iterate over newConfig and update cheatConfig
  // For nested objects, this will replace the entire nested object.
  // If deep merging is needed, a more complex recursive merge function would be required.
  for (const key in newConfig) {
    if (Object.hasOwnProperty.call(newConfig, key)) {
      // Check if the property exists in the original cheatConfig to avoid adding new top-level keys unintentionally
      // Although, allowing new keys might be desired depending on how configs evolve.
      // Let's allow adding new keys for flexibility for now.
      cheatConfig[key] = newConfig[key];
    }
  }
}

/****************************************************************************************************
  Registering available cheats:
  Start things off with the relatively safe cheats.
  Though the drop function itself is safe, dropping unreleased items obviously isn't!
*/
// Show all available cheats, this one's as safe as it can get xD
registerCheat(
  "cheats",
  function (params) {
    let cheatsAvailable = [];
    Object.keys(cheats).forEach((cheat) => {
      cheatsAvailable.push(cheat + (cheats[cheat]["message"] ? ` (${cheats[cheat].message})` : ""));
    });
    return cheatsAvailable.join("\n");
  },
  "list available cheats"
);

// The OG-drop function that we all love
registerCheat(
  "drop",
  function (params) {
    const actorEvents189 = events(189);
    const character =
      bEngine.getGameAttribute("OtherPlayers").h[bEngine.getGameAttribute("UserInfo")[0]];

    const item = params[0];
    const amount = params[1] || 1;
    try {
      const itemDefinition = itemDefs[item];
      if (itemDefinition) {
        const toChest = cheatConfig.wide.autoloot.tochest;
        cheatConfig.wide.autoloot.tochest = false;
        let x = character.getXCenter();
        let y = character.getValue("ActorEvents_20", "_PlayerNode");
        if (item.includes("SmithingRecipes"))
          actorEvents189._customBlock_DropSomething(item, 0, amount, 0, 2, y, 0, x, y);
        else actorEvents189._customBlock_DropSomething(item, amount, 0, 0, 2, y, 0, x, y);
        cheatConfig.wide.autoloot.tochest = toChest;
        return `Dropped ${itemDefinition.h.displayName.replace(/_/g, " ")}. (x${amount})`;
      } else return `No item found for '${item}'`;
    } catch (err) {
      return `Error: ${err}`;
    }
  },
  "drop items, hitting enter selects from the list, add the number you want to drop after that"
);

// Spawn any monster you like: Be careful with what you spawn!
registerCheat(
  "spawn",
  function (params) {
    const ActorEvents124 = events(124);
    const monster = params[0];
    const spawnAmnt = params[1] || 1;
    const character =
      bEngine.getGameAttribute("OtherPlayers").h[bEngine.getGameAttribute("UserInfo")[0]];
    try {
      const monsterDefinition = monsterDefs[monster];
      if (monsterDefinition) {
        let x = character.getXCenter();
        let y = character.getValue("ActorEvents_20", "_PlayerNode");
        for (let i = 0; i < spawnAmnt; i++)
          ActorEvents124._customBlock_CreateMonster(monster, y, x);
        return `Spawned ${monsterDefinition.h["Name"].replace(/_/g, " ")} ${spawnAmnt} time(s)`;
      } else return `No monster found for '${monster}'`;
    } catch (err) {
      return `Error: ${err}`;
    }
  },
  "spawn monsters, hitting enter selects from the list, add the number you want to spawn after that"
);

registerCheats({
  name: "unlock",
  message:
    "unlock portals, rifts, pearls, presets, quickref, teleports, colloseum, silver pens, revives",
  canToggleSubcheats: true,
  subcheats: [
    {
      name: "portals",
      fn: function (params) {
        bEngine.getGameAttribute("KillsLeft2Advance").map((entry) => {
          for (i = 0; i < entry.length; i++) entry[i] = 0;
          return entry;
        });
        return `The portals have been unlocked!`;
      },
    },
    { name: "divinitypearl", message: "divinity pearls > lvl50" },
    { name: "presets", message: "preset changes everywhere" },
    { name: "quickref", message: "quickref." },
    { name: "teleports", message: "free teleports." },
    { name: "tickets", message: "free colosseum tickets." },
    { name: "silvpen", message: "free silver pens." },
    { name: "goldpen", message: "free gold pens." },
    { name: "obolfrag", message: "free obol fragments." },
    { name: "rifts", message: "Unlock rift portals" },
    { name: "revive", message: "unlimited revives" },
    { name: "islands", message: "unlock islands" },
  ],
});

// Gem Pack Cheats
registerCheats({
  name: "buy",
  message: "buy gem shop packs, you get the items from the pack, but no gems and no pets",
  canToggleSubcheats: true,
  subcheats: [
    // Helper function to create bundle cheats
    ...(() => {
      const createBundleCheat = (name, code) => ({
        name: code,
        message: name,
        fn: function () {
          this["FirebaseStorage"].addToMessageQueue("SERVER_CODE", "SERVER_ITEM_BUNDLE", code);
          return `${name} has been bought!`;
        },
      });

      // Bundle definitions - name, code
      return [
        ["Lava Supporter Pack", "bun_a"],
        ["New Year Supporter Pack", "bun_b"],
        ["Starter Pack", "bun_c"],
        ["Easter Bundle", "bun_d"],
        ["Totally Chill Pack", "bun_e"],
        ["Summer Bundle", "bun_f"],
        ["Dungeon Bundle", "bun_g"],
        ["Giftmas Bundle", "bun_h"],
        ["Auto Loot Pack", "bun_i"],
        ["Outta This World Pack", "bun_j"],
        ["Eggscellent Pack", "bun_k"],
        ["Super Hot Fire Pack", "bun_l"],
        ["Gem Motherlode Pack", "bun_m"],
        ["Riftwalker Pack", "bun_n"],
        ["Bloomin Pet Pack", "bun_o"],
        ["Island Explorer Pack", "bun_p"],
        ["Equinox Dreamer Pack", "bun_q"],
        ["Calm Serenity Pack", "bun_r"],
        ["Sacred Methods Pack", "bun_s"],
        ["Timeless Pack", "bun_t"],
        ["Ancient Echoes Pack", "bun_u"],
        ["Deathbringer Pack", "bun_v"],
        ["Windwalker Pack", "bun_w"],
        ["Arcande Cultist Pack", "bun_x"],
        ["Valenslime Day Pack", "bun_y"],
        ["Fallen Spirits Pet Pack", "bun_z"],
        ["Storage Ram Pack", "bon_a"],
        ["Blazing Star Anniversary Pack", "bon_c"],
        ["Midnight Tide Anniversary Pack", "bon_d"],
        ["Lush Emerald Anniversary Pack", "bon_e"],
        ["Eternal Hunter Pack", "bon_f"],
        ["Gilded Treasure Pack", "bon_g"],
        ["World 7 Pack", "bon_i"],
        ["Squirell Pack", "bon_h"],
        ["Mr.Piggy Pack", "bon_j"],
        ["Autumn Pack", "bon_k"],
        ["Bubba! Pack", "bon_l"],
        ["Bunny Pack", "bon_m"],
        ["Hedgehog Pack", "bon_n"],
        ["Panda Pack", "bon_o"],
      ].map(([name, code]) => createBundleCheat(name, code));
    })(),
  ],
});

const minigameCheat = function (params) {
  setupMinigameProxy.call(this);
  setupCatchingMinigameProxy.call(this);
  setupGeneralInfoProxy.call(this);
  setupPoingProxy.call(this);
  setupHoopsMinigameProxy.call(this);
  setupDartsMinigameProxy.call(this);
  setupMonumentProxy.call(this);
  cheatState.minigame[params[0]] = !cheatState.minigame[params[0]];
  return `${cheatState.minigame[params[0]] ? "Activated" : "Deactivated"} ${params[0]
    } minigame cheat.`;
};
registerCheats({
  name: "minigame",
  message: "unlimited minigames",
  canToggleSubcheats: true,
  subcheats: [
    { name: "mining", message: "mining minigame cheat", fn: minigameCheat },
    { name: "fishing", message: "fishing minigame cheat", fn: minigameCheat },
    { name: "catching", message: "catching minigame cheat", fn: minigameCheat },
    { name: "choppin", message: "choppin minigame cheat", fn: minigameCheat },
    { name: "poing", message: "poing minigame cheat", fn: minigameCheat },
    { name: "hoops", message: "hoops minigame cheat", fn: minigameCheat },
    { name: "darts", message: "darts minigame cheat", fn: minigameCheat },
    { name: "wisdom", message: "wisdom monument minigame cheat", fn: minigameCheat }
  ],
});



/****************************************************************************************************
  The following commands have not been tested properly and/or are definitely dangerous to use
  Use these only if you don't care about shadow ban and/or have the confidence in some...
  Functions such as spawn, godlike and nullify don't directly modify the account info...
  ...and may be safe to use to some degree. (No guarantees!!)
*/
// Account-wide cheats
registerCheats({
  name: "wide",
  message: "all account-wide cheats",
  canToggleSubcheats: true,
  subcheats: [
    {
      name: "gembuylimit",
      fn: function (params) {
        if (cheatState.wide.gembuylimit && !params[1]) {
          cheatState.wide.gembuylimit = false;
          return `Disabled gembuylimit.`;
        }
        if (Number.isInteger(Number(params[1]))) {
          cheatConfig.wide.gembuylimit = Number(params[1]);
          cheatState.wide.gembuylimit = true;
          return `Set max gem item purchases to ${cheatConfig.wide.gembuylimit}.`;
        } else {
          return `Parameter must be an integer.`;
        }
      },
      message: "set max gem item purchases",
    },
    { name: "mtx", message: "gem shop cost nullification" },
    { name: "post", message: "post cost nullification" },
    { name: "guild", message: "guild cost nullification" },
    { name: "task", message: "task cost nullification" },
    { name: "quest", message: "quest item requirment nullification" },
    { name: "star", message: "star point requirement nullification" },
    { name: "giant", message: "100% giant mob spawn rate" },
    {
      name: "plunderous",
      message: "100% plunderous mob spawn rate",
      configurable: { isObject: true },
    },
    { name: "candy", message: "enable candy use everywhere" },
    {
      name: "candytime",
      message: "buffs 1 hr candys in minutes",
      configurable: true,
    },
    { name: "nodmg", message: "no damage numbers" },
    { name: "eventitems", message: "unlimited event item drops" },
    {
      name: "autoloot",
      message:
        "autoloot immeditely to inventory. Optionally add config to move directly to your chest.",
      configurable: { isObject: true },
    },
    {
      name: "perfectobols",
      message:
        "Roll all obols perfectly for class. Family and inventory obols update on character change.",
      fn: function (params) {
        if (!cheatState.wide[params[0]]) rollAllObols();
        cheatState.wide[params[0]] = !cheatState.wide[params[0]];
        return `${cheatState.wide[params[0]] ? "Activated" : "Deactived"
          } Perfect obol rolls. Family and inventory obols update on character change.`;
      },
    },
    {
      name: "autoparty",
      message: "Automatically add on screen players to your party",
    },
    {
      name: "arcade",
      message:
        "arcade cost nullify",
      configurable: { isObject: true },
    },
    {
      name: "eventspins",
      message: "Infinite event spins",
    },
    {
      name: "hoopshop",
      message:
        "hoopshop cost nullify",
      configurable: { isObject: true },
    },
    {
      name: "dartshop",
      message:
        "dartshop cost nullify",
      configurable: { isObject: true },
    },
  ],
});

registerCheats({
  name: "talent",
  message: "talent value override cheats",
  configurable: true,
  subcheats: [
    { name: "168", message: "Orb of remembrance", configurable: true },
    { name: "169", message: "Imbuted shokwaves", configurable: true },
    { name: "318", message: "Pirate flag", configurable: true },
    { name: "120", message: "shockwave slash", configurable: true },
    { name: "483", message: "Tenteyecle", configurable: true },
    { name: "45", message: "Void trial rerun", configurable: true },
  ],
});

// Cauldron cheats
registerCheats({
  name: "cauldron",
  message: "costs and duration nullifications (except P2W).",
  canToggleSubcheats: true,
  subcheats: [
    { name: "vialrng", message: "vial unlock upon rolling 1+" },
    { name: "vialattempt", message: "unlimited vial attempts" },
    { name: "bubblecost", message: "bubble cost nullification" },
    { name: "vialcost", message: "vial cost nullification" },
    { name: "lvlreq", message: "lvl requirement nullification" },
    { name: "newbubble", message: "new bubble chance 100%" },
    { name: "re_speed", message: "super research speed" },
    { name: "liq_rate", message: "super liquid speed", configurable: true },
  ],
});

registerCheats({
  name: "w1",
  message: "all w1 cheats.",
  canToggleSubcheats: true,
  subcheats: [
    { name: "anvil", message: "anvil cost and duration nullification." },
    { name: "forge", message: "forge upgrade cost nullification." },
    { name: "stampcost", message: "stamp cost nullification." },
    {
      name: "smith",
      message: "smithing cost nullification (change maps to have the effect apply).",
    },
    { name: "companion", message: "Enable companion", configurable: true },
    { name: "owl", message: "Enable Owl cheats, check config file", configurable: true }
  ],
});

// All w2 related Proxy cheats
registerCheats({
  name: "w2",
  message: "World 2 cheats",
  canToggleSubcheats: true,
  subcheats: [
    { name: "boss", message: "unlimited boss attempts" },
    { name: "roo", message: "Enable Roo cheats, check config file", configurable: true },
    { name: "alchemy", message: "Enable Alchemy cheats, check config file", configurable: true },
  ],
});

// All w3 related Proxy cheats
registerCheats({
  name: "w3",
  message: "all workbench nullifications and worship mob insta-death.",
  canToggleSubcheats: true,
  subcheats: [
    { name: "mobdeath", message: "worship mobs insta-death." },
    { name: "towerdamage", message: "multiply tower damage (see config)" },
    { name: "flagreq", message: "flag unlock time nullification." },
    { name: "freebuildings", message: "free tower upgrades." },
    { name: "instabuild", message: "insta-build of buildings." },
    { name: "booktime", message: "book per second." },
    { name: "totalflags", message: "10 total flags." },
    { name: "buildspd", message: "multiply build speed (see config)" },
    { name: "saltlick", message: "Salt Lick upgrade cost nullification." },
    { name: "refinery", message: "refinery cost nullification." },
    { name: "refineryspeed", message: "reduces refinery time (see config)" },
    { name: "trapping", message: "multiply trapping time, make the traps faster by adding more time" },
    { name: "book", message: "always max lvl talent book." },
    { name: "prayer", message: "Prayer curse nullification." },
    // { name: 'shrinehr', message: 'shrine lvl time reduction to 0.5h.' }, //too dangerous, causes super high shrine levels
    { name: "worshipspeed", message: "multiply worship charge speed (see config)" },
    { name: "freeworship", message: "nullification of worship charge cost" },
    { name: "globalshrines", message: "global shrines" },
    { name: "instantdreams", message: "Dream bar fills instantly" },
    { name: "bettercog", message: "Gives you a bit better cog chances" },
    { name: "jeweledcogs", message: "Unlimited jeweled cogs (needs to be unlocked in gaming first)" },
  ],
});

// All w4 related Proxy cheats
registerCheats({
  name: "w4",
  message: "all w4 cheats.",
  canToggleSubcheats: true,
  subcheats: [
    { name: "battleslots", message: "all 6 battle slots" },
    { name: "eggcap", message: "all egg slots" },
    { name: "fenceyard", message: "all fenceyard slots" },
    { name: "petchance", message: "configurable pet chance (see config)" },
    { name: "genes", message: "0 gene upgrades" },
    { name: "fasteggs", message: "faster incubation (see config)" },
    { name: "fastforaging", message: "fast foraging (see config)" },
    { name: "spiceclaim", message: "unlimited spice claims" },
    { name: "petupgrades", message: "cheaper pet upgrades (see config)" },
    {
      name: "petrng",
      message: "max strength pets (for level and egg, with a tiny bit of randomness)",
    },
    {
      name: "superpets",
      message: "don't mess with these little guys, even if they look cute",
    },
    { name: "labpx", message: "long lab connections" },
    { name: "mealspeed", message: "configurable meal speed (see config)" },
    { name: "recipespeed", message: "configurable recipe speed (see config)" },
    { name: "luckychef", message: "new recipe chance (see config)" },
    { name: "kitchensdiscount", message: "cheaper kitchens and upgrades (see config)" },
    { name: "platesdiscount", message: "cheaper dinner plate upgrades (see config)" },
    { name: "arena", message: "unlimited arena entries" },
    { name: "sigilspeed", message: "fast sigil research (see config)" },
    {
      name: "mainframe",
      message: "mainframe cheats check config file",
      configurable: { isObject: true },
    },
    {
      name: "chipbonuses",
      message: "chip bonuses check config file",
      configurable: { isObject: true },
    },
    {
      name: "meals",
      message: "meal bonus cheats check config file",
      configurable: { isObject: true },
    },
  ],
});

registerCheats({
  name: "w5",
  message: "all w5 cheats",
  canToggleSubcheats: true,
  subcheats: [
    {
      name: "sailing",
      message: "sailing cheats check config file",
      configurable: { isObject: true },
    },
    {
      name: "gaming",
      message: "gaming cheats check config file",
      configurable: { isObject: true },
    },
    {
      name: "divinity",
      message: "divinity cheats check config file",
      configurable: { isObject: true },
    },
    {
      name: "collider",
      message: "collider cheats check config file",
      configurable: { isObject: true },
    },
    {
      name: "holes",
      message: "holes cheats check config file",
      configurable: { isObject: true },
    },
  ],
});

// added by dreamx3 - 2
// all w6 related proxy cheats
registerCheats({
  name: "w6",
  message: "all available w6 cheats",
  canToggleSubcheats: true,
  subcheats: [
    {
      name: "farming",
      message: "farming cheats check config file",
      configurable: { isObject: true },
    },
    {
      name: "ninja",
      message: "ninja cheats check config file",
      configurable: { isObject: true },
    },
    {
      name: "summoning",
      message: "summoning cheats check config file",
      configurable: { isObject: true },
    },
    {
      name: "grimoire",
      message: "grimoire cheats check config file",
      configurable: { isObject: true },
    },
    {
      name: "windwalker",
      message: "windwalker cheats check config file",
      configurable: { isObject: true },
    },
    {
      name: "arcane",
      message: "arcane cultist cheats check config file",
      configurable: { isObject: true },
    },
    {
      name: "emperor",
      message: "unlimeted emperor tries",
      configurable: { isObject: true },
    },
    {
      name: "endless",
      message: "easy endless runs for summoning",
      configurable: { isObject: true },
    }
  ],
});

registerCheats({
  name: "w7",
  message: "all available w7 cheats",
  canToggleSubcheats: true,
  subcheats: [
    {
      name: "spelunk",
      message: "spelunk cheats check config file",
      configurable: { isObject: true },
    },
    {
      name: "gallery",
      message: "gallery cheats check config file",
      configurable: { isObject: true },
    },
    {
      name: "reef",
      message: "coral reef nullify cost",
      configurable: { isObject: true },
    },
    {
      name: "clam",
      message: "clam cheats check config file",
      configurable: { isObject: true },
    },
    {
      name: "coralkid",
      message: "coral kid nullify cost",
      configurable: { isObject: true },
    },
    {
      name: "bigfish",
      message: "big fish nullify cost",
      configurable: { isObject: true },
    },
    {
      name: "sneaksymbol",
      message: "sneaksymbol 100% chance",
      configurable: { isObject: true },
    },
    {
      name: "bubba",
      message: "bubba cheats check config file",
      configurable: { isObject: true },
    },
  ],
});

//summoning game cheat
registerCheat(
  "summoning",
  function (params) {
    if (params && params[0]) {
      try {
        if (params[0] === "reset") {
          cheatConfig.w6.summoning["UnitTypeDraw"] = (t) => t;
          return `summoning units has been reset to default`;
        }

        const summonUnit = summonUnits[params[0]];
        if (summonUnit || summonUnit === 0) {
          cheatConfig.w6.summoning["UnitTypeDraw"] = (t) => summonUnit;
          return `${params[0]} set as unit to be drawn`;
        }
        return `no such unit ${params[0]} found`;
      } catch (err) {
        return `Error: ${err}`;
      }
    }
    return `Please input a unit name 'basic' 'vrumbi' 'bloomy' 'tonka' 'regalis' OR 'reset' to summon as per normal.`;
  },
  "Set summoning units to be always a certain type"
);

// drop ninja item
registerCheat(
  "ninjaItem",
  function (params) {
    if (params && params[0]) {
      const char = parseInt(params[0]);
      let loopTimes = 1;

      if (char < 0 || char > 9)
        return `Please choose a ninja twin to generate item, 0 -> first char, 1 -> second char.`;
      try {
        loopTimes = params[1] && parseInt(params[1]) > 0 ? parseInt(params[1]) : 1;
        const actorEvents579 = events(579);
        let n = 0;
        while (n < loopTimes) {
          actorEvents579._customBlock_Ninja("GenerateItem", char, 0);
          n++;
        }
        return `Generated ${loopTimes} ninja items for character ${char}`;
      } catch (err) {
        return `Error: ${err}`;
      }
    }
    return `Please choose a ninja twin to generate item, 0 -> first char, 1 -> second char.`;
  },
  "Generates a ninja item based on the floor which ninja twin is inputted."
);

// drop stat specific maxed keychain
registerCheat(
  "keychain",
  function (params) {
    if (params && params[0]) {
      try {
        const selectedStat = keychainStatsMap[params[0]];

        if (selectedStat) {
          cheatConfig.misc["keychain"] = (t) => [
            selectedStat[1],
            selectedStat[2],
            parseInt(selectedStat[3]),
            selectedStat[2],
            parseInt(selectedStat[3]),
          ];
        }
        return `Set keychain with ${selectedStat[2]}`;
      } catch (err) {
        return `Error: ${err}`;
      }
    }
    cheatConfig.misc["keychain"] = (t) => t;
    return `Reset to default rng, input a stat to set keychain stats`;
  },
  "Generate specific keychain with double max stats when buying from Flurbo store"
);
// end - 2

// Godlike powers
registerCheats({
  name: "godlike",
  message: "all godlike powers.",
  canToggleSubcheats: true,
  subcheats: [
    { name: "reach", message: "reach set to 666" },
    { name: "crit", message: "crit set to 100" },
    {
      name: "ability",
      message: "zero ability cooldown, mana cost nullification and cast time 0.1s.",
    },
    { name: "food", message: "food deduction nullification" },
    { name: "hitchance", message: "hitchance set to 100" },
    { name: "intervention", message: `instant divine intervention` },
    {
      name: "speed",
      message: "weapon super speed",
      fn: function (params) {
        for (const [index, element] of Object.entries(itemDefs))
          if (element.h["typeGen"] === "aWeapon") itemDefs[index].h["Speed"] = params[1] || 9;
        return `All weapon speed are up to Turbo. \nThe max speed parameter you can set is 14: Higher will cause a non-attacking bug.`;
      },
    },
    {
      name: "card",
      message:
        "Efaunt, Chaotic Efaunt, Dr Defecaus, Oak Tree and Copper are altered with insane stats",
      fn: function (params) {
        const CardStuff = CList.CardStuff;
        const TargetCards = ["Boss2A", "Boss2B", "poopBig", "OakTree", "Copper"];
        for (const [key1, value1] of Object.entries(CardStuff))
          for (const [key2, value2] of Object.entries(value1))
            if (TargetCards.includes(value2[0])) CardStuff[key1][key2][4] = "10000";
        return `The cards Efaunt, Chaotic Efaunt, Dr Defecaus, Oak Tree and Copper have been altered with insane stats.`;
      },
    },
    { name: "poison", message: "instant bubo poison" },
    { name: "respawn", message: "instant mob respawn", configurable: true },
    { name: "hp", message: "never lose hp, become invincible (when active)" },
  ],
});

registerCheat(
  "nomore",
  function (params) {
    if (
      params &&
      params[0] &&
      (regex = new RegExp(params[0])) &&
      Object.keys(itemDefs).filter((item) => regex.test(item)).length > 0
    ) {
      cheatConfig.nomore.items.map((r) => r.toString()).includes(regex.toString())
        ? cheatConfig.nomore.items.splice(
          cheatConfig.nomore.items.map((r) => r.toString()).indexOf(regex.toString()),
          1
        )
        : cheatConfig.nomore.items.push(regex);
      return `${params[0]} will ${cheatConfig.nomore.items.includes(regex) ? "not " : ""}drop.`;
    } else {
      return `Item not found`;
    }
  },
  `Stop dropping these item from monsters, accepts regular expressions. Useful for xtal farming (safe)`
);

// Quick daily shop and post office reset
registerCheat(
  "daily",
  function (params) {
    bEngine.getGameAttribute("TimeAway").h["ShopRestock"] = 1;
    return `The daily shop restock has been triggered, which somehow also triggers the daily post office reset.`;
  },
  "Daily shop and post office reset"
);

// upgrade stones
registerCheats({
  name: "upstones",
  message: "upgrade stone cheats",
  subcheats: [
    {
      name: "rng",
      message: "100% upgrade stone success (safe)",
      fn: function (params) {
        for (const [index, element] of Object.entries(itemDefs))
          if (element.h["typeGen"] === "dStone") itemDefs[index].h["Amount"] = 100;
        return `All upgrade stones have 100% success chance.`;
      },
    },
    {
      name: "use",
      message: "Upgrade stone doesn't use a slot (risky)",
      fn: function (params) {
        for (const [index, element] of Object.entries(itemDefs))
          if (element.h["typeGen"] === "dStone") itemDefs[index].h["Trigger"] = 0;
        return `Using an upgrade stone doesn't deduct remaining upgrade amount on an item.`;
      },
    },
    {
      name: "misc",
      message: "upgrade stone misc cheat.",
    },
  ],
});

// stat multipliers
registerCheats({
  name: "multiply",
  message:
    "Multiplies stats by the number (or applies function) given. use reasonably, ridiculous numbers can cause shadowbanning!",
  subcheats: [
    {
      name: "damage",
      message: "Multiplies damage by the number given (use reasonably!)",
      configurable: {
        valueTransformer: (val) => (!isNaN(val) ? new Function(`t => t * ${val}`)() : val),
      },
    },
    {
      name: "efficiency",
      message: "Multiplies skill efficiency by the number given (use reasonably!)",
      configurable: {
        valueTransformer: (val) => (!isNaN(val) ? new Function(`t => t * ${val}`)() : val),
      },
    },
    {
      name: "afk",
      message: "Multiplies AFK % by the number given (use reasonably!)",
      configurable: {
        valueTransformer: (val) => (!isNaN(val) ? new Function(`t => t * ${val}`)() : val),
      },
    },
    {
      name: "drop",
      message: "Multiplies drop rate by the number given (use reasonably!)",
      configurable: {
        valueTransformer: (val) => (!isNaN(val) ? new Function(`t => t * ${val}`)() : val),
      },
    },
    {
      name: "money",
      message: "Multiplies coin drops by the number given (use reasonably!)",
      configurable: {
        valueTransformer: (val) => (!isNaN(val) ? new Function(`t => t * ${val}`)() : val),
      },
    },
    {
      name: "classexp",
      message: "Multiplies class EXP by the number given (use reasonably!)",
      configurable: {
        valueTransformer: (val) => (!isNaN(val) ? new Function(`t => t * ${val}`)() : val),
      },
    },
    {
      name: "crystal",
      message: "Multiplies crystal spawn rate by the number given (use reasonably!)",
      configurable: {
        valueTransformer: (val) => (!isNaN(val) ? new Function(`t => t * ${val}`)() : val),
      },
    },
    {
      name: "skillexp",
      message: "Multiplies skill EXP by the number given (use reasonably!)",
      configurable: {
        valueTransformer: (val) => (!isNaN(val) ? new Function(`t => t * ${val}`)() : val),
      },
    },
    {
      name: "shopstock",
      message: "Multiplies town shop stock by the number given (works after daily reset)",
      configurable: {
        valueTransformer: (val) =>
          !isNaN(val) ? new Function(`t => t * ${val}`)() : val,
      },
    },
    {
      name: "printer",
      message: "Multiplies sample print by x, overrides lab/god bonus",
      configurable: true,
    },
    {
      name: "monsters",
      message: "Multiplies the number of monsters on the map by the number given",
      configurable: true,
    },
  ],
});

// Restore non-Proxy changed values
registerCheats({
  name: "restore",
  message: "Restores non-proxy changed values.",
  subcheats: [
    {
      name: "save",
      message: "Saves the current values of items and cards",
      fn: function (params) {
        dictVals.itemDefs = JSON.parse(JSON.stringify(itemDefs));
        dictVals.CardStuff = JSON.parse(JSON.stringify(CList.CardStuff));
        return `Saved the current values.`;
      },
    },
    {
      name: "item",
      message: "Restores original item values.",
      fn: function (params) {
        itemDefs = dictVals.itemDefs;
        return `Restored original item values.`;
      },
    },
    {
      name: "card",
      message: "Restores original card values.",
      fn: function (params) {
        CList.CardStuff = dictVals.CardStuff;
        return `Restored original card values.`;
      },
    },
  ],
});

// The bulk item function with dictionary item collections
registerCheat(
  "bulk",
  function (params) {
    const actorEvents189 = events(189);
    const character =
      bEngine.getGameAttribute("OtherPlayers").h[bEngine.getGameAttribute("UserInfo")[0]];

    // Obtaining clusters of items at once (Doesn't return a drop log in the console)
    const items = params[0] || "default";
    const amnt = params[1] || 1;
    try {
      let x = character.getXCenter();
      let y = character.getValue("ActorEvents_20", "_PlayerNode");
      const drop_log = [];
      // Here we'll use the pre-defined function to work out the magic
      if (DictDrops[items]) {
        if (items === "startalents")
          DictDrops[items].forEach((item) => {
            actorEvents189._customBlock_DropSomething("TalentBook1", item, 0, 0, 2, y, 0, x, y);
            drop_log.push(`Dropped talent book with id ${item}`);
          });
        if (items === "smith") {
          DictDrops[items].forEach((item) => {
            // Drop the regular items
            if (itemDefs[item]) {
              actorEvents189._customBlock_DropSomething(item, 1, 0, 0, 2, y, 0, x, y);
              drop_log.push(`Dropped ${itemDefs[item].h.displayName.replace(/_/g, " ")}. (x${1})`);
            } else drop_log.push(`No item found for '${item}'`);
          });
          //Not really too efficient, must be a better way to deal with this... Since this one's kinda lackluster I'll postphone it for now
          const notreleased = [
            [23, 59, 63, 70],
            [24, 44, 48, 65, 66, 67, 79],
            [20, 21, 46, 59],
          ]; // Array of smithing recipes that aren't out yet
          if (amnt == 1)
            [...Array(84).keys()].forEach((item) => {
              if (notreleased[0].indexOf(item) == -1)
                actorEvents189._customBlock_DropSomething(
                  `SmithingRecipes1`,
                  0,
                  item,
                  0,
                  2,
                  y,
                  0,
                  x,
                  y
                );
            });
          if (amnt == 2)
            [...Array(80).keys()].forEach((item) => {
              if (notreleased[1].indexOf(item) == -1)
                actorEvents189._customBlock_DropSomething(
                  `SmithingRecipes2`,
                  0,
                  item,
                  0,
                  2,
                  y,
                  0,
                  x,
                  y
                );
            });
          if (amnt == 3)
            [...Array(60).keys()].forEach((item) => {
              if (notreleased[2].indexOf(item) == -1)
                actorEvents189._customBlock_DropSomething(
                  `SmithingRecipes3`,
                  0,
                  item,
                  0,
                  2,
                  y,
                  0,
                  x,
                  y
                );
            });
        } else
          DictDrops[items].forEach((item) => {
            if (itemDefs[item]) {
              actorEvents189._customBlock_DropSomething(item, amnt, 0, 0, 2, y, 0, x, y);
              drop_log.push(
                `Dropped ${itemDefs[item].h.displayName.replace(/_/g, " ")}. (x${amnt})`
              );
            } else drop_log.push(`No item found for '${item}'`);
          });
      } else
        drop_log.push(
          ` The sub-command didn't yield any item collection. Existing sub-commands are: \n ${Object.keys(
            DictDrops
          ).join(", ")}`
        );
      return drop_log.join("\n");
    } catch (err) {
      return `Error: ${err}`;
    }
  },
  `Drop a collection of items at once. Usage: bulk [sub-command] [amount]`
);

/****************************************************************************************************
  Runescape homage cheats: Now we're finally God Gaming xD
*/
registerCheat(
  "runescape",
  function () {
    // Activate ability bar switching when switching weapons
    cheatState.runescape = !cheatState.runescape;
    return `${cheatState.runescape ? "Activated" : "Deactived"} ability bar switching.`;
  },
  "Switches ability bar when switching weapons."
);

// Preset BiS weapon + upgrade binding
registerCheat(
  "bind",
  function () {
    const AttackLoadout = bEngine.getGameAttribute("AttackLoadout");
    bEngine.whenAnyKeyPressedListeners.push(function (e, t) {
      if (
        (e.keyCode === 65 || e.keyCode === 83 || e.keyCode === 68 || e.keyCode === 70) &&
        bEngine.getGameAttribute("MenuType") === 6
      ) {
        const BiS = {
          65: ["STR", "EquipmentSword3"], // Key A
          83: ["AGI", "EquipmentBows8"], // Key S
          68: ["WIS", "EquipmentWands7"], // Key D
          70: ["LUK", "EquipmentPunching5"], // Key F
        };
        // BiS = Warped Weapon Upgrade Stone: All random stats goes to the style's DPS stat
        const upgrstats = { Weapon_Power: 3, Defence: 0, Random_Stat: 4 }; // Edit this line to whatever you like
        const EquipOrd = bEngine.getGameAttribute("EquipmentOrder")[0];
        const EquipMap = bEngine.getGameAttribute("EquipmentMap")[0];
        const upgrslots = itemDefs.h[BiS[e.keyCode][1]].h["Upgrade_Slots_Left"];
        if (BiS[e.keyCode]) {
          // Only procs if whatever keycode is defined in the dictionary
          EquipOrd[1] = BiS[e.keyCode][1]; // Change equipped weapon
          EquipMap[1].h["Upgrade_Slots_Left"] = upgrslots * -1; // Deduct the amount of slots left
          EquipMap[1].h["Weapon_Power"] = upgrslots * upgrstats["Weapon_Power"];
          EquipMap[1].h["Defence"] = upgrslots * upgrstats["Defence"];
          EquipMap[1].h[BiS[e.keyCode][0]] = upgrslots * upgrstats["Random_Stat"];
        }
        if (cheatState.runescape) {
          // Let's play Runescape xD
          switch (e.keyCode) {
            case 65: // Melee
              AttackLoadout[0] = [90, 91, 105, 120, 106, 121];
              AttackLoadout[1] = [94, 108, 122, 107, 639, 635];
              break;
            case 83: // Ranged
              AttackLoadout[0] = [270, 271, 285, 300, 286, 301];
              AttackLoadout[1] = [273, 288, 303, 302, 639, 635];
              break;
            case 68: // Mage
              AttackLoadout[0] = [453, 450, 451, 482, 465, 467];
              AttackLoadout[1] = [481, 480, 466, 469, 639, 635];
              break;
            case 70: // Buffbar
              AttackLoadout[0] = [15, 30, 94, 108, 288, 481];
              AttackLoadout[1] = [302, 303, 466, 469, 122, 273];
              break;
            default:
              break;
          }
        }
      }
    });
    return `The custom keybinds have been activated! (Has to be re-applied when changing maps)`;
  },
  "Binds a weapon to a key. (A = STR, S = AGI, D = WIS, F = LUK)"
);

// This function doesn't kill other players (luckily) but yourself :)
registerCheat(
  "noob",
  function (params) {
    const hpval = parseInt(params[0]) || 0;
    bEngine.gameAttributes.h.PlayerHP = hpval;
    return `The amount of health is set to ${params[0]}`;
  },
  "Kill yourself"
);

// Not sure if this function's safe, probably is to most items but I have not personally tested.
registerCheats({
  name: "qnty",
  message: "Change the quantity of the first item in inventory/chest",
  subcheats: [
    {
      name: "inv",
      message: "Change the quantity of the first inventory slot to this value",
      fn: function (params) {
        const setqnty = params[1] || 1;
        bEngine.getGameAttribute("ItemQuantity")[0] = setqnty;
        return `The item quantity in the first inventory slot has been changed to ${setqnty}`;
      },
    },
    {
      name: "chest",
      message: "Change the quantity of the first chest slot to this value",
      fn: function (params) {
        const setqnty = params[1] || 1;
        bEngine.getGameAttribute("ChestQuantity")[0] = setqnty;
        return `The item quantity in the first chest slot has been changed to ${setqnty}`;
      },
    },
  ],
});

registerCheat(
  "jackpot",
  function () {
    (function () {
      this._TRIGGEREDtext = "a6";
      this._customEvent_PachiStuff2();
    }).bind(bEngine.gameAttributes.h.PixelHelperActor[21].behaviors.behaviors[0].script)();
    return "JACKPOT!!!";
  },
  "Hit the jackpot in the arcade"
);

registerCheat("chromedebug", () => { }, "Open the game in a chrome debug console"); //handled in the executable

/****************************************************************************************************
  The following functions only aggregate information from the game's data structures.
  As such, these functions are perfectly safe.
*/
// Search by item, monster or talent name: All in lowercase!
registerCheats({
  name: "search",
  message: "Search for an item, monster, talent or smithing recipe",
  subcheats: [
    {
      name: "item",
      message: "Search for an item",
      fn: function (params) {
        const searchVals = [];
        const queryX =
          params.slice(1) && params.slice(1).length
            ? params.slice(1).join(" ").toLowerCase()
            : undefined;
        searchVals.push("Id, Item");
        for (const [key, value] of Object.entries(itemDefs)) {
          const valName = value.h.displayName.replace(/_/g, " ").toLowerCase();
          if (valName.includes(queryX)) searchVals.push(`${key} - ${valName}`);
        }
        if (searchVals.length > 0) return searchVals.join("\n");
        else return `No info found for '${queryX}'`;
      },
    },
    {
      name: "monster",
      message: "Search for a monster",
      fn: function (params) {
        const searchVals = [];
        const queryX =
          params.slice(1) && params.slice(1).length
            ? params.slice(1).join(" ").toLowerCase()
            : undefined;
        searchVals.push("Id, Monster");
        for (const [key, value] of Object.entries(monsterDefs)) {
          const valName = value.h["Name"].replace(/_/g, " ").toLowerCase();
          if (valName.includes(queryX)) searchVals.push(`${key} - ${valName}`);
        }
        if (searchVals.length > 0) return searchVals.join("\n");
        else return `No info found for '${queryX}'`;
      },
    },
    {
      name: "talent",
      message: "Search for a talent",
      fn: function (params) {
        const searchVals = [];
        const queryX =
          params.slice(1) && params.slice(1).length
            ? params.slice(1).join(" ").toLowerCase()
            : undefined;
        searchVals.push("Order, Id, Talent");
        const talentDefs = CList.TalentIconNames;
        const Order = CList.TalentOrder;
        for (let i = 0; i < Order.length; i++) {
          const valName = talentDefs[Order[i]].replace(/_/g, " ").toLowerCase();
          if (valName.includes(queryX)) searchVals.push(`${i} - ${Order[i]} - ${valName}`);
        }
        if (searchVals.length > 0) return searchVals.join("\n");
        else return `No info found for '${queryX}'`;
      },
    },
    {
      name: "smith",
      message: "Search for an item to smith",
      fn: function (params) {
        const searchVals = [];
        const queryX =
          params.slice(1) && params.slice(1).length
            ? params.slice(1).join(" ").toLowerCase()
            : undefined;
        const ItemVals = [[], []];
        searchVals.push("Tab, Id, ItemId, ItemName");
        const ItemToCraftNAME = CList.ItemToCraftNAME;
        for (const [key, value] of Object.entries(itemDefs)) {
          const valName = value.h.displayName.replace(/_/g, " ").toLowerCase();
          if (valName.includes(queryX)) ItemVals.push([key, valName]);
        }
        for (h = 0; h < ItemVals.length; h++)
          for (i = 0; i < ItemToCraftNAME.length; i++)
            for (j = 0; j < ItemToCraftNAME[i].length; j++)
              if (ItemVals[h][0] == ItemToCraftNAME[i][j])
                searchVals.push(`${i + i}, ${j}, ${ItemVals[h][0]}, ${ItemVals[h][1]}`);
        if (searchVals.length > 0) return searchVals.join("\n");
        else return `No info found for '${queryX}'`;
      },
    },
  ],
});

// A list creator
const listFunction = function (params) {
  const foundVals = [];

  if (params[0] == "item") {
    foundVals.push("Id, ingameName");
    for (const [key, value] of Object.entries(itemDefs)) {
      let valName;
      if (key.startsWith("Cards"))
        valName = (
          value.h.desc_line1.replace(/_/g, " ").toLowerCase() +
          value.h.desc_line2.replace(/_/g, " ").toLowerCase()
        ).replace("filler", "");
      else valName = value.h.displayName.replace(/_/g, " ").toLowerCase();
      foundVals.push(`${key}, ${valName}`);
    }
  } else if (params[0] == "bundle") {
    foundVals.push("Bundle, Message");
    console.log(this["scripts.CustomMapsREAL"].GemPopupBundleMessages());
    const GemPopupBundleMessages = this["scripts.CustomMapsREAL"].GemPopupBundleMessages().h;
    let cleaned;
    for (const [key, value] of Object.entries(GemPopupBundleMessages)) {
      cleaned = value.replace(/_/g, " ");
      if (key != "Blank") {
        foundVals.push(`${key}, ${cleaned}`);
        foundVals.push("\n");
      }
    }
  } else if (params[0] == "missing_bundle") {
    foundVals.push("Bundle, Message");
    console.log(this["scripts.CustomMapsREAL"].GemPopupBundleMessages());
    const GemPopupBundleMessages = this["scripts.CustomMapsREAL"].GemPopupBundleMessages().h;
    const bundles_received = bEngine.gameAttributes.h.BundlesReceived.h; // dict with the same key as GemPopupBundleMessages value is 0 or 1
    let cleaned;
    for (const [key, value] of Object.entries(GemPopupBundleMessages)) {
      cleaned = value.replace(/_/g, " ");
      if (bundles_received[key] != 1 && key != "Blank") {
        foundVals.push(`${key}, ${cleaned}`);
        foundVals.push("\n");
      }
    }
  } else if (params[0] == "monster") {
    foundVals.push("Id, ingameName, HP, Defence, Damage, EXP");
    for (const [key, value] of Object.entries(monsterDefs)) {
      const valName = value.h["Name"].replace(/_/g, " ").toLowerCase();
      foundVals.push(
        `${key}, ${valName}, ${value.h["MonsterHPTotal"]}, ${value.h["Defence"]}, ${value.h["Damages"][0]}, ${value.h["ExpGiven"]}`
      );
    }
  } else if (params[0] == "monster") {
    foundVals.push("Id, ingameName, HP, Defence, Damage, EXP");
    for (const [key, value] of Object.entries(monsterDefs)) {
      const valName = value.h["Name"].replace(/_/g, " ").toLowerCase();
      foundVals.push(
        `${key}, ${valName}, ${value.h["MonsterHPTotal"]}, ${value.h["Defence"]}, ${value.h["Damages"][0]}, ${value.h["ExpGiven"]}`
      );
    }
  } else if (params[0] == "card") {
    foundVals.push("Id, Entity, Value, Effect");
    const CardStuff = CList.CardStuff;
    for (const [key1, value1] of Object.entries(CardStuff))
      for (const [key2, value2] of Object.entries(value1)) {
        if (monsterDefs[value2[0]])
          foundVals.push(
            `${value2[0]}, ${monsterDefs[value2[0]].h["Name"]}, ${value2[4]}, ${value2[3]}`
          );
        else foundVals.push(`${value2[0]}, Unknown, ${value2[4]}, ${value2[3]}`);
      }
  } else if (params[0] == "class") {
    foundVals.push("Id, ClassName, PromotesTo");
    for (const [index, element] of CList.ClassNames.entries())
      foundVals.push(`${index}, ${element}, [${CList.ClassPromotionChoices[index]}]`);
  } else if (params[0] == "quest") {
    foundVals.push("Id, QuestName, NPC, QuestlineNo, paramX1");
    for (const [index, element] of CList.SceneNPCquestOrder.entries())
      foundVals.push(`${element}, ${CList.SceneNPCquestInfo[index].join(", ")}`);
  } else if (params[0] == "map") {
    foundVals.push("Num_Id, Str_Id, MapName, AFK1, AFK2, Transition");
    for (const [index, element] of CList.MapName.entries())
      foundVals.push(
        `${index}, ${element}, ${CList.MapDispName[index]}, ${CList.MapAFKtarget[index]}, ${CList.MapAFKtargetSide[index]}, [${CList.SceneTransitions[index]}]`
      );
  } else if (params[0] == "talent") {
    foundVals.push("Order, Id, Name");
    const Order = CList.TalentOrder;
    const talentDefs = CList.TalentIconNames;
    for (i = 0; i < Order.length; i++)
      if (talentDefs[Order[i]] !== "_")
        foundVals.push(`${i}, ${Order[i]}, ${talentDefs[Order[i]]}`);
  } else if (params[0] == "ability") {
    foundVals.push("Order, Id, Name");
    const Order = CList.TalentOrder;
    const talentDefs = CList.TalentIconNames;
    const atkMoveMap = this["scripts.CustomMaps"].atkMoveMap.h;
    for (i = 0; i < Order.length; i++)
      if (talentDefs[Order[i]] !== "_")
        if (atkMoveMap[talentDefs[Order[i]]])
          // Filter out all non-ability talents
          foundVals.push(`${i}, ${Order[i]}, ${talentDefs[Order[i]]}`);
  } else if (params[0] == "smith") {
    foundVals.push("CraftId, Tab, ItemId, ItemName");
    const ItemToCraftNAME = CList.ItemToCraftNAME;
    for (i = 0; i < ItemToCraftNAME.length; i++)
      for (j = 0; j < ItemToCraftNAME[i].length; j++) {
        let itemName = itemDefs[ItemToCraftNAME[i][j]].h.displayName
          .replace(/_/g, " ")
          .toLowerCase();
        foundVals.push(`${i + 1}, ${j}, ${ItemToCraftNAME[i][j]}, ${itemName}`);
      }
  } else if ((params[0] = "gga"))
    for (const [key, val] of Object.entries(bEngine.gameAttributes.h)) foundVals.push(key);
  else return "Valid sub-commands are:\n item\n monster\n class\n quest\n map\n talent\n smith";
  if (params[1]) return foundVals.filter((foundVals) => foundVals.includes(params[1])).join("\n");
  return foundVals.join("\n"); // Concatenate all lines into one string with new lines
};
registerCheats({
  name: "list",
  message: "list something. third param optional filter",
  subcheats: [
    {
      name: "bundle",
      message: "list bundles. third param optional filter",
      fn: listFunction,
    },
    {
      name: "missing_bundle",
      message: "list missing bundles",
      fn: listFunction,
    },
    {
      name: "item",
      message: "list items. third param optional filter",
      fn: listFunction,
    },
    {
      name: "monster",
      message: "list monsters. third param optional filter",
      fn: listFunction,
    },
    {
      name: "class",
      message: "list classes. third param optional filter",
      fn: listFunction,
    },
    {
      name: "card",
      message: "list classes. third param optional filter",
      fn: listFunction,
    },
    {
      name: "quest",
      message: "list quests. third param optional filter",
      fn: listFunction,
    },
    {
      name: "map",
      message: "list maps. third param optional filter",
      fn: listFunction,
    },
    {
      name: "talent",
      message: "list talents. third param optional filter",
      fn: listFunction,
    },
    {
      name: "ability",
      message: "list abilities. third param optional filter",
      fn: listFunction,
    },
    {
      name: "smith",
      message: "list smithing recipes. third param optional filter",
      fn: listFunction,
    },
    {
      name: "gga",
      message: "list game attributes. third param optional filter",
      fn: listFunction,
    },
  ],
});

// Get Game Attributes: Uses a for loop to iterate over the object's key/index and element.
registerCheat(
  "gga",
  function (params) {
    return gg_func(params, 0); // Yup the function's down at the bottom
  },
  "The attribute you want to get, separated by spaces"
);

// Get Game Key
registerCheat(
  "ggk",
  function (params) {
    return gg_func(params, 1); // Yup the function's down at the bottom
  },
  "The key you want to get, separated by spaces"
);

/* 	Evaluate Get Game Attributes: fill in the variable you'd like to see
  > egga this["com.stencyl.Engine"].engine.getGameAttribute("Lv0");
  Under the hood it does: 
  > let gga = this["com.stencyl.Engine"].engine.getGameAttribute("Lv0");
  Yeah this function is therefore pretty buggy, don't expect too much out of it xD
*/
registerCheat(
  "egga",
  function (params) {
    const foundVals = [];
    const atkMoveMap = this["scripts.CustomMaps"].atkMoveMap.h;
    const abilities = bEngine.getGameAttribute("AttackLoadout");
    try {
      let gga = eval(params[0]);
      let obj_gga = Object.entries(gga);
      if (typeof obj_gga == "string" || obj_gga.length == 0) foundVals.push(`${gga}`);
      else for (const [index, element] of obj_gga) foundVals.push(`${index}, ${element}`);
      return foundVals.join("\n");
    } catch (error) {
      // If the gga isn't an Array nor Dictionary.
      if (error instanceof TypeError)
        return `This TypeError should appear if you gave a non-existing object`;
      return `Error: ${err}`;
    }
  },
  "Show the game attribute, separate with spaces."
);

// Evaluate Get Game Key: The code is indeed quite redundant, but yeah... it works
registerCheat(
  "eggk",
  function (params) {
    const foundVals = [];
    const atkMoveMap = this["scripts.CustomMaps"].atkMoveMap.h;
    const abilities = bEngine.getGameAttribute("AttackLoadout");
    try {
      let gga = eval(params[0]);
      let obj_gga = Object.entries(gga);
      if (typeof obj_gga == "string" || obj_gga.length == 0)
        foundVals.push(`Non iterable value: ${gga}`);
      else for (const [index, element] of obj_gga) foundVals.push(`${index}`);
      return foundVals.join("\n");
    } catch (error) {
      // If the gga isn't an Array nor Dictionary.
      if (error instanceof TypeError)
        return `This TypeError should appear if you gave a non-existing object`;
      return `Error: ${err}`;
    }
  },
  "Show the game key, separate with spaces."
);
/****************************************************************************************************
  These following functions enable you to perform extremely risky value manipulations...
  ...and have insanely high chance of destroying your account. 
 
  Only use these when you know what you're doing!!
*/
// Stop/restart cloud saving
registerCheat(
  "cloudz",
  function () {
    cheatState.cloudz = !cheatState.cloudz;
    return `${cheatState.cloudz ? "Activated" : "Deactived"
      } the cloudsave jammer: Your game will not be saved while it's active! \nOnce disabled, your game will proc a cloudsave in 5 seconds. \nProbably doesn't work.`;
  },
  "Stop cloud saving"
);
// Wipe stuff
const wipeFunction = function (params) {
  if (params[0] === "inv") {
    const wipedef = bEngine.getGameAttribute("InventoryOrder");
    for (const [index, element] of Object.entries(wipedef)) wipedef[index] = "Blank";
    return "The inventory has been wiped.";
  }
  else if (params[0] === "invslot") {
    const wipedef = bEngine.getGameAttribute("InventoryOrder");
    if (!params[1]) return "Specify a slot number.";
    if (params[1] < 0 || params[1] > wipedef.length) return "Invalid slot.";
    wipedef[params[1]] = "Blank";
    return "Wipe inventory slot could result in a crash: Should be fine after restart.";
  }
  else if (params[0] == "chest") {
    const wipedef = bEngine.getGameAttribute("ChestOrder");
    for (const [index, element] of Object.entries(wipedef)) wipedef[index] = "Blank";
    return "Wipe chest could result in a crash: Should be fine after restart.";
  }
  else if (params[0] == "chestslot") {
    const wipedef = bEngine.getGameAttribute("ChestOrder");
    if (!params[1]) return "Specify a slot number.";
    if (params[1] < 0 || params[1] > wipedef.length) return "Invalid slot.";
    wipedef[params[1]] = "Blank";
    return "Wipe chest slot could result in a crash: Should be fine after restart.";
  }
  else if (params[0] === "forge") {
    for (const [index, element] of Object.entries(bEngine.getGameAttribute("ForgeItemOrder"))) {
      bEngine.getGameAttribute("ForgeItemOrder")[index] = "Blank";
      bEngine.getGameAttribute("ForgeItemQuantity")[index] = 0;
    }
    return "The forge has been wiped. \nIf the game crashes, it should be fine after restart.";
  }
  else if (params[0] === "overpurchases") {
    bEngine.getGameAttribute("GemItemsPurchased");
    let gemShopInfo = CList.MTXinfo;
    let maxItems = [];
    gemShopInfo.forEach(function (tab) {
      tab.forEach(function (tabGroup) {
        tabGroup.forEach(function (item) {
          if (item[4] > 0 && item[5] > 0) {
            maxItems[item[4]] = item[5];
          }
        });
      });
    });
    maxItems.forEach(function (numberAllowed, index) {
      if (bEngine.getGameAttribute("GemItemsPurchased")[index] > numberAllowed) {
        bEngine.getGameAttribute("GemItemsPurchased")[index] = numberAllowed;
      }
    });
    return "Overpurchased items have been set to their max safe value.";
  } else if (params[0] === "cogs") {
    if (parseInt(params[1])) {
      cheatConfig.wipe.cogs = parseInt(params[1]);
    } else {
      bEngine.gameAttributes.h.CogOrder.forEach(
        (v, k) =>
          typeof v === "string" &&
          k >
          100 +
          bEngine.gameAttributes.h.CogOrder.slice(100)
            .toString()
            .match(/Player/g).length -
          1 +
          parseInt(cheatConfig.wipe.cogs) &&
          !v.includes("Player") &&
          ((bEngine.gameAttributes.h.CogOrder[k] = "Blank"),
            bEngine.gameAttributes.h.CogMap[k]
              .keys()
              .keys.forEach((a) => delete bEngine.gameAttributes.h.CogMap[k].h[a]))
      );
    }
  } else return "Unknown sub-command given\nKnown sub-commands are 'inv', 'chest', 'forge'.";
};
registerCheats({
  name: "wipe",
  message: "Wipe certain stuff from your account. Use with caution!",
  subcheats: [
    { name: "inv", message: "Wipe your inventory.", fn: wipeFunction },
    { name: "invslot", message: "Wipe your inventory slot uses array indexes 0 equals the first slot", fn: wipeFunction },
    { name: "chest", message: "Wipe your chest.", fn: wipeFunction },
    { name: "chestslot", message: "Wipe your chest slot uses array indexes 0 equals the first slot", fn: wipeFunction },
    { name: "forge", message: "Wipe your forge.", fn: wipeFunction },
    {
      name: "overpurchases",
      message: "Set all overpurchased items in the gem shop to their max safe value.",
      fn: wipeFunction,
    },
    { name: "cogs", message: "Remove all unused cogs", fn: wipeFunction },
  ],
});

// This function definitely looks dangerous as it changes your class, but doesn't reset distributed talents!
registerCheat(
  "class",
  function (params) {
    let ClassId = parseInt(params[0]) || -1;
    if (ClassId == -1) return `Class Id has to be a numeric value!`;
    if (ClassId > 50 || ClassId < 0) ClassId = 1; // A small fail-safe
    bEngine.setGameAttribute("CharacterClass", ClassId);
    return `Class id has been changed to ${ClassId}`;
  },
  "!danger! Change character class to this id"
);

// A highly dangerous function, only use it on shadow banned test accounts!!
registerCheat(
  "abilitybar",
  function (params) {
    const talentDefs = CList.TalentIconNames;
    const AttackLoadout = bEngine.getGameAttribute("AttackLoadout");
    // First parameter is the ability bar that ranges from 0 to 9.
    const abilitybar = params[0];
    const abilities = params.slice(1); //
    const Abilities = [];
    if (abilitybar < 10 && abilitybar >= 0) {
      for (const [index, element] of Object.entries(abilities)) {
        if (index >= 6) return "An ability bar can only hold 6 elements!";
        if (element < talentDefs.length && element >= 0) {
          Abilities.push(
            `Bar ${abilitybar} ability ${index} set to: ${talentDefs[element]
              .replace(/_/g, " ")
              .toLowerCase()}`
          );
          AttackLoadout[abilitybar][index] = element;
        } else Abilities.push("Ability falls out of the known id range!");
      }
      bEngine.setGameAttribute("AttackLoadout", AttackLoadout);
      return Abilities.join("\n");
    } else return "The ability bar index ranges from 0 to 9!";
  },
  "!danger! The ability bar index a from 0-2, then up to 6 ability IDs x y z... (use list ability to find ability IDs)"
);

// This function is extremely dangerous, as you're changing the lvl value your exp isn't changing accordingly
const changeLv0 = function (params) {
  const lvltype = params[0];
  const setlvl = parseInt(params[1]) || -1;
  if (setlvl == -1) return `The lvl value has to be numeric!`; // Yup this is a dummy-proof measurement to prevent account bricking
  // The class and skill lvl code is easily done through dictionary.
  const dictype = {
    class: 0,
    mining: 1,
    smithing: 2,
    chopping: 3,
    fishing: 4,
    alchemy: 5,
    catching: 6,
    trapping: 7,
    construction: 8,
    worship: 9,
  };
  if (Object.keys(dictype).includes(lvltype))
    bEngine.getGameAttribute("Lv0")[dictype[lvltype]] = setlvl;
  return `${lvltype} level has been changed to ${setlvl}.`;
};
registerCheats({
  name: "lvl",
  message: "Change the lvl of this skill to this value",
  subcheats: [
    {
      name: "class",
      message: "Change the class lvl to this value",
      fn: changeLv0,
    },
    {
      name: "mining",
      message: "Change the mining lvl to this value",
      fn: changeLv0,
    },
    {
      name: "smithing",
      message: "Change the smithing lvl to this value",
      fn: changeLv0,
    },
    {
      name: "chopping",
      message: "Change the chopping lvl to this value",
      fn: changeLv0,
    },
    {
      name: "fishing",
      message: "Change the fishing lvl to this value",
      fn: changeLv0,
    },
    {
      name: "alchemy",
      message: "Change the alchemy lvl to this value",
      fn: changeLv0,
    },
    {
      name: "catching",
      message: "Change the catching lvl to this value",
      fn: changeLv0,
    },
    {
      name: "trapping",
      message: "Change the trapping lvl to this value",
      fn: changeLv0,
    },
    {
      name: "construction",
      message: "Change the construction lvl to this value",
      fn: changeLv0,
    },
    {
      name: "worship",
      message: "Change the worship lvl to this value",
      fn: changeLv0,
    },
    {
      name: "furnace",
      message: "!danger! Change all furnace lvl to this value",
      fn: function (params) {
        const lvltype = params[0];
        const setlvl = parseInt(params[1]) || -1;
        if (setlvl == -1) return `The lvl value has to be numeric!`; // Yup this is a dummy-proof measurement to prevent account bricking
        bEngine.setGameAttribute("FurnaceLevels", [16, setlvl, setlvl, setlvl, setlvl, setlvl]);
        return `${lvltype} has been changed to ${setlvl}.`;
      },
    },
    {
      name: "statue",
      message: "!danger! Change all statue lvl to this value",
      fn: function (params) {
        const setlvl = parseInt(params[1]) || -1;
        if (setlvl == -1) return `The lvl value has to be numeric!`; // Yup this is a dummy-proof measurement to prevent account bricking
        bEngine.getGameAttribute("StatueLevels").forEach((item) => (item[0] = setlvl));
        return `Statue has been changed to ${setlvl}.`;
      },
    },
    {
      name: "anvil",
      message: "!danger! Change all anvil lvl to this value",
      fn: function (params) {
        const setlvl = parseInt(params[1]) || -1;
        if (setlvl == -1) return `The lvl value has to be numeric!`; // Yup this is a dummy-proof measurement to prevent account bricking
        const Levels = bEngine.getGameAttribute("AnvilPAstats");
        const lvllist = { exp: 3, spd: 4, cap: 5 };
        for (const i in lvllist) Levels[lvllist[i]] = setlvl;
        bEngine.setGameAttribute("AnvilPAstats", Levels);
        return `Anvil levels have been changed to ${setlvl}.`;
      },
    },
    {
      name: "talent",
      message: "!danger! Change all talent lvls to this value",
      fn: function (params) {
        const setlvl = parseInt(params[1]) || -1;
        if (setlvl == -1) return `The lvl value has to be numeric!`; // Yup this is a dummy-proof measurement to prevent account bricking
        const Levels0 = bEngine.getGameAttribute("SkillLevelsMAX");
        const Levels1 = bEngine.getGameAttribute("SkillLevels");
        for (const [index, element] of Object.entries(Levels0))
          Levels0[index] = Levels1[index] = setlvl;
        return `Talent levels changed to ${setlvl}.`;
      },
    },
    {
      name: "stamp",
      message: "Change all stamp lvls to this value",
      fn: function (params) {
        const setlvl = parseInt(params[1]) || -1;
        if (setlvl == -1) return `The lvl value has to be numeric!`; // Yup this is a dummy-proof measurement to prevent account bricking
        const Levels0 = bEngine.getGameAttribute("StampLevelMAX");
        const Levels1 = bEngine.getGameAttribute("StampLevel");
        for (const [index1, element1] of Object.entries(Levels0)) // A double for loop to nail the job
          for (const [index2, element2] of Object.entries(element1))
            Levels0[index1][index2] = Levels1[index1][index2] = setlvl;
        return `Both current and max of all stamp levels have been set to ${setlvl}`;
      },
    },
    {
      name: "shrine",
      message: "!danger! Change all shrine lvls to this value",
      fn: function (params) {
        const setlvl = parseInt(params[1]) || -1;
        if (setlvl == -1) return `The lvl value has to be numeric!`; // Yup this is a dummy-proof measurement to prevent account bricking
        const Levels = bEngine.getGameAttribute("ShrineInfo");
        Levels.forEach((item) => {
          item[3] = setlvl;
          item[4] = 0;
        }); // Shrine lvl set and accumulated xp to 0
        return `Shrine levels have been changed to ${setlvl}.`;
      },
    },
  ],
});

// Raw changes to cauldron variables
const alchFn = function (params) {
  const alchdict = {
    orangebubbles: 0,
    greenbubbles: 1,
    purplebubbles: 2,
    yellowbubbles: 3,
    vials: 4,
    color: 5,
    liquids: 6,
    cauldrons: 8,
  };
  const setlvl = params[1] || 1000;
  if (Object.keys(alchdict).includes(params[0])) {
    const tochange = bEngine.getGameAttribute("CauldronInfo")[alchdict[params[0]]];
    if (params[0] === "upgrade") {
      for (const [index1, element1] of Object.entries(tochange))
        for (const [index2, element2] of Object.entries(element1))
          tochange[index1][index2][1] = setlvl;
      return `All cauldron upgrades set to lvl ${setlvl}`;
    } // No need to else, as there's a return
    for (const [index, element] of Object.entries(tochange)) tochange[index] = setlvl;
    return `All ${params[0]} levels have changed to ${setlvl}.`;
  } else return `Wrong sub-command, use one of these:\n${Object.keys(alchdict).join(", ")}`;
};
registerCheats({
  name: "setalch",
  message: "change alchemy levels",
  subcheats: [
    {
      name: "orangebubbles",
      message: "!danger! Change all orange bubble lvls to this value",
      fn: alchFn,
    },
    {
      name: "greenbubbles",
      message: "!danger! Change all green bubble lvls to this value",
      fn: alchFn,
    },
    {
      name: "purplebubbles",
      message: "!danger! Change all purple bubble lvls to this value",
      fn: alchFn,
    },
    {
      name: "yellowbubbles",
      message: "!danger! Change all yellow bubble lvls to this value",
      fn: alchFn,
    },
    {
      name: "vials",
      message: "!danger! Change all vial lvls to this value",
      fn: alchFn,
    },
    {
      name: "color",
      message: "!danger! Change the color?!?! lvls to this value",
      fn: alchFn,
    },
    {
      name: "liquids",
      message: "!danger! Change the liquid cap/rate lvls to this value",
      fn: alchFn,
    },
    {
      name: "cauldrons",
      message: "!danger! Change the cauldron lvls to this value",
      fn: alchFn,
    },
  ],
});

// All item can by worn by any class
registerCheat(
  "equipall",
  function (params) {
    for (const [index, element] of Object.entries(itemDefs)) {
      // Any item with Class attribute is set to ALL, and any with lvlReqToEquip set to 1
      if (element.h["Class"]) itemDefs[index].h["Class"] = "ALL";
      if (element.h["lvReqToEquip"]) itemDefs[index].h["lvReqToEquip"] = 1;
    }
    return `All items can be worn by any class at any level.`;
  },
  "!danger! Equip any item at any class/level"
);

// I still aim to add even more costs to nullify
registerCheat(
  "nullify",
  function (params) {
    const changedstuff = []; // Used to concatenate strings about what has been nullified by this command xD

    changedstuff.push(cheat.call(this, "wide mtx"));
    changedstuff.push(cheat.call(this, "wide post"));
    changedstuff.push(cheat.call(this, "wide task"));
    changedstuff.push(cheat.call(this, "wide quest"));
    changedstuff.push(cheat.call(this, "wide star"));
    changedstuff.push(cheat.call(this, "wide obol"));
    changedstuff.push(cheat.call(this, "wide candy"));
    changedstuff.push(cheat.call(this, "unlock"));
    changedstuff.push(cheat.call(this, "w1"));
    changedstuff.push(cheat.call(this, "w3"));
    changedstuff.push(cheat.call(this, "w4"));
    changedstuff.push(cheat.call(this, "w5"));
    changedstuff.push(cheat.call(this, "w6"));

    return changedstuff.join("\n"); // Tell the user how many things have happened through this singular command xD
  },
  "nullifies a lot of things, use with caution!"
);

// Don't use unless needed: This function exists to wipe certain stuff from your already broken account!
registerCheat(
  "fix_save",
  function (params) {
    cheatConfig.fixobj = bEngine.getGameAttribute(params[0]);
    return "Saved";
  },
  "Save a game attribute to memory. Use fix_write to write it back to the game."
);

registerCheat(
  "fix_write",
  function (params) {
    bEngine.setGameAttribute(params[0], cheatConfig.fixobj);
    return "Writen";
  },
  "Write a game attribute from memory to the game. Use fix_save to save it to memory."
);

// A highly dangerous function that lets you manually change in-game variables, like:
// > chng bEngine.getGameAttribute("QuestComplete").h["Secretkeeper1"]=1
registerCheat(
  "chng",
  function (params) {
    if (!cheatConfig.chng_enabled) {
      return 'chng command is currently disabled in config.js Enable it ONLY if you know what you are doing.';
    }

    try {
      eval(params[0]);
      return `${params[0]}`;
    } catch (error) {
      return `Error: ${error}`;
    }
  },
  "!danger! Execute arbitrary code. Caution advised. Consider chromedebug instead"
);

/****************************************************************************************************
  A proxy setup and all Proxy definitions
*/
async function setup() {
  if (setupDone) return "Cheat setup complete";
  console.log('Entering setup function...'); // Added for diagnostics
  setupDone = true;

  // Retry finding the iframe for up to 10 seconds
  let iframeRetryCount = 0;
  const maxRetries = 20; // 20 * 500ms = 10 seconds
  while (!iframe && iframeRetryCount < maxRetries) {
    iframe = window.document.querySelector("iframe")?.contentWindow;
    if (!iframe) {
      iframeRetryCount++;
      console.log(`Iframe not found, retrying... (${iframeRetryCount}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
    }
  }

  if (!iframe) {
    console.error(`CRITICAL ERROR: Could not find the game iframe after ${maxRetries} retries.`);
    throw new Error(`Could not find the game iframe after ${maxRetries} retries.`);
  }
  console.log("Iframe found successfully.");


  try { // Added try block for detailed error catching within setup
    await gameReady.call(this);

    // setup firebase proxy which is needed,
    // if we go into the character selection screen, 
    // since that breaks a lot of proxies
    setupFirebaseProxy.call(this);
    // wrapped all the proxies in a function to make it easier to recall them
    setupAllProxies.call(this);

    // This stops the steamachieve34/35 bug. This function is in steam.js.
    // The name is generated so it may well change between versions and need updating here
    // changed for a solution not relying on the name.
    // this still crashes after a while playing the game 24.11.2025
    window[0].agIis = function () { };
    // window[0].agIis = new Proxy(window[0].agIis, {
    //   apply: function (target, thisArg, argumentsList) {
    //     const n = argumentsList[0];
    //     console.log(`agIis called with n: ${n}`);
    //     return Reflect.apply(target, thisArg, argumentsList);
    //   },
    // });

    console.log('Registering "cheats" command...'); // Added for diagnostics
    registerCheat(
      "cheats",
      function (params) {
        let cheatsAvailable = [];
        Object.keys(cheats).forEach((cheat) => {
          cheatsAvailable.push(cheat + (cheats[cheat]["message"] ? ` (${cheats[cheat].message})` : ""));
        });
        return cheatsAvailable.join("\n");
      },
      "list available cheats"
    );

    console.log('Registering "list" command group...'); // Added for diagnostics
    registerCheats({
      name: "list",
      message: "list something. third param optional filter",
      subcheats: [
        {
          name: "bundle",
          message: "list bundles. third param optional filter",
          fn: listFunction,
        },
        {
          name: "missing_bundle",
          message: "list missing bundles",
          fn: listFunction,
        },
        {
          name: "item",
          message: "list items. third param optional filter",
          fn: listFunction,
        },
        {
          name: "monster",
          message: "list monsters. third param optional filter",
          fn: listFunction,
        },
        {
          name: "class",
          message: "list classes. third param optional filter",
          fn: listFunction,
        },
        {
          name: "card",
          message: "list classes. third param optional filter",
          fn: listFunction,
        },
        {
          name: "quest",
          message: "list quests. third param optional filter",
          fn: listFunction,
        },
        {
          name: "map",
          message: "list maps. third param optional filter",
          fn: listFunction,
        },
        {
          name: "talent",
          message: "list talents. third param optional filter",
          fn: listFunction,
        },
        {
          name: "ability",
          message: "list abilities. third param optional filter",
          fn: listFunction,
        },
        {
          name: "smith",
          message: "list smithing recipes. third param optional filter",
          fn: listFunction,
        },
        {
          name: "gga",
          message: "list game attributes. third param optional filter",
          fn: listFunction,
        },
      ],
    });


    let rtn = [];
    rtn.push("--------------------");
    rtn = rtn.concat(runStartupCheats.call(this));
    rtn.push("Cheat setup complete");
    rtn.push("--------------------");
    rtn.push("Hit enter to list available cheats");
    rtn.push(
      "Cheats will find as you type, so if you're looking for eg gem cheats, or an item just type it and see what comes up"
    );
    rtn.push("--------------------");
    console.log('Exiting setup function successfully.'); // Added for diagnostics
    return rtn.join("\n");

  } catch (setupError) { // Added catch block
    console.error("Error occurred during setup function:", setupError.stack || setupError);
    // Optionally re-throw or return an error indicator if needed downstream
    return "Error during cheat setup."; // Return specific error message
  }
}

// run startup cheats
function runStartupCheats() {
  let rtn = [];
  startupCheats.forEach((c) => {
    rtn.push(cheat.call(this, c));
  }, this);
  return rtn;
}

function setupAllProxies() {
  setupArcadeProxies.call(this);
  setupBetterCogsProxy.call(this);
  setupTimeCandyProxy.call(this);
  setupCurrenciesOwnedProxy.call(this);
  setupArbitraryProxy.call(this);
  setupStampCostProxy.call(this);
  setupAFKRateProxy.call(this);
  setupAlchProxy.call(this);
  setupw1StuffProxy.call(this);
  setupw2StuffProxy.call(this);
  setupw3StuffProxy.call(this);
  setupw4StuffProxy.call(this);
  setupOptionsListAccountProxy.call(this);
  setupCListProxy.call(this);
  setupQuestProxy.call(this);
  setupSmithProxy.call(this);
  setupAbilityProxy.call(this);
  setupValuesMapProxy.call(this);
  setupCloudSaveProxy.call(this);
  setupBehaviorScriptProxies.call(this);
  setupItemMoveProxy.call(this);
  setupItemsMenuProxy.call(this);
  setupTrappingProxy.call(this);
  setupTalentProxy.call(this);
  setupw5Proxies.call(this);
  setupw6Proxies.call(this);
  setupw7Proxies.call(this);
  setupItemMiscProxy.call(this);
  setupMiscProxies.call(this);
  setupPlayerLoadProxy.call(this);
  setupAutoLootProxy.call(this);
  setupMonsterKillProxy.call(this);
  setupMonsterProxy.call(this);
  setupHPProxy.call(this);
  setupNodmgProxy.call(this);
  setupCreateElementProxy.call(iframe);
}

// with this proxy we catch the play button and recall the requested proxy functions
// this is a fix for the cheats not working after going into the character selection screen
// my guess is why the cheats fail after going into the character selection screen is because 
// the game reloads the specific list, etc. and the proxies are not set up again
function setupFirebaseProxy() {
  if (this["FirebaseStorage"] && this["FirebaseStorage"].playButton) {
    this["FirebaseStorage"].playButton = new Proxy(this["FirebaseStorage"].playButton, {
      apply: (target, thisArg, argumentsList) => {
        const result = Reflect.apply(target, thisArg, argumentsList);

        // Register common variables again to make sure they are set up again
        registerCommonVariables.call(this);
        // Recall proxies to make sure they are set up again
        // current trend is stuff that is reloaded by the game like clist, itemdef, etc.
        // not sure why the game reloads these. possible to deactivate the reload?
        setupCListProxy.call(this);
        setupOptionsListAccountProxy.call(this);
        setupTrappingProxy.call(this);
        setupTimeCandyProxy.call(this);
        return result;
      },
    });
  }
}


function setupBehaviorScriptProxies() {
  // Proxy:
  behavior.randomFloatBetween = new Proxy(behavior.randomFloatBetween, {
    apply: function (originalFn, context, argumentsList) {
      if (cheatState["rng"] === "high") return argumentsList[1];
      if (cheatState["rng"] === "low") return argumentsList[0];
      if (cheatState["rng"]) return cheatState["rng"];
      return Reflect.apply(originalFn, context, argumentsList);
    },
  });

  behavior.randomInt = new Proxy(behavior.randomInt, {
    apply: function (originalFn, context, argumentsList) {
      // sorry for this its super ugly but the only thing i can mangage the better cogs :/
      // now able to give an array with multiple values that gets executed.
      // Not used for the cogs atm still i dont know how it works.
      if (Array.isArray(cheatState["rngInt"]) && cheatState["rngInt"].length > 0) {

        const value = cheatState["rngInt"][0];
        cheatState["rngInt"].shift();
        if (cheatState["rngInt"].length <= 0) cheatState["rngInt"] = value;

        if (value === "high") return argumentsList[1];
        if (value === "low") return argumentsList[0];
        return value; // If it's a numeric value
      } else if (cheatState["rngInt"] === "high") {
        return argumentsList[1];
      } else if (cheatState["rngInt"] === "low") {
        return argumentsList[0];
      } else if (cheatState["rngInt"]) {
        return cheatState["rngInt"];
      }
      return Reflect.apply(originalFn, context, argumentsList);
    },
  });

  behavior.randomFloat = new Proxy(behavior.randomFloat, {
    apply: function (originalFn, context, argumentsList) {
      if (cheatState["rngF"] === "high") return 1.0;
      if (cheatState["rngF"] === "low") return 0.0;
      if (cheatState["rngF"]) return cheatState["rngF"];
      return Reflect.apply(originalFn, context, argumentsList);
    },
  });

  // Proxy:
  behavior.runLater = new Proxy(behavior.runLater, {
    apply: function (originalFn, context, argumentsList) {
      try {
        if (
          cheatState.godlike.intervention &&
          argumentsList[0] == 2400 &&
          argumentsList[2]["behaviors"]["behaviors"][0]["name"] == "ActorEvents_481"
        ) {
          argumentsList[0] = 0;
        }
      } catch (e) { }

      Reflect.apply(originalFn, context, argumentsList);
    },
  });


  behavior.runPeriodically = new Proxy(behavior.runPeriodically, {
    apply: function (originalFn, context, argumentsList) {
      try {
        if (
          cheatState.godlike.poison &&
          argumentsList[0] == 2e3 &&
          argumentsList[2]["behaviors"]["behaviors"][0]["name"] == "ActorEvents_575"
        ) {
          argumentsList[0] = 5;
        }
      } catch (e) { }

      Reflect.apply(originalFn, context, argumentsList);
    },
  });
}

function setupAutoLootProxy() {
  const actorEvents44 = events(44);
  const actorEvents345 = events(345);

  // Proxy:
  actorEvents44.prototype.init = new Proxy(actorEvents44.prototype.init, {
    apply: function (originalFn, context, argumentsList) {
      let rtn = Reflect.apply(originalFn, context, argumentsList);
      if (
        cheatState.wide.autoloot &&
        bEngine.getGameAttribute("OptionsListAccount")[83] == 0 &&
        context._BlockAutoLoot === 0 &&
        context._DungItemStatus === 0 &&
        context._PlayerDroppedItem === 0 &&
        actorEvents345._customBlock_Dungon() === -1 &&
        itemDefs[context._DropType] &&
        (/.*(LOG|ORE|LEAF|FISH|BUG|CRITTER|SOUL|FOOD|STATUE|TELEPORT|FISHING_ACCESSORY|OFFICE_PEN|BOSS_KEY|FRAGMENT|UPGRADE|MONSTER_DROP|MATERIAL|CARD).*/i.test(
          itemDefs[context._DropType].h.Type
        ) ||
          ["COIN", "Quest22", "Quest23", "Quest24"].includes(context._DropType))
      ) {
        context._CollectedStatus = 0;
        bEngine.gameAttributes.h.DummyNumber4 = 23.34;
        context._customEvent_ItemPickupInTheFirstPlace();
        if (context._DropType == "COIN" || context._DropType.substring(0, 5) == "Cards") {
          cheatConfig.wide.autoloot.tochest && context._DropType == "COIN"
            ? (bEngine.gameAttributes.h.MoneyBANK =
              bEngine.getGameAttribute("MoneyBANK") + context._DropAmount)
            : (bEngine.gameAttributes.h.Money =
              bEngine.getGameAttribute("Money") + context._DropAmount);
          context._ImageInst = null;
          behavior.recycleActor(context.actor);
          return;
        }
        if (cheatConfig.wide.autoloot.tochest) {
          let chestSlot =
            bEngine.getGameAttribute("ChestOrder").indexOf(context._DropType) != -1
              ? bEngine.getGameAttribute("ChestOrder").indexOf(context._DropType)
              : bEngine.getGameAttribute("ChestOrder").indexOf("Blank");
          if (bEngine.getGameAttribute("ChestOrder")[chestSlot] == "Blank")
            bEngine.getGameAttribute("ChestOrder")[chestSlot] = context._DropType;
          let inventorySlot = bEngine.getGameAttribute("InventoryOrder").indexOf(context._DropType);
          while (chestSlot !== -1 && inventorySlot !== -1) {
            bEngine.getGameAttribute("ChestQuantity")[chestSlot] +=
              bEngine.getGameAttribute("ItemQuantity")[inventorySlot];
            bEngine.getGameAttribute("ItemQuantity")[inventorySlot] = 0;
            bEngine.getGameAttribute("InventoryOrder")[inventorySlot] = "Blank";
            inventorySlot = bEngine.getGameAttribute("InventoryOrder").indexOf(context._DropType);
          }
          bEngine.getGameAttribute("ChestQuantity")[chestSlot] += context._DropAmount;
          context._DropAmount = 0;
        }
        if (context._DropAmount == 0) {
          context._ImageInst = null;
          behavior.recycleActor(context.actor);
        } else {
          context._CollectedStatus = 0;
        }
      }
      return rtn;
    },
  });

  // Proxy:
  const hxOverrides = this["HxOverrides"];
  events(34).prototype._event_ItemGet = new Proxy(events(34).prototype._event_ItemGet, {
    apply: function (originalFn, context, argumentsList) {
      return cheatState.wide.autoloot &&
        cheatConfig.wide.autoloot.hidenotifications &&
        [0, 1].includes(context._Deployment)
        ? (hxOverrides.remove(bEngine.getGameAttribute("ItemGetPixelQueue"), context.actor),
          behavior.recycleActor(context.actor))
        : Reflect.apply(originalFn, context, argumentsList);
    },
  });

}

function setupCreateElementProxy() {
  this.React.createElement = new Proxy(this.React.createElement, {
    apply: function (originalFn, context, argumentsList) {
      if (cheatState.w1.companion && argumentsList[0].includes("Companion")) {
        if (["deleteCompanion", "swapCompanionOrder"].includes(argumentsList[0]))
          return new Promise((resolve) => resolve(1));
        if (argumentsList[0] == "setCompanionFollower") {
          cheatConfig.w1.companion.current = string(argumentsList[1]);
        }
        if (argumentsList[0] == "getCompanionInfoMe") {
          if (!cheatConfig.w1.companion.companions) return Array.from({ length: CList.CompanionDB.length }, (_, i) => i);
          let companions = cheatConfig.w1.companion.companions
          if (typeof companions == "function") {
            return companions()
          }
          return companions;
        }
        if (argumentsList[0] == "getCurrentCompanion") {
          return cheatConfig.w1.companion.current;
        }
        // return true;
        return Reflect.apply(originalFn, context, argumentsList);
      }

      if (cheatConfig.unban && argumentsList[0] == "cleanMarkedFiles") {
        return;
      }

      if (cheatState.wide.autoparty && argumentsList[0] == "getPartyMembers") {
        let resp = Reflect.apply(originalFn, context, argumentsList);
        if (resp.length > 0 && resp.length < 10) {
          let playersToAdd = 11 - resp.length;
          let names = Object.keys(bEngine.gameAttributes.h.OtherPlayers.h).slice(1, playersToAdd);
          names.forEach(function (name) {
            resp.push([name, resp[0][1], 0]);
          });
        }
        return resp;
      }

      let resp = Reflect.apply(originalFn, context, argumentsList);
      return resp;
    },
  });
}

function setupBetterCogsProxy() {
  events(481).prototype._customEvent_WorkbenchStuff2 = new Proxy(events(481).prototype._customEvent_WorkbenchStuff2, {
    apply: function (originalFn, context, argumentsList) {
      try {
        if (cheatState.w3.bettercog && -1 != context._TRIGGEREDtext.indexOf("k")) {
          cheatState["rng"] = "high";
          // cheatState["rngInt"] = ["high", "high", "low", "high"]; // does not work like i thought
          let rtn = Reflect.apply(originalFn, context, argumentsList);
          cheatState["rng"] = false;
          // cheatState["rngInt"] = false;
          return rtn;
        }
      } catch (e) {
        console.error("Error in Better Cogs Proxy:", e);
      }
      return Reflect.apply(originalFn, context, argumentsList);
    },
  });
}

// Proxy for Mystery Stones always hitting the Misc stat if possible.
function setupItemMiscProxy() {
  events(38).prototype._event_InventoryItem = new Proxy(events(38).prototype._event_InventoryItem, {
    apply: function (originalFn, context, argumentsList) {
      const inventoryOrder = bEngine.getGameAttribute("InventoryOrder");
      try {
        if (
          cheatState.upstones.misc &&
          itemDefs[inventoryOrder[context.actor.getValue("ActorEvents_38", "_ItemDragID")]].h
            .typeGen == "dStone" &&
          itemDefs[
            inventoryOrder[context.actor.getValue("ActorEvents_38", "_ItemDragID")]
          ].h.Effect.startsWith("Mystery_Stat")
        ) {
          cheatState["rng"] = 0.85; // First random roll for Misc stat.
          cheatState["rngInt"] = "high"; // 2nd random roll for positive value.
          let rtn = Reflect.apply(originalFn, context, argumentsList);
          cheatState["rng"] = false;
          cheatState["rngInt"] = false;
          return rtn;
        }
      } catch (e) {
        console.error("Error in _event_InventoryItem proxy:", e);
      }
      return Reflect.apply(originalFn, context, argumentsList);
    },
  });
}

function setupTimeCandyProxy() {
  const timeCandy = itemDefs["Timecandy1"].h;
  const originalID = timeCandy["ID"];

  Object.defineProperty(timeCandy, "ID", {
    get: function () {
      if (cheatState.wide.candytime) {
        const configuredValue = cheatConfig.wide.candytime;
        return !isNaN(configuredValue) ? configuredValue : 600;
      }
      return originalID;
    },
    enumerable: true,
    configurable: true
  });
}

function setupNodmgProxy() {
  const cRA = behavior.createRecycledActor;
  behavior.createRecycledActor = function (id, ...args) {
    if (cheatState.wide.nodmg) {
      if (typeof id === "object") {
        if (id.ID === 10) return null;
      }
    }
    return cRA.apply(this, arguments);
  };
}

function setupItemMoveProxy() {
  events(38).prototype._event_InvItem4custom = new Proxy(
    events(38).prototype._event_InvItem4custom,
    {
      apply: function (originalFn, context, argumentsList) {
        const inventoryOrder = bEngine.getGameAttribute("InventoryOrder");
        try {
          if (
            cheatState.wide.candy &&
            itemDefs[inventoryOrder[context.actor.getValue("ActorEvents_38", "_ItemDragID")]].h
              .Type == "TIME_CANDY"
          ) {
            let originalMap = bEngine.getGameAttribute("CurrentMap");
            let originalTarget = bEngine.getGameAttribute("AFKtarget");
            bEngine
              .getGameAttribute("PixelHelperActor")[23]
              .getValue("ActorEvents_577", "_GenINFO")[86] = 1;
            if (originalTarget == "Cooking" || originalTarget == "Laboratory") {
              let newTarget = {
                calls: 0,
                [Symbol.toPrimitive](hint) {
                  if (this.calls < 2) {
                    this.calls = this.calls + 1;
                    return "mushG";
                  }
                  bEngine.setGameAttribute("AFKtarget", originalTarget);
                  return originalTarget;
                },
              };

              bEngine.setGameAttribute("AFKtarget", newTarget);
            }
            bEngine.setGameAttribute("CurrentMap", 1);
            let rtn = Reflect.apply(originalFn, context, argumentsList);
            bEngine.setGameAttribute("CurrentMap", originalMap);
            bEngine.setGameAttribute("AFKtarget", originalTarget);
            return rtn;
          }
        } catch (e) { }
        try {
          if (
            cheatState.unlock.divinitypearl &&
            context.actor.getValue("ActorEvents_38", "_PixelType") == 2 &&
            context.actor.getValue("ActorEvents_38", "_DummyType2Dead") == 7 &&
            inventoryOrder[context.actor.getValue("ActorEvents_38", "_ItemDragID")] == "Pearl6"
          ) {
            let calls = 0;
            const levels = bEngine.gameAttributes.h["Lv0"];
            bEngine.gameAttributes.h["Lv0"] = new Proxy(levels, {
              get: function (target, name) {
                if (name == bEngine.getGameAttribute("DummyNumber3") && calls < 2) {
                  calls = calls + 1;
                  if (calls == 2) {
                    bEngine.gameAttributes.h["Lv0"] = levels;
                  }
                  return 1;
                }
                return target[name];
              },
            });
            // bEngine.gameAttributes.h["Lv0"] = levels; why is that here? Caused the bug no be able to use it. Since it reverts the proxy?
            return Reflect.apply(argumentsList[0], context, []);
          }
        } catch (e) { }
        return Reflect.apply(originalFn, context, argumentsList);
      },
    }
  );
}

function setupMonsterProxy() {
  bEngine.setGameAttribute(
    "MonsterRespawnTime",
    new Proxy(bEngine.getGameAttribute("MonsterRespawnTime"), {
      set: function (obj, prop, value) {
        return (obj[prop] = cheatState.godlike.respawn
          ? cheatConfig.godlike.respawn(value)
          : value);
      },
    })
  );

  behavior.getValueForScene = new Proxy(behavior.getValueForScene, {
    apply: function (originalFn, context, argumentsList) {
      if (cheatState.multiply.monsters && argumentsList[1] === "_NumberOfEnemies") {
        return Reflect.apply(originalFn, context, argumentsList) * cheatConfig.multiply.monsters;
      }
      return Reflect.apply(originalFn, context, argumentsList);
    },
  });
}

function setupItemsMenuProxy() {
  events(312).prototype._event_resetTalPresets = new Proxy(
    events(312).prototype._event_resetTalPresets,
    {
      apply: function (originalFn, context, argumentsList) {
        if (cheatState.unlock.presets) {
          let originalMap = bEngine.getGameAttribute("CurrentMap");
          bEngine.setGameAttribute("CurrentMap", 0);
          Reflect.apply(originalFn, context, argumentsList);
          bEngine.setGameAttribute("CurrentMap", originalMap);
          return;
        }
        return Reflect.apply(originalFn, context, argumentsList);
      },
    }
  );
}

// Unlock quick references
function setupOptionsListAccountProxy() {
  // Using defineProperties instead of Proxy
  const optionsListAccount = bEngine.getGameAttribute("OptionsListAccount");
  optionsListAccount._26 = optionsListAccount[26];
  Object.defineProperty(optionsListAccount, 26, {
    get: function () {
      if (cheatConfig.unban) return 0;
      return this._26;
    },
    set: function (value) {
      if (cheatConfig.unban) return true;
      this._26 = value;
      return true;
    },
    enumerable: true,
  });
  optionsListAccount._29 = optionsListAccount[29];
  Object.defineProperty(optionsListAccount, 29, {
    get: function () {
      if (cheatState.wide.eventitems) return 0;
      return this._29;
    },
    set: function (value) {
      if (cheatState.wide.eventitems) return true;
      this._29 = value;
      return true;
    },
    enumerable: true,
  });

  optionsListAccount._33 = optionsListAccount[33];
  Object.defineProperty(optionsListAccount, 33, {
    get: function () {
      if (cheatState.minigames) return 1;
      return this._33;
    },
    set: function (value) {
      if (cheatState.minigames) return true;
      this._33 = value;
      return true;
    },
    enumerable: true,
  });
  optionsListAccount._34 = optionsListAccount[34];
  Object.defineProperty(optionsListAccount, 34, {
    get: function () {
      if (cheatState.unlock.quickref) return 0;
      return this._34;
    },
    set: function (value) {
      if (cheatState.unlock.quickref) return true;
      this._34 = value;
      return true;
    },
    enumerable: true,
  });
  optionsListAccount._71 = optionsListAccount[71];
  Object.defineProperty(optionsListAccount, 71, {
    get: function () {
      return this._71;
    },
    set: function (value) {
      value = Math.min(cheatConfig.dungeon.creditcap, value);
      this._71 = value;
      return true;
    },
    enumerable: true,
  });
  optionsListAccount._72 = optionsListAccount[72];
  Object.defineProperty(optionsListAccount, 72, {
    get: function () {
      return this._72;
    },
    set: function (value) {
      value = Math.min(cheatConfig.dungeon.creditcap, value);
      this._72 = value;
      return true;
    },
    enumerable: true,
  });
  optionsListAccount._73 = optionsListAccount[73];
  Object.defineProperty(optionsListAccount, 73, {
    get: function () {
      return this._73;
    },
    set: function (value) {
      value = Math.min(cheatConfig.dungeon.flurbocap, value);
      this._73 = value;
      return true;
    },
    enumerable: true,
  });
  optionsListAccount._100 = optionsListAccount[100];
  Object.defineProperty(optionsListAccount, 100, {
    get: function () {
      if (cheatState.w4.spiceclaim) return 0;
      return this._100;
    },
    set: function (value) {
      if (cheatState.w4.spiceclaim) return true;
      this._100 = value;
      return true;
    },
    enumerable: true,
  });
  optionsListAccount._169 = optionsListAccount[169];
  Object.defineProperty(optionsListAccount, 169, {
    get: function () {
      if (cheatState.unlock.islands) return cheatConfig.unlock.islands;
      return this._169;
    },
    set: function (value) {
      if (cheatState.unlock.islands) return true;
      this._169 = value;
      return true;
    },
    enumerable: true,
  });
  optionsListAccount._185 = optionsListAccount[185];
  Object.defineProperty(optionsListAccount, 185, {
    get: function () {
      if (cheatState.w2.boss && this._185 == 10) this._185 = 0;
      return this._185;
    },
    set: function (value) {
      this._185 = value;
      return true;
    },
    enumerable: true,
  });

  // event spins
  optionsListAccount._325 = optionsListAccount[325];
  Object.defineProperty(optionsListAccount, 325, {
    get: function () {
      if (cheatState.wide.eventspins) this._325 = 10;
      return this._325;
    },
    set: function (value) {
      this._325 = value;
      return true;
    },
    enumerable: true,
  });

  // unlimited emperor runs 
  optionsListAccount._370 = optionsListAccount[370];
  Object.defineProperty(optionsListAccount, 370, {
    get: function () {
      if (cheatState.w6.emperor) this._370 = -10;
      return this._370;
    },
    set: function (value) {
      this._370 = value;
      return true;
    },
    enumerable: true,
  });

  // unlimited jeweled cogs
  optionsListAccount._414 = optionsListAccount[414];
  Object.defineProperty(optionsListAccount, 414, {
    get: function () {
      if (cheatState.w3.jeweledcogs) this._414 = 0;
      return this._414;
    },
    set: function (value) {
      this._414 = value;
      return true;
    },
    enumerable: true,
  });
}

// Free revival cheat
function setupValuesMapProxy() {
  const personalValuesMap = bEngine.getGameAttribute("PersonalValuesMap").h;

  personalValuesMap._InstaRevives = personalValuesMap.InstaRevives;
  Object.defineProperty(personalValuesMap, "InstaRevives", {
    get: function () {
      if (cheatState.unlock.revive) return 10;
      return this._InstaRevives;
    },
    set: function (value) {
      if (cheatState.unlock.revive) return true;
      this._InstaRevives = value;
      return true;
    },
    enumerable: true,
  });
}

// Stop cloud saving, once re-enabled it'll proc a save in 2 seconds.
function setupCloudSaveProxy() {
  const CloudSave = bEngine.getGameAttribute("CloudSaveCD");
  const handler = {
    get: function (obj, prop) {
      if (cheatState.cloudz && Number(prop) === 0) return 235;
      return Reflect.get(...arguments);
    },
    set: function (obj, prop, value) {
      if (cheatState.cloudz && Number(prop) === 0) {
        obj[0] = 235;
        return true;
      }
      return Reflect.set(...arguments);
    },
  };
  const proxy = new Proxy(CloudSave, handler);
  bEngine.setGameAttribute("CloudSaveCD", proxy);
}

// Some more stats, as well as a forge upgrade within this one
function setupArbitraryProxy() {
  const ActorEvents12 = events(12);

  // 100% crit chance
  const CritChance = ActorEvents12._customBlock_CritChance;
  ActorEvents12._customBlock_CritChance = function (...argumentsList) {
    if (cheatState.godlike.crit) return 100;
    return Reflect.apply(CritChance, this, argumentsList);
  };

  // Reach to 230
  const atkReach = ActorEvents12._customBlock_PlayerReach;
  ActorEvents12._customBlock_PlayerReach = function (...argumentsList) {
    if (cheatState.godlike.reach) return 666;
    return Reflect.apply(atkReach, this, argumentsList);
  };

  // Forge stat multipliers (speed & capacity)
  const ForgeStats = ActorEvents12._customBlock_ForgeStats;
  ActorEvents12._customBlock_ForgeStats = function (...argumentsList) {
    const key = argumentsList[0];
    const base = Reflect.apply(ForgeStats, this, argumentsList);

    if (!cheatState.w1.forge || !cheatConfig.w1 || !cheatConfig.w1.forge) return base;

    // 2 = forge speed (used by ForgeSpeeed)
    if (key === 2 && typeof cheatConfig.w1.forge.speed === "function") {
      return cheatConfig.w1.forge.speed(base);
    }

    // 1 = forge capacity (branch with ForgeCap stamp / furnace levels)
    if (key === 1 && typeof cheatConfig.w1.forge.capacity === "function") {
      return cheatConfig.w1.forge.capacity(base);
    }

    return base;
  };


  // Imperfect damage cap on too-OP broken players with overflowing damage
  const DamageDealt = ActorEvents12._customBlock_DamageDealed;
  ActorEvents12._customBlock_DamageDealed = function (...argumentsList) {
    return cheatState.multiply.damage && argumentsList[0] == "Max"
      ? DamageDealt(...argumentsList) * cheatConfig.multiply.damage
      : DamageDealt(...argumentsList);
  };

  // Skill stats
  const SkillStats = ActorEvents12._customBlock_SkillStats;
  ActorEvents12._customBlock_SkillStats = function (...argumentsList) {
    const t = argumentsList[0];

    // Global skill EXP multiplier
    if (cheatState.multiply.skillexp && t === "AllSkillxpMULTI") {
      return Reflect.apply(SkillStats, this, argumentsList) * cheatConfig.multiply.skillexp;
    }

    // Worship speed (config-driven)
    if (cheatState.w3.worshipspeed && cheatConfig.w3.hasOwnProperty(t)) {
      return cheatConfig.w3[t](Reflect.apply(SkillStats, this, argumentsList));
    }

    // Skill efficiency multiplier
    if (cheatState.multiply.efficiency && t.includes("Efficiency")) {
      return Reflect.apply(SkillStats, this, argumentsList) * cheatConfig.multiply.efficiency;
    }

    return Reflect.apply(SkillStats, this, argumentsList);
  };

  const Arbitrary = ActorEvents12._customBlock_ArbitraryCode;
  ActorEvents12._customBlock_ArbitraryCode = function (...argumentsList) {
    const t = argumentsList[0];

    // Coin drop multiplier (MonsterCash)
    if (cheatState.multiply.money && t === "MonsterCash") {
      return Reflect.apply(Arbitrary, this, argumentsList) * cheatConfig.multiply.money;
    }

    // Crystal spawn multiplier
    if (t === "CrystalSpawn") {
      const base = Reflect.apply(Arbitrary, this, argumentsList);
      if (cheatState.multiply.crystal) return base * cheatConfig.multiply.crystal;
      return base;
    }

    // Existing cheats
    if (t === "GiantMob" && cheatState.wide.giant) return 1;
    if (t === "FoodNOTconsume" && cheatState.godlike.food) return 100;
    if (t === "HitChancePCT" && cheatState.godlike.hitchance) return 100;

    return Reflect.apply(Arbitrary, this, argumentsList);
  };


  // ShopQtyBonus multiplier via RunCodeOfTypeXforThingY 
  const RunCodeOfTypeXforThingY = ActorEvents12._customBlock_RunCodeOfTypeXforThingY;
  ActorEvents12._customBlock_RunCodeOfTypeXforThingY = function (...argumentsList) {
    const codeType = argumentsList[0];

    if (cheatState.multiply.shopstock && codeType === "ShopQtyBonus") {
      const base = Reflect.apply(RunCodeOfTypeXforThingY, this, argumentsList);
      return base * cheatConfig.multiply.shopstock;
    }

    return Reflect.apply(RunCodeOfTypeXforThingY, this, argumentsList);
  };



  const TotalStats = ActorEvents12._customBlock_TotalStats;
  ActorEvents12._customBlock_TotalStats = (...argumentsList) => {
    return (
      Reflect.apply(TotalStats, this, argumentsList) *
      (cheatState.multiply.drop && argumentsList[0] == "Drop_Rarity"
        ? cheatConfig.multiply.drop
        : 1)
    );
  };

  const generateMonsterDrops = ActorEvents12._customBlock_GenerateMonsterDrops;
  ActorEvents12._customBlock_GenerateMonsterDrops = function (...argumentsList) {
    let drops = Reflect.apply(generateMonsterDrops, this, argumentsList);
    // filter out drops where drop[0] matches any regex in itemsNotToDrop
    drops = drops.filter((drop) => !cheatConfig.nomore.items.some((regex) => regex.test(drop[0])));

    return drops;
  };

  const ExpMulti = ActorEvents12._customBlock_ExpMulti;
  ActorEvents12._customBlock_ExpMulti = function (...argumentsList) {
    const mode = argumentsList[0];
    const base = Reflect.apply(ExpMulti, this, argumentsList);

    // e == 0 is the main class EXP path
    return cheatState.multiply.classexp && mode === 0
      ? base * cheatConfig.multiply.classexp
      : base;
  };
}
// A bunch of currency related cheats
function setupCurrenciesOwnedProxy() {
  const currencies = bEngine.getGameAttribute("CurrenciesOwned").h;
  const handler = {
    get: function (obj, prop) {
      if (cheatState.unlock.teleports && prop === "WorldTeleports") return obj.WorldTeleports || 1;
      if (cheatState.unlock.tickets && prop === "ColosseumTickets")
        return obj.ColosseumTickets || 1;
      if (cheatState.unlock.obolfrag && prop === "ObolFragments") return obj.ObolFragments || 9001; // It's over nine thousand
      if (cheatState.unlock.silvpen && prop === "SilverPens") return obj.SilverPens || 1;
      return obj[prop];
    },
    set: function (obj, prop, value) {
      if (cheatState.unlock.teleports && prop === "WorldTeleports") return true; // Do nothing
      if (cheatState.unlock.tickets && prop === "ColosseumTickets") {
        if (obj.ColosseumTickets < value) obj.ColosseumTickets = value;
        return true;
      }
      if (cheatState.unlock.silvpen && prop === "SilverPens") {
        if (obj.SilverPens < value) obj.SilverPens = value;
        return true;
      }
      if (cheatState.unlock.obolfrag && prop === "ObolFragments") {
        if (obj.ObolFragments < value) obj.ObolFragments = value;
        return true;
      }
      return (obj[prop] = value);
    },
  };
  const proxy = new Proxy(currencies, handler);
  bEngine.getGameAttribute("CurrenciesOwned").h = proxy;
}

// Stamp upgrade cost reduction
function setupStampCostProxy() {
  events(124)._customBlock_StampCostss = new Proxy(events(124)._customBlock_StampCostss, {
    apply: function (originalFn, context, argumentsList) {
      if (!cheatState.w1.stampcost)
        return Reflect.apply(originalFn, context, argumentsList);

      const result = Reflect.apply(originalFn, context, argumentsList);
      const currency = result[0];
      const cost = result[1];

      return [currency, cheatConfig.w1.stampcost(cost)];
    },
  });
}

function setupAFKRateProxy() {
  events(124)._customBlock_AFKgainrates = new Proxy(events(124)._customBlock_AFKgainrates, {
    apply: (originalFn, context, argumentsList) => {
      if (cheatState.multiply.afk)
        return Reflect.apply(originalFn, context, argumentsList) * cheatConfig.multiply.afk;
      return Reflect.apply(originalFn, context, argumentsList);
    },
  });
}

function setupPlayerLoadProxy() {
  loadPlayerInfo = events(124)._customBlock_LoadPlayerInfo;
  events(124)._customBlock_LoadPlayerInfo = function (...argumentsList) {
    let rtn = Reflect.apply(loadPlayerInfo, this, argumentsList);
    try {
      if (cheatState.wide.perfectobols) rollAllObols();
    } catch (e) {
      console.log(e.toString());
    }
    return rtn;
  };
}

function setupTalentProxy() {
  const getTalentNumber = events(124)._customBlock_GetTalentNumber;
  events(124)._customBlock_GetTalentNumber = (...argumentsList) => {
    return cheatState.talent[argumentsList[1]]
      ? cheatConfig.talent[argumentsList[1]](
        Reflect.apply(getTalentNumber, this, argumentsList),
        argumentsList
      )
      : Reflect.apply(getTalentNumber, this, argumentsList);
  };
}

function setupMonsterKillProxy() {
  const monsterKill = events(124)._customBlock_MonsterKill;
  events(124)._customBlock_MonsterKill = (...argumentsList) => {
    let e = argumentsList[0];
    Reflect.apply(monsterKill, this, argumentsList);
    if (
      cheatState.wide.plunderous &&
      (0 < events(12)._customBlock_GetBuffBonuses(318, 1) ||
        cheatConfig.wide["plunderous"]["allcharacters"]) &&
      bEngine.gameAttributes.h.DummyText3 != "nah" &&
      !bEngine
        .getGameAttribute("CustomLists")
        .h.NonAFKmonsters.includes(e.getValue("ActorEvents_1", "_MonsterType")) &&
      0 == e.getValue("ActorEvents_1", "_TempMonster")
    ) {
      (bEngine.gameAttributes.h.DummyText3 = "PiratePlunderMonster"),
        events(124)._customBlock_CreateMonster(
          `${e.getValue("ActorEvents_1", "_MonsterType")}`,
          behavior.asNumber(e.getValue("ActorEvents_1", "_MonsterNODE")),
          e.getXCenter()
        ),
        events(124)._customBlock_AddStatusToMonster(
          "StatusPlunder",
          behavior.getLastCreatedActor(),
          36e5
        ),
        (bEngine.gameAttributes.h.DummyText3 = "nah");
    }
  };
}

function setupHPProxy() {
  Object.defineProperty(bEngine.gameAttributes.h, "PlayerHP", {
    get: function () {
      return this._PlayerHP;
    },
    set: function (value) {
      return (this._PlayerHP = cheatState.godlike.hp
        ? events(12)._customBlock_PlayerHPmax()
        : value);
    },
  });
}

// new trapping cheat code, uses proxies to modify elapsed time of traps
// we only need to get the database values, since the game is writing those values to the gga
// so the gga values still access the database values
function setupTrappingProxy() {
  const playerDatabase = bEngine.getGameAttribute("PlayerDATABASE").h;
  for (let name in playerDatabase) {
    for (let PldTrap of playerDatabase[name].h.PldTraps) {
      if (!PldTrap) continue;

      let elapsed_time = PldTrap[2];

      Object.defineProperty(PldTrap, 2, {
        get: function () {
          return elapsed_time;
        },

        set: function (value) {
          if (cheatState.w3.trapping) {
            if (value <= 0) {
              elapsed_time = 0;
            } else {
              // debug to see if the cheat is working on afk time.
              // the promise on waiting for the game is rdy was reduced to 0.1 sec, that was needed otherwise the game calculates
              // the elapsed time too fast and the cheat didn't work for afk times.
              // if ((value - elapsed_time) > 1) console.log("added value: ", cheatConfig.w3.trapping(value - elapsed_time));
              elapsed_time = cheatConfig.w3.trapping(value - elapsed_time) + elapsed_time;
            }
          } else {
            elapsed_time = value;
          }
        },
        enumerable: true,
        configurable: true,
      });
    }
  }
}

// Ability tweaking cheat
function setupAbilityProxy() {
  const CustomMaps = this["scripts.CustomMaps"];
  const atkMoveMap = JSON.parse(JSON.stringify(this["scripts.CustomMaps"].atkMoveMap.h));
  for (const [key, value] of Object.entries(atkMoveMap)) {
    value.h["cooldown"] = 0;
    value.h["castTime"] = 0.1;
    value.h["manaCost"] = 0;
    atkMoveMap[key] = value;
  }
  const handler = {
    get: function (obj, prop) {
      if (cheatState.godlike.ability) return atkMoveMap[prop];
      return Reflect.get(...arguments);
    },
  };
  const proxy = new Proxy(CustomMaps.atkMoveMap.h, handler);
  CustomMaps.atkMoveMap.h = proxy;
}
// Nullify smithing cost
function setupSmithProxy() {
  const sizeref = CList.ItemToCraftEXP;
  const tCustomList = this["scripts.CustomLists"];

  const NewReqs = []; // This'll be the new Array where we write our stuff to
  const size = []; // Time to obtain the Array lengths (e.g. amount of items per smithing tab)
  for (const [index, element] of Object.entries(sizeref)) size.push(element.length);
  // Yup we're using double square brackets, cause each item could require multiple materials to craft, while we only need to fill in one
  for (i = 0; i < size.length; i++) NewReqs.push(new Array(size[i]).fill([["Copper", "0"]]));
  const handler = {
    apply: function (originalFn, context, argumentsList) {
      if (cheatState.w1.smith) return NewReqs;
      return Reflect.apply(originalFn, context, argumentsList);
    },
  };
  const proxy = new Proxy(tCustomList["ItemToCraftCostTYPE"], handler);
  tCustomList["ItemToCraftCostTYPE"] = proxy;
}

// see comment on setupCListProxy() not needed with that implementation
// dont delete this function, might revert back to that implementation
// function updateCListFuncDict() {
//   CListFuncDict = {
//     AlchemyVialItemsPCT: new Array(CList.AlchemyVialItemsPCT.length).fill(99), // Vials unlock at rollin 1+
//     SaltLicks: ChangeND(2, "SaltLicks", "0", [2]), // Nullify Saltlick upgrade cost
//     RefineryInfo: ChangeND(2, "RefineryInfo", "0", [6, 7, 8, 9, 10, 11]), // Nullify refinery cost
//     PrayerInfo: ChangeND(2, ChangeND(2, "PrayerInfo", "0", [4, 6]), "None._Even_curses_need_time_off_every_now_and_then.", [2]),
//     MTXinfo: ChangeND(4, ChangeND(4, "MTXinfo", 0, [3, 7]), function (t) { return Math.max(t, cheatConfig.wide.gembuylimit); }, [5]), // Nullify MTX cost
//     // MTXinfo: ChangeND(4, "MTXinfo", 0, [3, 7]), // Nullify MTX cost
//     PostOfficePossibleOrders: ChangeND(4, "PostOfficePossibleOrders", "0", [1]), // Nullify post office order cost
//     GuildGPtasks: ChangeND(2, "GuildGPtasks", "0", [1]), // Nullify guild task requirements
//     TaskDescriptions: ChangeND(3, "TaskDescriptions", "0", [5, 6, 7, 8, 9, 10, 11, 12, 13, 14]), // Nullify task requirements
//     SSignInfoUI: ChangeND(2, "SSignInfoUI", "0", [4]), // Nullify star sign unlock req
//     WorshipBASEinfos: ChangeND(2, "WorshipBASEinfos", 0, [6]), // Nullify worship cost					// Nullify worship cost
//   };
//   return CListFuncDict;
// }

// new implementation like this could cause performance issues, need to evaluate that
// its reevaluated every call instead of having a dict that is precalculated.
// this is just done to have wide mtx and wide gembuylimit separately working.
function setupCListProxy() {
  if (!CListCached) {
    CListCached = deepCopy(CList);
  }

  function defineProxiedProperty(propName, getModifiedValue) {
    Object.defineProperty(CList, propName, {
      get: function () {
        const modified = getModifiedValue.call(this);
        return modified !== undefined ? modified : CListCached[propName];
      },
      enumerable: true,
    });
  }

  // Vials unlock at rollin 1+
  defineProxiedProperty("AlchemyVialItemsPCT", function () {
    if (cheatState.cauldron.vialrng) {
      return new Array(CListCached.AlchemyVialItemsPCT.length).fill(99);
    }
  });

  // Nullify Saltlick upgrade cost
  defineProxiedProperty("SaltLicks", function () {
    if (cheatState.w3.saltlick) {
      return ChangeND(2, deepCopy(CListCached.SaltLicks), "0", [2]);
    }
  });

  // Nullify refinery cost
  defineProxiedProperty("RefineryInfo", function () {
    if (cheatState.w3.refinery) {
      return ChangeND(2, deepCopy(CListCached.RefineryInfo), "0", [6, 7, 8, 9, 10, 11]);
    }
  });

  // Nullify prayer requirements
  defineProxiedProperty("PrayerInfo", function () {
    if (cheatState.w3.prayer) {
      return ChangeND(2, ChangeND(2, deepCopy(CListCached.PrayerInfo), "0", [4, 6]), "None._Even_curses_need_time_off_every_now_and_then.", [2]);
    }
  });

  // Nullify MTX cost / Set gem buy limit
  defineProxiedProperty("MTXinfo", function () {
    if (cheatState.wide.mtx && cheatState.wide.gembuylimit) {
      return ChangeND(4, ChangeND(4, deepCopy(CListCached.MTXinfo), 0, [3, 7]), function (t) { return Math.max(t, cheatConfig.wide.gembuylimit); }, [5]);
    } else if (cheatState.wide.mtx) {
      return ChangeND(4, deepCopy(CListCached.MTXinfo), 0, [3, 7]);
    } else if (cheatState.wide.gembuylimit) {
      return ChangeND(4, deepCopy(CListCached.MTXinfo), function (t) { return Math.max(t, cheatConfig.wide.gembuylimit); }, [5]);
    }
  });

  // Nullify post office order cost
  defineProxiedProperty("PostOfficePossibleOrders", function () {
    if (cheatState.wide.post) {
      return ChangeND(4, deepCopy(CListCached.PostOfficePossibleOrders), "0", [1]);
    }
  });

  // Nullify guild task requirements
  defineProxiedProperty("GuildGPtasks", function () {
    if (cheatState.wide.guild) {
      return ChangeND(2, deepCopy(CListCached.GuildGPtasks), "0", [1]);
    }
  });

  // Nullify task requirements
  defineProxiedProperty("TaskDescriptions", function () {
    if (cheatState.wide.task) {
      return ChangeND(3, deepCopy(CListCached.TaskDescriptions), "0", [5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    }
  });

  // Nullify star sign unlock req
  defineProxiedProperty("SSignInfoUI", function () {
    if (cheatState.wide.star) {
      return ChangeND(2, deepCopy(CListCached.SSignInfoUI), "0", [4]);
    }
  });

  // Nullify worship cost
  defineProxiedProperty("WorshipBASEinfos", function () {
    if (cheatState.w3.freeworship) {
      return ChangeND(2, deepCopy(CListCached.WorshipBASEinfos), 0, [6]);
    }
  });
}

// The proxy that allows us to enable/disable quest item requirement nullifications whenever we like
function setupQuestProxy() {
  const dialogueDefs = this["scripts.DialogueDefinitions"].dialogueDefs.h;
  const dialogueDefsOriginal = JSON.parse(JSON.stringify(dialogueDefs));
  const dialogueDefsUpdated = JSON.parse(JSON.stringify(dialogueDefs));
  for (const [key, value] of Object.entries(dialogueDefsUpdated)) // Go over all the quest-giving NPCs
    for (
      i = 0;
      i < value[1].length;
      i++ // Go over all the addLine elements of that NPC
    )
      // Notice that inside each value (e.g. NPC object), the 1st element is where all numeric stuff reside.
      // The 0th element holds the textual dialogue, which is not what we're looking for
      if (value[1][i].length == 9) {
        // Both addLine_ItemsAndSpaceRequired and addLine_Custom have nine elements within
        // Iterate over an unknown amount of req. values/Arrays
        if (value[1][i][2] === value[1][i][8])
          // This is addLine_Custom
          for (j = 0; j < value[1][i][3].length; j++) {
            dialogueDefsUpdated[key][1][i][3][j][1] = 0;
            dialogueDefsUpdated[key][1][i][3][j][3] = 0;
          }
        else
          for (
            j = 0;
            j < value[1][i][3].length;
            j++ // This is addLine_ItemsAndSpaceRequired
          )
            dialogueDefsUpdated[key][1][i][3][j] = 0;
      }


  for (const [key, value] of Object.entries(dialogueDefsUpdated)) {
    Object.defineProperty(dialogueDefs, key, {
      get: function () {
        return cheatState.wide.quest ? dialogueDefsUpdated[key] : dialogueDefsOriginal[key];
      },
      enumerable: true,
    });
  }
}

// Alchemy cheats
function setupAlchProxy() {
  const p2w = bEngine.getGameAttribute("CauldronP2W");
  p2w[5]._0 = p2w[5][0];
  Object.defineProperty(p2w[5], 0, {
    get: function () {
      return cheatState.cauldron.vialattempt ? this[1] : this._0;
    },
    set(value) {
      return cheatState.cauldron.vialattempt ? true : (this._0 = value), true;
    },
    enumerable: true,
  });

  const Alchemy = events(189)._customBlock_CauldronStats;
  events(189)._customBlock_CauldronStats = function (...argumentList) {
    return cheatState.w2.alchemy && cheatConfig.w2.alchemy.hasOwnProperty(argumentList[0])
      ? cheatConfig.w2.alchemy[argumentList[0]](Reflect.apply(Alchemy, this, argumentList))
      : Reflect.apply(Alchemy, this, argumentList);
  };
}

// w1 cheats
// TODO: move all setups stuff that is in w1 in here, so it is sorted.
function setupw1StuffProxy() {
  // owl cheats
  const actorEvents579 = events(579);
  const Owl = actorEvents579._customBlock_Summoning;
  actorEvents579._customBlock_Summoning = function (...argumentList) {
    return cheatState.w1.owl && cheatConfig.w1.owl.hasOwnProperty(argumentList[0])
      ? cheatConfig.w1.owl[argumentList[0]](Reflect.apply(Owl, this, argumentList))
      : Reflect.apply(Owl, this, argumentList);
  };

  // hoops and darts shop
  const Hoopshop = actorEvents579._customBlock_Thingies;
  actorEvents579._customBlock_Thingies = function (...argumentList) {
    return cheatState.wide.hoopshop && cheatConfig.wide.hoopshop.hasOwnProperty(argumentList[0])
      ? cheatConfig.wide.hoopshop[argumentList[0]](Reflect.apply(Hoopshop, this, argumentList))
      : Reflect.apply(Hoopshop, this, argumentList);
  };

  const Dartshop = actorEvents579._customBlock_Thingies;
  actorEvents579._customBlock_Thingies = function (...argumentList) {
    return cheatState.wide.dartshop && cheatConfig.wide.dartshop.hasOwnProperty(argumentList[0])
      ? cheatConfig.wide.dartshop[argumentList[0]](Reflect.apply(Dartshop, this, argumentList))
      : Reflect.apply(Dartshop, this, argumentList);
  };

  // Nullify anvil upgrade cost and duration
  const anvilProduceStats = events(189)._customBlock_AnvilProduceStats;
  events(189)._customBlock_AnvilProduceStats = function (...argumentsList) {
    if (cheatState.w1.anvil) {
      const t = argumentsList[0];
      if (t == "Costs1") return 0;
      if (t == "Costs2") return 0;
      if (t == "ProductionSpeed")
        return cheatConfig.w1.anvil.productionspeed(
          Reflect.apply(anvilProduceStats, this, argumentsList)
        );
    }
    return Reflect.apply(anvilProduceStats, this, argumentsList);
  };

}

// w2 cheats
// TODO: move all setups stuff that is in w2 in here, so it is sorted.
function setupw2StuffProxy() {
  const actorEvents579 = events(579);
  const Roo = actorEvents579._customBlock_Summoning;
  actorEvents579._customBlock_Summoning = function (...argumentList) {
    return cheatState.w2.roo && cheatConfig.w2.roo.hasOwnProperty(argumentList[0])
      ? cheatConfig.w2.roo[argumentList[0]](Reflect.apply(Roo, this, argumentList))
      : Reflect.apply(Roo, this, argumentList);
  };
}

// w3 cheats
function setupw3StuffProxy() {
  const actorEvents345 = events(345);
  // Nullification of all costs inside the workbench
  const Workbench = actorEvents345._customBlock_WorkbenchStuff;
  actorEvents345._customBlock_WorkbenchStuff = function (...argumentsList) {
    const t = argumentsList[0];
    if (cheatState.w3.flagreq && t == "FlagReq") return 0; // Nullified flag unlock time
    if (cheatState.w3.freebuildings && (t == "TowerSaltCost" || t == "TowerMatCost")) return 0; // Tower cost nullification
    if (cheatState.w3.instabuild && t == "TowerBuildReq") return 0; // Instant build/upgrade
    if (cheatState.w3.booktime && t == "BookReqTime") return 1; // Book/second, holds shadow ban danger and could one day be replaced
    if (cheatState.w3.totalflags && t == "TotalFlags") return 10; // Total amnt of placeable flags
    if (cheatState.w3.buildspd && t == "PlayerBuildSpd") { // multiply build rate (check config.js)
      const originalValue = Reflect.apply(Workbench, this, argumentsList);
      return cheatConfig.w3.buildspd(originalValue);
    }
    if (cheatState.multiply.printer && t == "ExtraPrinting")
      return (
        (argumentsList[0] = "AdditionExtraPrinting"),
        cheatConfig.multiply.printer * Reflect.apply(Workbench, this, argumentsList)
      ); // print multiplier
    // if (cheatState.w3.shrinehr 			&& t == "ShrineHrREQ") return 0.5; // Shrine lvl up time reduced to 0.5 hour commented as too dangerous!
    // The minimum level talent book from the library is equivalent to the max level
    if (cheatState.w3.book && t == "minBookLv") {
      argumentsList[0] = "maxBookLv";
    }
    return Reflect.apply(Workbench, this, argumentsList);
  };

  // Worship mobs die on spawn
  actorEvents345._customBlock_2inputs = new Proxy(actorEvents345._customBlock_2inputs, {
    apply: function (originalFn, context, argumentsList) {
      if (cheatState.w3.mobdeath) return "Worshipmobdeathi" == true ? 0 : 0;
      return Reflect.apply(originalFn, context, argumentsList);
    },
  });

  const shrineInfo = bEngine.getGameAttribute("ShrineInfo");
  for (const i in shrineInfo) {
    if (typeof shrineInfo[i] == "object") {
      shrineInfo[i] = new Proxy(shrineInfo[i], {
        get: function (original, j) {
          return cheatState.w3.globalshrines && j == 0
            ? bEngine.getGameAttribute("CurrentMap")
            : original[j];
        },
      });
    }
  }

  actorEvents345._customBlock_TowerStats = new Proxy(actorEvents345._customBlock_TowerStats, {
    apply: function (originalFn, context, argumentList) {
      const stat = argumentList[0];
      const base = Reflect.apply(originalFn, context, argumentList);

      if (cheatState.w3.towerdamage && stat === "damage") {
        return cheatConfig.w3.towerdamage(base);
      }
      return base;
    },
  });

  if (actorEvents345._customBlock_Refinery) {
    const Refinery = actorEvents345._customBlock_Refinery;
    actorEvents345._customBlock_Refinery = function (...argumentsList) {
      const key = argumentsList[0];

      if (cheatState.w3.refineryspeed && key === "CycleInitialTime") {
        const baseTime = Reflect.apply(Refinery, this, argumentsList);
        return cheatConfig.w3.refineryspeed(baseTime);
      }

      return Reflect.apply(Refinery, this, argumentsList);
    };
  }
}

// w4 cheats
function setupw4StuffProxy() {
  const actorEvents345 = events(345);
  const actorEvents189 = events(189);

  actorEvents345._customBlock_Breeding = new Proxy(actorEvents345._customBlock_Breeding, {
    apply: function (originalFn, context, argumentsList) {
      const t = argumentsList[0];

      if (cheatState.w4.eggcap && t == "TotalEggCapacity") return 13; // 13 eggs
      if (cheatState.w4.fenceyard && t == "FenceYardSlots") return 27; // 27 fenceyard slots
      if (cheatState.w4.battleslots && t == "PetBattleSlots") return 6; // 6 battle slots
      if (cheatState.w4.petchance && t == "TotalBreedChance")
        return cheatConfig.w4.petchance(Reflect.apply(originalFn, context, argumentsList));
      if (cheatState.w4.genes && t == "GeneticCost") return 0; // 0 gene upgrades
      if (cheatState.w4.fasteggs && t == "TotalTimeForEgg")
        return cheatConfig.w4.fasteggs(Reflect.apply(originalFn, context, argumentsList));
      if (cheatState.w4.petupgrades && t == "PetUpgCostREAL")
        return cheatConfig.w4.petupgrades(Reflect.apply(originalFn, context, argumentsList));
      if (cheatState.w4.petrng && t == "PetQTYonBreed") {
        cheatState.rng = "low";
        argumentsList[2] = 8;
        const power = Reflect.apply(originalFn, context, argumentsList);
        cheatState.rng = false;
        return Math.round(power * (1 + Math.random() * 0.2));
      }
      return Reflect.apply(originalFn, context, argumentsList);
    },
  });

  const Lab = actorEvents345._customBlock_Labb;
  actorEvents345._customBlock_Labb = function (...argumentsList) {
    const t = argumentsList[0];
    if (cheatState.w4.labpx && (t == "Dist" || t == "BonusLineWidth")) return 1000; // long lab connections
    if (cheatState.w4.sigilspeed && t == "SigilBonusSpeed")
      return cheatConfig.w4.sigilspeed(Reflect.apply(Lab, this, argumentsList));
    return Reflect.apply(Lab, this, argumentsList);
  };

  const PetStuff = actorEvents345._customBlock_PetStuff;
  actorEvents345._customBlock_PetStuff = function (...argumentsList) {
    const originalValue = Reflect.apply(PetStuff, this, argumentsList);
    if (cheatState.w4.fastforaging && argumentsList[0] == "TotalTrekkingHR")
      return cheatConfig.w4.fastforaging(originalValue); // fast foraging
    if (cheatState.w4.superpets && cheatConfig.w4.superpets[argumentsList[0]])
      return cheatConfig.w4.superpets[argumentsList[0]](originalValue); // powerful pets
    return originalValue;
  };

  const CookingR = actorEvents345._customBlock_CookingR;
  actorEvents345._customBlock_CookingR = function (...argumentsList) {
    const t = argumentsList[0];
    if (cheatState.w4.mealspeed && t == "CookingReqToCook")
      return cheatConfig.w4.mealspeed(Reflect.apply(CookingR, this, argumentsList));
    if (cheatState.w4.recipespeed && t == "CookingFireREQ")
      return cheatConfig.w4.recipespeed(Reflect.apply(CookingR, this, argumentsList));
    if (cheatState.w4.luckychef && t == "CookingLUCK")
      return cheatConfig.w4.luckychef(Reflect.apply(CookingR, this, argumentsList));
    if (
      cheatState.w4.kitchensdiscount &&
      (t == "CookingNewKitchenCoinCost" || t == "CookingUpgSpiceCostQty")
    )
      return cheatConfig.w4.kitchensdiscount(Reflect.apply(CookingR, this, argumentsList));
    if (cheatState.w4.platesdiscount && t == "CookingMenuMealCosts")
      return cheatConfig.w4.platesdiscount(Reflect.apply(CookingR, this, argumentsList));
    return Reflect.apply(CookingR, this, argumentsList);
  };

  const MainframeBonus = actorEvents345._customBlock_MainframeBonus;
  actorEvents345._customBlock_MainframeBonus = function (...argumentsList) {
    if (cheatState.w4.mainframe && cheatConfig.w4.mainframe.hasOwnProperty(argumentsList[0])) {
      return cheatConfig.w4.mainframe[argumentsList[0]](
        Reflect.apply(MainframeBonus, this, argumentsList)
      );
    }
    return Reflect.apply(MainframeBonus, this, argumentsList);
  };

  const chipBonuses = actorEvents189._customBlock_chipBonuses;
  actorEvents189._customBlock_chipBonuses = function (...argumentsList) {
    if (cheatState.w4.chipbonuses && cheatConfig.w4.chipbonuses[argumentsList[0]]) {
      return cheatConfig.w4.chipbonuses[argumentsList[0]](
        Reflect.apply(chipBonuses, this, argumentsList)
      );
    }
    return Reflect.apply(chipBonuses, this, argumentsList);
  };

  const MealBonus = actorEvents189._customBlock_MealBonus;
  actorEvents189._customBlock_MealBonus = function (...argumentsList) {
    if (cheatState.w4.meals && cheatConfig.w4.meals[argumentsList[0]]) {
      return cheatConfig.w4.meals[argumentsList[0]](Reflect.apply(MealBonus, this, argumentsList));
    }
    return Reflect.apply(MealBonus, this, argumentsList);
  };
}

function setupw5Proxies() {
  const actorEvents579 = events(579);

  const Holes = actorEvents579._customBlock_Holes;
  actorEvents579._customBlock_Holes = function (...argumentList) {
    return cheatState.w5.holes && cheatConfig.w5.holes.hasOwnProperty(argumentList[0])
      ? cheatConfig.w5.holes[argumentList[0]](Reflect.apply(Holes, this, argumentList))
      : Reflect.apply(Holes, this, argumentList);
  };

  const Sailing = actorEvents579._customBlock_Sailing;
  actorEvents579._customBlock_Sailing = function (...argumentsList) {
    return cheatState.w5.sailing && cheatConfig.w5.sailing.hasOwnProperty(argumentsList[0])
      ? cheatConfig.w5.sailing[argumentsList[0]](Reflect.apply(Sailing, this, argumentsList))
      : Reflect.apply(Sailing, this, argumentsList);
  };

  const GamingStatType = actorEvents579._customBlock_GamingStatType;
  actorEvents579._customBlock_GamingStatType = function (...argumentsList) {
    if (cheatState.w5.gaming && cheatConfig.w5.gaming[argumentsList[0]]) {
      return cheatConfig.w5.gaming[argumentsList[0]](
        Reflect.apply(GamingStatType, this, argumentsList),
        argumentsList
      );
    }
    return Reflect.apply(GamingStatType, this, argumentsList);
  };

  const GamingAttr = bEngine.getGameAttribute("Gaming");
  GamingAttr._13 = GamingAttr[13];
  Object.defineProperty(bEngine.getGameAttribute("Gaming"), 13, {
    get: function () {
      return cheatState.w5.gaming && cheatConfig.w5.gaming.SnailMail
        ? cheatConfig.w5.gaming.SnailMail
        : GamingAttr._13;
    },
    set: function (value) {
      GamingAttr._13 = value;
      return true;
    },
  });

  const Divinity = actorEvents579._customBlock_Divinity;
  actorEvents579._customBlock_Divinity = function (...argumentsList) {
    if (cheatState.w5.divinity && cheatConfig.w5.divinity[argumentsList[0]]) {
      return cheatConfig.w5.divinity[argumentsList[0]](
        Reflect.apply(Divinity, this, argumentsList)
      );
    }
    return Reflect.apply(Divinity, this, argumentsList);
  };

  const AtomCollider = actorEvents579._customBlock_AtomCollider;
  actorEvents579._customBlock_AtomCollider = function (...argumentsList) {
    if (cheatState.w5.collider && cheatConfig.w5.collider[argumentsList[0]]) {
      return cheatConfig.w5.collider[argumentsList[0]](
        Reflect.apply(AtomCollider, this, argumentsList)
      );
    }
    return Reflect.apply(AtomCollider, this, argumentsList);
  };

  const DivinityAttr = bEngine.getGameAttribute("Divinity");
  DivinityAttr._38 = DivinityAttr[38];
  Object.defineProperty(DivinityAttr, 38, {
    get: function () {
      return cheatState.w5.divinity && cheatConfig.w5.divinity.unlinks ? 1 : this._38;
    },
    set: function (value) {
      this._38 = value;
      return true;
    },
  });


  const RiftAttr = bEngine.getGameAttribute("Rift");
  RiftAttr._1 = RiftAttr[1];
  Object.defineProperty(bEngine.getGameAttribute("Rift"), 1, {
    get: function () {
      return cheatState.unlock.rifts && CList.RiftStuff[4][bEngine.getGameAttribute("Rift")[0]] != 9
        ? 1e8
        : RiftAttr._1;
    },
    set: function (value) {
      RiftAttr._1 = value;
      return true;
    },
  });

  const DreamStuff = actorEvents579._customBlock_Dreamstuff;
  actorEvents579._customBlock_Dreamstuff = function (...argumentsList) {
    if (cheatState.w3.instantdreams && argumentsList[0] === "BarFillReq") {
      return 0;
    }
    return Reflect.apply(DreamStuff, this, argumentsList);
  };

}


// added by dreamx3 - 1
function setupMiscProxies() {
  const actorEvents345 = events(345);

  const keychain = actorEvents345._customBlock_keychainn;
  actorEvents345._customBlock_keychainn = function (...argumentList) {
    return cheatConfig.misc.hasOwnProperty("keychain")
      ? cheatConfig.misc["keychain"](Reflect.apply(keychain, this, argumentList))
      : Reflect.apply(keychain, this, argumentList);
  };
}

function setupw6Proxies() {
  const actorEvents579 = events(579);

  const Endless = actorEvents579._customBlock_Summoning;
  actorEvents579._customBlock_Summoning = function (...argumentList) {
    if (cheatState.w6.endless && argumentList[0] === "EndlessModifierID") {
      return 1; // it makes the mobs fast and win with one hit, dont know how it works tho just lucky find.
    }
    return Reflect.apply(Endless, this, argumentList);
  };

  const Farming = actorEvents579._customBlock_FarmingStuffs;
  actorEvents579._customBlock_FarmingStuffs = function (...argumentList) {
    return cheatState.w6.farming && cheatConfig.w6.farming.hasOwnProperty(argumentList[0])
      ? cheatConfig.w6.farming[argumentList[0]](Reflect.apply(Farming, this, argumentList))
      : Reflect.apply(Farming, this, argumentList);
  };

  const Ninja = actorEvents579._customBlock_Ninja;
  actorEvents579._customBlock_Ninja = function (...argumentList) {
    return cheatState.w6.ninja && cheatConfig.w6.ninja.hasOwnProperty(argumentList[0])
      ? cheatConfig.w6.ninja[argumentList[0]](Reflect.apply(Ninja, this, argumentList))
      : Reflect.apply(Ninja, this, argumentList);
  };

  const Summoning = actorEvents579._customBlock_Summoning;
  actorEvents579._customBlock_Summoning = function (...argumentList) {
    return cheatState.w6.summoning && cheatConfig.w6.summoning.hasOwnProperty(argumentList[0])
      ? cheatConfig.w6.summoning[argumentList[0]](Reflect.apply(Summoning, this, argumentList))
      : Reflect.apply(Summoning, this, argumentList);
  };
  // end - 1

  // we use the same summoning event since grimoire is located there.
  const Grimoire = actorEvents579._customBlock_Summoning;
  actorEvents579._customBlock_Summoning = function (...argumentList) {
    return cheatState.w6.grimoire && cheatConfig.w6.grimoire.hasOwnProperty(argumentList[0])
      ? cheatConfig.w6.grimoire[argumentList[0]](Reflect.apply(Grimoire, this, argumentList))
      : Reflect.apply(Grimoire, this, argumentList);
  };

  const Windwalker = actorEvents579._customBlock_Windwalker;
  actorEvents579._customBlock_Windwalker = function (...argumentList) {
    return cheatState.w6.windwalker && cheatConfig.w6.windwalker.hasOwnProperty(argumentList[0])
      ? cheatConfig.w6.windwalker[argumentList[0]](Reflect.apply(Windwalker, this, argumentList))
      : Reflect.apply(Windwalker, this, argumentList);
  };

  const Arcane = actorEvents579._customBlock_ArcaneType;
  actorEvents579._customBlock_ArcaneType = function (...argumentList) {
    return cheatState.w6.arcane && cheatConfig.w6.arcane.hasOwnProperty(argumentList[0])
      ? cheatConfig.w6.arcane[argumentList[0]](Reflect.apply(Arcane, this, argumentList))
      : Reflect.apply(Arcane, this, argumentList);
  };
}

function setupw7Proxies() {
  const actorEvents579 = events(579);

  const BubbaStuff = actorEvents579._customBlock_Bubbastuff;
  actorEvents579._customBlock_Bubbastuff = function (...argumentList) {
    return cheatState.w7.bubba && cheatConfig.w7.bubba.hasOwnProperty(argumentList[0])
      ? cheatConfig.w7.bubba[argumentList[0]](Reflect.apply(BubbaStuff, this, argumentList))
      : Reflect.apply(BubbaStuff, this, argumentList);
  };

  const Spelunk = actorEvents579._customBlock_Spelunk;
  actorEvents579._customBlock_Spelunk = function (...argumentList) {
    return cheatState.w7.spelunk && cheatConfig.w7.spelunk.hasOwnProperty(argumentList[0])
      ? cheatConfig.w7.spelunk[argumentList[0]](Reflect.apply(Spelunk, this, argumentList))
      : Reflect.apply(Spelunk, this, argumentList);
  };

  const Gallery = actorEvents579._customBlock_Gallery;
  actorEvents579._customBlock_Gallery = function (...argumentList) {
    return cheatState.w7.gallery && cheatConfig.w7.gallery.hasOwnProperty(argumentList[0])
      ? cheatConfig.w7.gallery[argumentList[0]](Reflect.apply(Gallery, this, argumentList))
      : Reflect.apply(Gallery, this, argumentList);
  };

  // clam and coral reef is inside thingies
  const Clam = actorEvents579._customBlock_Thingies;
  actorEvents579._customBlock_Thingies = function (...argumentList) {
    return cheatState.w7.clam && cheatConfig.w7.clam.hasOwnProperty(argumentList[0])
      ? cheatConfig.w7.clam[argumentList[0]](Reflect.apply(Clam, this, argumentList))
      : Reflect.apply(Clam, this, argumentList);
  };

  const Reef = actorEvents579._customBlock_Thingies;
  actorEvents579._customBlock_Thingies = function (...argumentList) {
    return cheatState.w7.reef && cheatConfig.w7.reef.hasOwnProperty(argumentList[0])
      ? cheatConfig.w7.reef[argumentList[0]](Reflect.apply(Reef, this, argumentList))
      : Reflect.apply(Reef, this, argumentList);
  };

  const Coralkid = actorEvents579._customBlock_Thingies;
  actorEvents579._customBlock_Thingies = function (...argumentList) {
    return cheatState.w7.coralkid && cheatConfig.w7.coralkid.hasOwnProperty(argumentList[0])
      ? cheatConfig.w7.coralkid[argumentList[0]](Reflect.apply(Coralkid, this, argumentList))
      : Reflect.apply(Coralkid, this, argumentList);
  };

  const Bigfish = actorEvents579._customBlock_Spelunk;
  actorEvents579._customBlock_Spelunk = function (...argumentList) {
    return cheatState.w7.bigfish && cheatConfig.w7.bigfish.hasOwnProperty(argumentList[0])
      ? cheatConfig.w7.bigfish[argumentList[0]](Reflect.apply(Bigfish, this, argumentList))
      : Reflect.apply(Bigfish, this, argumentList);
  };

  const Sneaksymbol = actorEvents579._customBlock_Thingies;
  actorEvents579._customBlock_Thingies = function (...argumentList) {
    return cheatState.w7.sneaksymbol && cheatConfig.w7.sneaksymbol.hasOwnProperty(argumentList[0])
      ? cheatConfig.w7.sneaksymbol[argumentList[0]](Reflect.apply(Sneaksymbol, this, argumentList))
      : Reflect.apply(Sneaksymbol, this, argumentList);
  };
}

function setupArcadeProxies() {
  const actorEvents345 = events(345)

  const DungeonCalc = actorEvents345._customBlock_DungeonCalc;
  actorEvents345._customBlock_DungeonCalc = function (...argumentList) {
    return cheatState.wide.arcade && cheatConfig.wide.arcade.hasOwnProperty(argumentList[0])
      ? cheatConfig.wide.arcade[argumentList[0]](Reflect.apply(DungeonCalc, this, argumentList))
      : Reflect.apply(DungeonCalc, this, argumentList);
  };

}


// Minigame cheats
function setupMinigameProxy() {
  const miningGameOver = bEngine
    .getGameAttribute("PixelHelperActor")[4]
    .getValue("ActorEvents_229", "_customEvent_MiningGameOver");
  const handlerMining = {
    apply: function (originalFn, context, argumentsList) {
      if (cheatState.minigame.mining) return; // Do nothing when game over
      return Reflect.apply(originalFn, context, argumentsList);
    },
  };
  const proxyMining = new Proxy(miningGameOver, handlerMining);
  bEngine
    .getGameAttribute("PixelHelperActor")[4]
    .setValue("ActorEvents_229", "_customEvent_MiningGameOver", proxyMining);

  const fishingGameOver = bEngine
    .getGameAttribute("PixelHelperActor")[4]
    .getValue("ActorEvents_229", "_customEvent_FishingGameOver");
  const handlerFishing = {
    apply: function (originalFn, context, argumentsList) {
      if (cheatState.minigame.fishing) return; // Do nothing when game over
      return Reflect.apply(originalFn, context, argumentsList);
    },
  };
  const proxyFishing = new Proxy(fishingGameOver, handlerFishing);
  bEngine
    .getGameAttribute("PixelHelperActor")[4]
    .setValue("ActorEvents_229", "_customEvent_FishingGameOver", proxyFishing);
}
// Static fly and hoop positions
function setupCatchingMinigameProxy() {
  const catchingGameGenInfo = bEngine
    .getGameAttribute("PixelHelperActor")[4]
    .getValue("ActorEvents_229", "_GenInfo");
  const handler = {
    get: function (originalObject, property) {
      if (cheatState.minigame.catching) {
        if (Number(property) === 31) return 70;
        if (Number(property) === 33) return [95, 95, 95, 95, 95];
      }
      return Reflect.get(...arguments);
    },
  };
  const proxyCatching = new Proxy(catchingGameGenInfo, handler);
  bEngine
    .getGameAttribute("PixelHelperActor")[4]
    .setValue("ActorEvents_229", "_GenInfo", proxyCatching);
}

// Chopping minigame: Whole bar filled with gold zone
function setupGeneralInfoProxy() {
  const generalInfo = bEngine
    .getGameAttribute("PixelHelperActor")[1]
    .getValue("ActorEvents_116", "_GeneralINFO");
  const handler = {
    get: function (orignalObject, property) {
      if (cheatState.minigame.choppin && Number(property) === 7)
        return [100, -1, 0, 2, 0, 220, -1, 0, -1, 0, -1, 0, 0, 220, 0, 0, 1];
      return Reflect.get(...arguments);
    },
  };
  const proxyChopping = new Proxy(generalInfo, handler);
  bEngine
    .getGameAttribute("PixelHelperActor")[1]
    .setValue("ActorEvents_116", "_GeneralINFO", proxyChopping);
}

function setupPoingProxy() {
  let aiVelocity = 0;
  Object.defineProperty(
    bEngine.gameAttributes.h.PixelHelperActor[23].behaviors.behaviors[0].script._GenINFO[63],
    "1",
    {
      get: function () {
        return cheatState.minigame.poing ? 0 : aiVelocity;
      },
      set: function (value) {
        aiVelocity = value;
        return true;
      },
    }
  );
}

function setupHoopsMinigameProxy() {
  try {
    const hoopsBehavior = bEngine
      .getGameAttribute("PixelHelperActor")[21]
      .behaviors.getBehavior("ActorEvents_510");

    if (!hoopsBehavior || typeof hoopsBehavior._GenINFO === "undefined") {
      console.error(
        "Hoops Minigame Proxy Setup Failed: Could not find ActorEvents_510 behavior or its _GenINFO property."
      );
      return;
    }
    const HOOP_TARGET_X = 107;
    const HOOP_TARGET_Y = 108;
    const HOOP_POS_X = 95;
    const HOOP_POS_Y = 96;
    const BALL_X = 91;

    const originalGenInfo = hoopsBehavior._GenINFO;
    const handler = {
      get: function (target, property, receiver) {
        if (cheatState.minigame.hoops) {
          if (bEngine.gameAttributes.h.OptionsListAccount[243] === 1) {
            bEngine.gameAttributes.h.OptionsListAccount[243] = 0;
          }
          const numericProperty = Number(property);

          switch (numericProperty) {
            case HOOP_TARGET_X:
              return 600;
            case HOOP_TARGET_Y:
              return 300;
            case HOOP_POS_X:
              return 600;
            case HOOP_POS_Y:
              return 300;
            case BALL_X:
              return 620;
          }
        }

        return Reflect.get(target, property, receiver);
      },
    };

    const proxyHoops = new Proxy(originalGenInfo, handler);
    hoopsBehavior._GenINFO = proxyHoops;

  } catch (error) {
    console.error("Error setting up Hoops minigame proxy:", error);
  }
}

function setupDartsMinigameProxy() {
  try {
    const dartsBehavior = bEngine
      .getGameAttribute("PixelHelperActor")[21]
      .behaviors.getBehavior("ActorEvents_510");

    if (!dartsBehavior || typeof dartsBehavior._GenINFO === "undefined") {
      console.error(
        "Darts Minigame Proxy Setup Failed: Could not find ActorEvents_510 behavior or its _GenINFO property."
      );
      return;
    }

    // Darts minigame _GenINFO indices from code analysis
    const DART_X = 138;          // Dart X position
    const DART_Y = 139;          // Dart Y position  
    const DART_ACTIVE = 137;     // Dart is flying (1=true, 0=false)
    const BOARD_BOUNDS = { left: 916, right: 960, top: 89, bottom: 495 };
    const BULLSEYE_Y = 292;      // Center Y position for perfect bullseye

    const originalGenInfo = dartsBehavior._GenINFO;
    const handler = {
      get: function (target, property, receiver) {
        if (cheatState.minigame.darts) {
          const numericProperty = Number(property);

          // When dart is active and over the board, force perfect bullseye position
          if (target[DART_ACTIVE] === 1) {
            if (numericProperty === DART_X) {
              // Center dart horizontally on board
              return Math.floor((BOARD_BOUNDS.left + BOARD_BOUNDS.right) / 2);
            }
            if (numericProperty === DART_Y) {
              // Force dart to bullseye Y coordinate
              return BULLSEYE_Y;
            }
          }
        }

        return Reflect.get(target, property, receiver);
      },
    };

    const proxyDarts = new Proxy(originalGenInfo, handler);
    dartsBehavior._GenINFO = proxyDarts;

  } catch (error) {
    console.error("Error setting up Darts minigame proxy:", error);
  }
}

// monument
function setupMonumentProxy() {

  // Wisdom monument infinite attempts
  const wisdomAttempt = bEngine
    .getGameAttribute("PixelHelperActor")[25]
    .getValue("ActorEvents_670", "_GenINFO");

  const handlerWisdom = {
    get: function (originalObject, property) {
      if (cheatState.minigame.wisdom) {
        if (Number(property) === 194) return 10;
      }
      return Reflect.get(...arguments);
    },
  };

  const proxyWisdom = new Proxy(wisdomAttempt, handlerWisdom);
  bEngine
    .getGameAttribute("PixelHelperActor")[25]
    .setValue("ActorEvents_670", "_GenINFO", proxyWisdom);
}

function rollPersonalObols() {
  rollPerfectObols(
    bEngine.gameAttributes.h.ObolEquippedOrder[0],
    bEngine.gameAttributes.h.ObolEquippedMap[0],
    bEngine.gameAttributes.h.CharacterClass
  );
}

function rollFamilyObols() {
  rollPerfectObols(
    bEngine.gameAttributes.h.ObolEquippedOrder[1],
    bEngine.gameAttributes.h.ObolEquippedMap[1],
    bEngine.gameAttributes.h.CharacterClass
  );
}

function rollAllCharactersObols() {
  Object.values(bEngine.getGameAttribute("PlayerDATABASE").h).forEach((player) => {
    rollPerfectObols(player.h.ObolEquippedOrder, player.h.ObolEquippedMap, player.h.CharacterClass);
  });
}

function rollInventoryObols() {
  [0, 1, 2, 3].forEach((index) => {
    const obolOrder = bEngine.gameAttributes.h.ObolInventoryOrder[index];
    rollPerfectObols(
      obolOrder,
      bEngine.gameAttributes.h.ObolInventoryMap[index],
      bEngine.gameAttributes.h.CharacterClass
    );
  });
}

function rollAllObols() {
  rollPersonalObols();
  rollFamilyObols();
  rollAllCharactersObols();
  rollInventoryObols();
}

function rollPerfectObols(obolOrder, obolMap, characterClass) {
  const primaryStat = [1, 2, 3, 4, 5].includes(characterClass)
    ? "LUK"
    : [31, 32, 33, 34, 36, 40].includes(characterClass)
      ? "WIS"
      : [7, 8, 9, 10, 12, 14, 16].includes(characterClass)
        ? "STR"
        : [19, 20, 21, 22, 25, 29].includes(characterClass)
          ? "AGI"
          : "LUK";
  const preferredStat =
    cheatConfig.wide.perfectobols.preferredstat === "PRIMARY"
      ? primaryStat
      : cheatConfig.wide.perfectobols.preferredstat;

  obolOrder.forEach((obol, index) => {
    if (["Locked", "Blank"].some((s) => obol.indexOf(s) !== -1)) return;
    const obolDef = itemDefs[obol].h;
    const obolMapItem = obolMap[index].h;
    let rollsLeft = 2;
    Object.keys(obolMapItem).forEach((stat) => delete obolMapItem[stat]);
    obolDef["SuperFunItemDisplayType"] = "Inventory";
    if (obolDef["UQ1txt"] != 0)
      (obolMapItem["UQ1txt"] = obolDef["UQ1txt"]), (obolMapItem["UQ1val"] = 1), rollsLeft--;
    if (obolDef["UQ2txt"] != 0)
      (obolMapItem["UQ2txt"] = obolDef["UQ2txt"]), (obolMapItem["UQ2val"] = 1), rollsLeft--;
    if (obolDef["Weapon_Power"] > 0 && ["HEXAGON_OBOL", "SPARKLE_OBOL"].includes(obolDef["Type"])) {
      // skilling obol, add weapon power
      obolMapItem["Weapon_Power"] = 1;
      rollsLeft--;
    } else {
      // non-skilling obol, add max possible preferred stat
      obolMapItem[preferredStat] = obolDef["ID"] + 1;
      rollsLeft--;
    }
    if (rollsLeft > 0) {
      // add max possible LUK, or AGI if prefferred stat is LUK
      obolMapItem[preferredStat == "LUK" ? "AGI" : "LUK"] = obolDef["ID"] + 1;
      rollsLeft--;
    }
  });
}

/**
 *
 * Below here are mostly helper functions for the above
 */

// Helper functions for Options List Account editor for the webui
function getOptionsListAccount() {
  try {
    if (bEngine && bEngine.gameAttributes && bEngine.gameAttributes.h && bEngine.gameAttributes.h.OptionsListAccount) {
      return bEngine.gameAttributes.h.OptionsListAccount;
    }
    return null;
  } catch (error) {
    console.error('Error getting OptionsListAccount:', error);
    return null;
  }
}

function setOptionsListAccount(newArray) {
  try {
    if (bEngine && bEngine.gameAttributes && bEngine.gameAttributes.h) {
      bEngine.gameAttributes.h.OptionsListAccount = newArray;
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error setting OptionsListAccount:', error);
    return false;
  }
}

function setOptionsListAccountIndex(index, value) {
  try {
    if (bEngine && bEngine.gameAttributes && bEngine.gameAttributes.h && bEngine.gameAttributes.h.OptionsListAccount) {
      bEngine.gameAttributes.h.OptionsListAccount[index] = value;
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error setting OptionsListAccount index:', error);
    return false;
  }
}

function getOptionsListAccountIndex(index) {
  try {
    if (bEngine && bEngine.gameAttributes && bEngine.gameAttributes.h && bEngine.gameAttributes.h.OptionsListAccount) {
      return bEngine.gameAttributes.h.OptionsListAccount[index];
    }
    return null;
  } catch (error) {
    console.error('Error getting OptionsListAccount index:', error);
    return null;
  }
}

/**
 * Helper functions for Spelunk array editor
 * Spelunk array contains multiple W7 systems:
 * [0] - Lore Boss defeated
 * [1] - Deepest layer explored
 * [16] - Godfrey Gallery
 * [17] - Nametags turned in
 * ... and more
 */

// Get the entire Spelunk array
function getSpelunk() {
  try {
    if (bEngine && bEngine.gameAttributes && bEngine.gameAttributes.h && 
        bEngine.gameAttributes.h.Spelunk) {
      return bEngine.gameAttributes.h.Spelunk;
    }
    return null;
  } catch (error) {
    console.error('Error getting Spelunk:', error);
    return null;
  }
}

// Set the entire Spelunk array
function setSpelunk(newArray) {
  try {
    if (bEngine && bEngine.gameAttributes && bEngine.gameAttributes.h) {
      if (!Array.isArray(newArray)) {
        console.error('Invalid data: must be an array');
        return false;
      }
      bEngine.gameAttributes.h.Spelunk = newArray;
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error setting Spelunk:', error);
    return false;
  }
}

// Get a specific index from Spelunk array
// Example: getSpelunkIndex(16) returns the Gallery array
function getSpelunkIndex(index) {
  try {
    const spelunk = getSpelunk();
    if (spelunk && index >= 0 && index < spelunk.length) {
      return spelunk[index];
    }
    console.error('Invalid index or Spelunk not found');
    return null;
  } catch (error) {
    console.error('Error getting Spelunk index:', error);
    return null;
  }
}

// Set a specific index in Spelunk array
// Example: setSpelunkIndex(16, newGalleryArray)
function setSpelunkIndex(index, newValue) {
  try {
    if (bEngine && bEngine.gameAttributes && bEngine.gameAttributes.h && 
        bEngine.gameAttributes.h.Spelunk) {
      const spelunk = bEngine.gameAttributes.h.Spelunk;
      if (index < 0 || index >= spelunk.length) {
        console.error('Invalid index: must be between 0 and', spelunk.length - 1);
        return false;
      }
      bEngine.gameAttributes.h.Spelunk[index] = newValue;
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error setting Spelunk index:', error);
    return false;
  }
}

// Get a specific value from within a Spelunk sub-array
// Example: getSpelunkValue(16, 0) returns the trophy in Gallery slot 0
function getSpelunkValue(arrayIndex, valueIndex) {
  try {
    const subArray = getSpelunkIndex(arrayIndex);
    if (subArray && Array.isArray(subArray) && valueIndex >= 0 && valueIndex < subArray.length) {
      return subArray[valueIndex];
    }
    console.error('Invalid array index, value index, or not an array');
    return null;
  } catch (error) {
    console.error('Error getting Spelunk value:', error);
    return null;
  }
}

// Set a specific value within a Spelunk sub-array
// Example: setSpelunkValue(16, 0, -1) removes trophy from Gallery slot 0
function setSpelunkValue(arrayIndex, valueIndex, newValue) {
  try {
    if (bEngine && bEngine.gameAttributes && bEngine.gameAttributes.h && 
        bEngine.gameAttributes.h.Spelunk) {
      const subArray = getSpelunkIndex(arrayIndex);
      if (!subArray || !Array.isArray(subArray)) {
        console.error('Invalid array index or not an array');
        return false;
      }
      if (valueIndex < 0 || valueIndex >= subArray.length) {
        console.error('Invalid value index: must be between 0 and', subArray.length - 1);
        return false;
      }
      bEngine.gameAttributes.h.Spelunk[arrayIndex][valueIndex] = newValue;
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error setting Spelunk value:', error);
    return false;
  }
}


// Here you can add suggestions for the autocomplete
async function getAutoCompleteSuggestions() {
  let choices = [];
  let cheatNames = "";
  let items = "";
  let monsters = "";
  let attributes = "";

  // Diagnostic checks before accessing .fn
  if (cheats["cheats"] && typeof cheats["cheats"].fn === 'function') {
    cheatNames = cheats["cheats"].fn.call(this, []);
  } else {
    console.error("Error in getAutoCompleteSuggestions: cheats['cheats'] or its .fn is missing!");
    // Optionally return early or provide default/empty suggestions
  }

  if (cheats["list item"] && typeof cheats["list item"].fn === 'function') {
    items = cheats["list item"].fn.call(this, []);
  } else {
    console.error("Error in getAutoCompleteSuggestions: cheats['list item'] or its .fn is missing!");
  }

  if (cheats["list monster"] && typeof cheats["list monster"].fn === 'function') {
    monsters = cheats["list monster"].fn.call(this, []);
  } else {
    console.error("Error in getAutoCompleteSuggestions: cheats['list monster'] or its .fn is missing!");
  }

  if (cheats["list gga"] && typeof cheats["list gga"].fn === 'function') {
    attributes = cheats["list gga"].fn.call(this, []);
  } else {
    console.error("Error in getAutoCompleteSuggestions: cheats['list gga'] or its .fn is missing!");
  }

  // Process available data, even if some parts failed
  if (cheatNames) {
    cheatNames.split("\n").forEach(function (cheat) {
      choices.push({
        name: cheat.substring(0, cheat.indexOf("(")).trim(),
        message: cheat,
        value: cheat.substring(0, cheat.indexOf("(")).trim(),
      });
    });
  }

  if (items) {
    items.split("\n").forEach(function (item) {
      let itemParts = item.split(", ");
      if (!["error", "null", undefined, "ingameName"].includes(itemParts[1])) {
        choices.push({
          name: "drop " + itemParts[0],
          message: `drop ${itemParts[0]} (${itemParts[1]})`,
          value: "drop " + itemParts[0],
        });
        choices.push({
          name: "nomore " + itemParts[0],
          message: `nomore ${itemParts[0]} (${itemParts[1]})`,
          value: "nomore " + itemParts[0],
        });
      }
    });
  }

  if (monsters) {
    monsters.split("\n").forEach(function (item) {
      let itemParts = item.split(", ");
      if (!["error", "null", undefined, "ingameName"].includes(itemParts[1])) {
        choices.push({
          name: "spawn " + itemParts[0],
          message: `spawn ${itemParts[0]} (${itemParts[1]})`,
          value: "spawn " + itemParts[0],
        });
      }
    });
  }

  if (attributes) {
    attributes.split("\n").forEach(function (item) {
      if (!["error", "null", undefined, "ingameName"].includes(item)) {
        choices.push({
          name: "gga " + item,
          message: `gga ${item}`,
          value: "gga " + item,
        });
      }
    });
  }

  Object.keys(summonUnits).forEach(function (item) {
    if (!["error", "null", undefined, "ingameName"].includes(item)) {
      choices.push({
        name: "summoning " + item,
        message: "summoning " + item,
        value: "summoning " + item,
      });
    }
  });

  // Process items if available
  if (items) {
    items.split("\n").forEach(function (item) {
      let itemParts = item.split(", ");
      if (!["error", "null", undefined, "ingameName"].includes(itemParts[1])) {
        choices.push({
          name: "drop " + itemParts[0],
          message: `drop ${itemParts[0]} (${itemParts[1]})`,
          value: "drop " + itemParts[0],
        });
        choices.push({
          name: "nomore " + itemParts[0],
          message: `nomore ${itemParts[0]} (${itemParts[1]})`,
          value: "nomore " + itemParts[0],
        });
      }
    });
    monsters.split("\n").forEach(function (item) {
      let itemParts = item.split(", ");
      if (!["error", "null", undefined, "ingameName"].includes(itemParts[1])) {
        choices.push({
          name: "spawn " + itemParts[0],
          message: `spawn ${itemParts[0]} (${itemParts[1]})`,
          value: "spawn " + itemParts[0],
        });
      }
    });
    attributes.split("\n").forEach(function (item) {
      if (!["error", "null", undefined, "ingameName"].includes(item)) {
        choices.push({
          name: "gga " + item,
          message: `gga ${item}`,
          value: "gga " + item,
        });
      }
    });

    Object.keys(summonUnits).forEach(function (item) {
      if (!["error", "null", undefined, "ingameName"].includes(item)) {
        choices.push({
          name: "summoning " + item,
          message: "summoning " + item,
          value: "summoning " + item,
        });
      }
    });

    Object.keys(keychainStatsMap).forEach(function (item) {
      if (!["error", "null", undefined, "ingameName"].includes(item)) {
        choices.push({
          name: "keychain " + item,
          message: "keychain " + item,
          value: "keychain " + item,
        });
      }
    });
    return choices;
  }
}

// These choices won't execute immediately when you hit enter, they will allow you to add additional input such as a number if you like, then execute the second time you press enter
// This is now also used to make a value field for the ui
async function getChoicesNeedingConfirmation() {
  return [
    "drop",
    "spawn",
    "w4 mainframe",
    "w4 chipbonuses",
    "search",
    "wide gembuylimit",
    "wide candytime",
    "gga",
    "multiply",
    "summoning",
    "ninjaItem",
    "lvl",
    "qnty",
    "setalch",
    "wipe invslot",
    "wipe chestslot",
    // "keychain", why is this here?
  ];
}

function getZJSManipulator() {
  return function (zjs) {
    // I'm putting this here in case it's helpful to manipulate z.js directly.
    // Most cheats are simple enough to implement without doing so, but there are some cases where it's just very handy.
    // InjectCheatsF5 (as of Jan 2023 release) will pass the z.js code to this function to allow for regex replacing etc before it is loaded by the game

    return zjs;
  }.toString();
}

/****************************************************************************************************
  A huge dictionary made for the bulk function:
  Since we'd hardly access this part of the code, it's fine being all the way down here.
*/
const DictDrops = {
  // 0) Handy cheat items
  default: ["Timecandy6", "ExpBalloon3", "ResetCompleted", "ResetCompletedS", "ClassSwap"],
  // 1) All bag boosters
  invbag: [
    "InvBag1",
    "InvBag2",
    "InvBag3",
    "InvBag4",
    "InvBag5",
    "InvBag6",
    "InvBag7",
    "InvBag8", //"InvBag9",
    "InvBag21",
    "InvBag22",
    "InvBag23",
    "InvBag24",
    "InvBag25",
    "InvBag26",
    "InvBag100",
    "InvBag101",
    "InvBag102",
    "InvBag103",
    "InvBag104",
    "InvBag105",
    "InvBag106",
    "InvBag107", //"InvBag101",
    "InvBag109",
    "InvBag110",
  ],
  // 2) All storage chest boosters
  invstorage: [
    "InvStorage1",
    "InvStorage2",
    "InvStorage3",
    "InvStorage4",
    "InvStorage5",
    "InvStorage6",
    "InvStorage7",
    "InvStorage8",
    "InvStorage9",
    "InvStorage10",
    "InvStorage11",
    "InvStorage12",
    "InvStorage13", //"InvStorage14",
    "InvStorage15",
    "InvStorage16",
    "InvStorage17",
    "InvStorage18",
    "InvStorage19",
    "InvStorage20",
    "InvStorage21",
    "InvStorage31",
    "InvStorage32",
    "InvStorage33",
    "InvStorage34",
    "InvStorage35",
    "InvStorage36",
    "InvStorage37",
    "InvStorage38",
    "InvStorage39",
    "InvStorage40",
    "InvStorage41",
    "InvStorage42",
    "InvStorageF",
  ],
  // 3) All item bag capacity boosters
  capbag: [
    "MaxCapBagT2",
    "MaxCapBag1",
    "MaxCapBag2",
    "MaxCapBag3",
    "MaxCapBag4",
    "MaxCapBag5",
    "MaxCapBagMi6",
    "MaxCapBagT1",
    "MaxCapBag7",
    "MaxCapBag9",
    "MaxCapBagT3",
    "MaxCapBagT4",
    "MaxCapBagT5",
    "MaxCapBagT6",
    "MaxCapBag6",
    "MaxCapBag8",
    "MaxCapBag10",
    "MaxCapBagF3",
    "MaxCapBagF4",
    "MaxCapBagF5",
    "MaxCapBagF6",
    "MaxCapBagM1",
    "MaxCapBagM2",
    "MaxCapBagM3",
    "MaxCapBagM4",
    "MaxCapBagM5",
    "MaxCapBagM6",
    "MaxCapBagM7",
    "MaxCapBagFi0",
    "MaxCapBagFi1",
    "MaxCapBagFi2",
    "MaxCapBagFi3",
    "MaxCapBagFi4",
    "MaxCapBagFi5",
    "MaxCapBagFi6",
    "MaxCapBagB0",
    "MaxCapBagB1",
    "MaxCapBagB2",
    "MaxCapBagB3",
    "MaxCapBagB4",
    "MaxCapBagB5",
    "MaxCapBagB6",
    "MaxCapBagTr0",
    "MaxCapBagTr1",
    "MaxCapBagTr2",
    "MaxCapBagTr3",
    "MaxCapBagTr4",
    "MaxCapBagTr5",
    "MaxCapBagS0",
    "MaxCapBagS1",
    "MaxCapBagS2",
    "MaxCapBagS3",
    "MaxCapBagS4",
    "MaxCapBagS5",
  ],
  // 4) All Yugioh cards
  yugioh: [
    "CardsA0",
    "CardsA1",
    "CardsA2",
    "CardsA3",
    "CardsA4",
    "CardsA5",
    "CardsA6",
    "CardsA7",
    "CardsA8",
    "CardsA9",
    "CardsA10",
    "CardsA11",
    "CardsA12",
    "CardsA13",
    "CardsA14",
    "CardsA15",
    "CardsA16",
    "CardsB1",
    "CardsB2",
    "CardsB3",
    "CardsB4",
    "CardsB5",
    "CardsB6",
    "CardsB7",
    "CardsB8",
    "CardsB9",
    "CardsB10",
    "CardsB11",
    "CardsB12",
    "CardsB13",
    "CardsB14",
    "CardsC1",
    "CardsC2",
    "CardsC3",
    "CardsC4",
    "CardsC5",
    "CardsC6",
    "CardsC7",
    "CardsC8",
    "CardsC9",
    "CardsC10",
    "CardsC11",
    "CardsC12",
    "CardsC13",
    "CardsC14",
    "CardsC15",
    "CardsC16",
    "CardsD1",
    "CardsD2",
    "CardsD3",
    "CardsD4",
    "CardsD5",
    "CardsD6",
    "CardsD7",
    "CardsD8",
    "CardsD9",
    "CardsD10",
    "CardsD11",
    "CardsD12",
    "CardsD13",
    "CardsD16",
    "CardsD17",
    "CardsD18",
    "CardsD19",
    "CardsD20",
    "CardsD21",
    "CardsE0",
    "CardsE1",
    "CardsE2",
    "CardsE3",
    "CardsE4",
    "CardsE5",
    "CardsE6",
    "CardsE7",
    "CardsE8",
    "CardsE9",
    "CardsE10",
    "CardsE11",
    "CardsE12",
    "CardsE13",
    "CardsE14",
    "CardsE15",
    "CardsF1",
    "CardsF2",
    "CardsF3",
    "CardsF4",
    "CardsF5",
    "CardsF6",
    "CardsF7",
    "CardsF8",
    "CardsF9",
    "CardsF10",
    "CardsF11",
    "CardsY0",
    "CardsY1",
    "CardsY2",
    "CardsY3",
    "CardsY4",
    "CardsY5",
    "CardsY5",
    "CardsY6",
    "CardsY7",
    "CardsY8",
    "CardsY9",
    "CardsY10",
    "CardsY11",
    "CardsY12",
    "CardsY13",
    "CardsZ0",
    "CardsZ1",
    "CardsZ2",
    "CardsZ3",
    "CardsZ4",
    "CardsZ5",
    "CardsZ6",
    "CardsZ7",
    "CardsZ8",
    "CardsZ9",
  ],
  // 5) All statues
  statues: [
    "EquipmentStatues1",
    "EquipmentStatues2",
    "EquipmentStatues3",
    "EquipmentStatues4",
    "EquipmentStatues5",
    "EquipmentStatues6",
    "EquipmentStatues7",
    "EquipmentStatues8",
    "EquipmentStatues9",
    "EquipmentStatues10",
    "EquipmentStatues11",
    "EquipmentStatues12",
    "EquipmentStatues13",
    "EquipmentStatues14",
    "EquipmentStatues15",
    "EquipmentStatues16",
    "EquipmentStatues17",
    "EquipmentStatues18",
    "EquipmentStatues19",
  ],
  // 6) All stamps (Many stamps aren't released yet)
  stamps: [
    "StampA1",
    "StampA2",
    "StampA3",
    "StampA4",
    "StampA5",
    "StampA6",
    "StampA7",
    "StampA8",
    "StampA9",
    "StampA10",
    "StampA11",
    "StampA12",
    "StampA13",
    "StampA14",
    "StampA15",
    "StampA16",
    "StampA17",
    "StampA18",
    "StampA19",
    "StampA20",
    "StampA21" /*,"StampA22"*/,
    "StampA23",
    "StampA24" /*,"StampA25"*/,
    "StampA26",
    "StampA27",
    "StampA28",
    //"StampA29","StampA30","StampA31","StampA32","StampA33","StampA34","StampA35",
    "StampB1",
    "StampB2",
    "StampB3",
    "StampB4",
    "StampB5",
    "StampB6",
    "StampB7",
    "StampB8",
    "StampB9",
    "StampB10",
    "StampB11",
    "StampB12",
    "StampB13",
    "StampB14",
    "StampB15",
    "StampB16",
    "StampB17",
    "StampB18",
    "StampB19",
    "StampB20",
    "StampB21",
    "StampB22",
    "StampB23",
    "StampB24",
    "StampB25",
    "StampB26",
    "StampB27", //"StampB28","StampB29",
    "StampB30",
    "StampB31" /*,"StampB32","StampB33"*/,
    "StampB34" /*,"StampB35"*/,
    "StampB36",
    "StampC1",
    "StampC2",
    "StampC3" /*,"StampC4","StampC5"*/,
    "StampC6",
    "StampC7" /*,"StampC8"*/,
    "StampC9", //"StampC10","StampC11","StampC12","StampC13",
    "StampC14",
    "StampC15" /*,"StampC16","StampC17","StampC18"*/,
    "StampC19",
    "StampC20",
  ],
  // 7) All fishing tools
  fishtools: [
    "Line1",
    "Line2",
    "Line3",
    "Line4",
    "Line5",
    "Line6",
    "Line7",
    "Line8",
    "Line9",
    "Line10",
    "Line11",
    "Line12",
    "Line13",
    "Line14",
    "Weight1",
    "Weight2",
    "Weight3",
    "Weight4",
    "Weight5",
    "Weight6",
    "Weight7",
    "Weight8",
    "Weight9",
    "Weight10",
    "Weight11",
    "Weight12",
    "Weight13",
    "Weight14",
  ],
  // 8) All released Star Talent books
  startalents: [
    //"3615100",  //Bored To Death (Lvl 100)
    "361650", //Beginner Best Class (Lvl 50)
    //"3617100",  //Studious Quester (Lvl 100)
    "3618100", //Quest Chungus (Lvl 100)
    "3619100", //Crystals 4 Dayys (Lvl 100)
    "362050", //Will Of The Eldest (Lvl 50)
    "3621104", //TICK TOCK (Lvl 104)
    "3622100", //STONKS! (Lvl 100)
    "3623100", //Roll Da Dice (Lvl 100)
    "362450", //Attacks on simmer (Lvl 50)
    "3625120", //Toilet Paper Postage (Lvl 120)
    "362640", //Exp Converter (Lvl 40)
    "362750", //Goblet Of Hemoglobin (Lvl 50)
    "3628100", //JUST EXP (Lvl 100)
    "3629100", //Frothy Malk (Lvl 100)
    "363050", //Convert Better Darnit (Lvl 50)
    "3631100", //PULSATION (Lvl 100)
    "3632100", //CARDIOVASCULAR! (Lvl 100)
    //"3633100",  //Nothing
    "363450", //Telekinetic Storage (Lvl 50)
    "3635100", //Printer Sampling (Lvl 100)
    "3639100", //Shrine Architect (Lvl 100)
    "3655100", //BOSS BATTLE SPILLOVER (Lvl 100)
    "3640100", //Mega Crit (Lvl 100)
  ],
  // 9) Blacksmith recipes and tabs
  smith: ["EquipmentSmithingTabs3", "SmithingHammerChisel", "SmithingHammerChisel2"],
  // 10) All skilling resources
  skill: [
    "Copper",
    "Iron",
    "Gold",
    "Plat",
    "Dementia",
    "Void",
    "Lustre",
    "Starfire",
    "Dreadlo",
    "Godshard",
    "CopperBar",
    "IronBar",
    "GoldBar",
    "PlatBar",
    "DementiaBar",
    "VoidBar",
    "LustreBar",
    "StarfireBar",
    "DreadloBar",
    "GodshardBar",
    "OakTree",
    "BirchTree",
    "JungleTree",
    "ForestTree",
    "ToiletTree",
    "PalmTree",
    "StumpTree",
    "SaharanFoal",
    "Tree7",
    "Leaf1",
    "Leaf2",
    "Leaf3",
    "Fish1",
    "Fish2",
    "Fish3",
    "Fish4",
    "Bug1",
    "Bug2",
    "Bug3",
    "Bug4",
    "Bug5",
    "Bug6",
    "PureWater",
    "Critter1",
    "Critter2",
    "Critter3",
    "Critter4",
    "Critter5",
    "Critter6",
    "Critter7",
    "Critter8",
    "Critter9",
    "Critter1A",
    "Critter2A",
    "Critter3A",
    "Critter4A",
    "Critter5A",
    "Critter6A",
    "Critter7A",
    "Critter8A",
    "Critter9A",
    "Soul1",
    "Soul2",
    "Soul3",
    "Soul4",
    "Soul5",
    "Soul6",
    "Refinery1",
    "Refinery2",
    "Refinery3",
    "Refinery4",
    "Refinery5",
    "Refinery6",
    "CraftMat1",
    "CraftMat2",
    "CraftMat3" /*,"CraftMat4"*/,
    "CraftMat5",
    "CraftMat6",
    "CraftMat7",
    "CraftMat8",
    "CraftMat9",
    "CraftMat10",
  ],
  // 11) All monster resources
  monster: [
    "Grasslands1",
    "Grasslands2",
    "Grasslands3",
    "Grasslands4",
    "Jungle1",
    "Jungle2",
    "Jungle3",
    "Forest1",
    "Forest2",
    "Forest3",
    "Sewers1",
    "Sewers1b",
    "Sewers2",
    "Sewers3",
    "TreeInterior1",
    "TreeInterior1b",
    "TreeInterior2",
    "BabaYagaETC",
    "DesertA1",
    "DesertA1b",
    "DesertA2",
    "DesertA3",
    "DesertA3b",
    "DesertB1",
    "DesertB2",
    "DesertB3",
    "DesertB4",
    "DesertC1",
    "DesertC2",
    "DesertC2b",
    "DesertC3",
    "DesertC4",
    "SnowA1",
    "SnowA2",
    "SnowA2a",
    "SnowA3",
    "SnowA4",
    "SnowB1",
    "SnowB2",
    "SnowB2a",
    "SnowB5",
    "SnowB3",
    "SnowB4",
    "SnowC1",
    "SnowC2",
    "SnowC3",
    "SnowC4",
    "SnowC4a",
    "IceMountains2",
    "Hgg",
    "EfauntDrop1",
    "EfauntDrop2",
  ],
  // 12) Most (not all) currencies and gift items
  currency: [
    "Key1",
    "Key2",
    "Key3",
    "SilverPen",
    "PremiumGem", //"DeliveryBox",
    "Quest30",
    "Quest35",
    "Quest36",
    "Quest38",
    "Quest40",
    "Quest42",
    "Quest44",
    "Quest45",
    "Quest49",
    "Quest50",
  ],
  // 13) Best food
  food: [
    "PeanutG",
    "FoodG1",
    "FoodG2",
    "FoodG3",
    "FoodG4",
    "FoodG5",
    "FoodG6",
    "Meatloaf",
    "MidnightCookie",
    "FoodPotOr3",
    "FoodPotRe3",
    "FoodPotGr3",
    "FoodPotMana3",
    "FoodPotYe3",
  ],
  // 14) All trophies
  trophy: [
    "Trophy1",
    "Trophy2",
    "Trophy3" /*,"Trophy4"*/,
    "Trophy5",
    "Trophy6",
    "Trophy7",
    "Trophy8",
    "Trophy9",
    "Trophy10",
    "Trophy11",
    "Trophy12",
    "Trophy13",
    "Trophy14",
  ],
  // 15) All upgrade stones (except lvl 1 and 2 cause 3 exists)
  upstone: [
    "StoneWe",
    "StoneWeb",
    "Stonew3",
    "StoneW6",
    "StoneA1b",
    "StoneA2b",
    "StoneA3b",
    "StoneA3",
    "StoneAe",
    "StoneAeB",
    "StoneHelm1",
    "StoneHelm6",
    "StoneHelm1b",
    "StoneTe",
    "StoneT1e",
    "StoneT1eb",
    "StoneT3",
    "StoneZ2",
    "StonePremSTR",
    "StonePremAGI",
    "StonePremWIS",
    "StonePremLUK",
  ],
  // 16) All premium hats
  phats: [
    "EquipmentHats31",
    "EquipmentHats32",
    "EquipmentHats33",
    "EquipmentHats34",
    "EquipmentHats35",
    "EquipmentHats36",
    "EquipmentHats40",
    "EquipmentHats37",
    "EquipmentHats38",
    "EquipmentHats46",
    "EquipmentHats47",
    "EquipmentHats48",
    "EquipmentHats49",
    "EquipmentHats50",
    "EquipmentHats43",
    "EquipmentHats45",
    "EquipmentHats57",
    "EquipmentHats62",
  ],
  // 17) High level Gear
  gear: [
    "EquipmentHats60",
    "EquipmentShirts28",
    "EquipmentShirts29",
    "EquipmentShirts30",
    "EquipmentPants21",
    "EquipmentShoes22",
    "EquipmentPendant14",
    "EquipmentPendant17",
    "EquipmentRings16",
    "EquipmentRings16",
    "EquipmentRings6",
    "EquipmentRings6",
    "EquipmentTools11",
    "EquipmentTools7",
    "EquipmentToolsHatchet5",
    "EquipmentToolsHatchet7",
    "CatchingNet7",
    "CatchingNet6",
    "FishingRod6",
    "FishingRod7",
    "EquipmentSword3",
    "EquipmentBows8",
    "EquipmentWands7",
    "EquipmentPunching5",
    "EquipmentHats58",
    "EquipmentHats59",
    "TrapBoxSet5",
    "WorshipSkull5",
  ],
  // 18) Cheat equipments (Some unreleased items which will definitely shadow ban you)
  cheat: [
    "EquipmentWeapons2",
    "TestObj16",
    "EquipmentRings8",
    "EquipmentPendant8",
    "EquipmentShoes12",
    "EquipmentPants13",
    "EquipmentShirts8",
  ],
};

const summonUnits = {
  vrumbi: 4,
  bloomy: 3,
  tonka: 5,
  regalis: 2,
  basic: 0,
};

const keychainStatsMap = {
  basedef: [1, "EquipmentKeychain0", "_BASE_DEFENCE", "5"],
  acc: [1, "EquipmentKeychain1", "_ACCURACY", "5"],
  movespd: [1, "EquipmentKeychain2", "%_MOVEMENT_SPEED", "2"],
  basedmg: [1, "EquipmentKeychain3", "_BASE_DAMAGE", "20"],
  carddr: [1, "EquipmentKeychain4", "%_CARD_DROP_CHANCE", "10"],
  money: [1, "EquipmentKeychain5", "%_MONEY", "10"],
  basestr: [1, "EquipmentKeychain6", "_STR", "6"],
  baseagi: [1, "EquipmentKeychain6", "_AGI", "6"],
  basewis: [1, "EquipmentKeychain7", "_WIS", "6"],
  basestr: [1, "EquipmentKeychain7", "_LUK", "6"],
  pctdef1: [3, "EquipmentKeychain8", "%_DEFENCE", "4"],
  mining: [2, "EquipmentKeychain9", "%_MINING_XP_GAIN", "20"],
  basedmg: [2, "EquipmentKeychain10", "%_TOTAL_DAMAGE", "3"],
  droprate: [2, "EquipmentKeychain11", "%_DROP_CHANCE", "8"],
  atkspd: [2, "EquipmentKeychain12", "%_BASIC_ATK_SPEED", "6"],
  crit: [2, "EquipmentKeychain13", "%_CRIT_CHANCE", "3"],
  fishing: [2, "EquipmentKeychain14", "%_FISHING_XP_GAIN", "20"],
  xp: [2, "EquipmentKeychain15", "%_XP_FROM_MONSTERS", "10"],
  mkill: [2, "EquipmentKeychain16", "%_MULTIKILL", "12"],
  pctdef2: [3, "EquipmentKeychain17", "%_DEFENCE", "8"],
  pctstr: [3, "EquipmentKeychain18", "%_STR", "6"],
  pctagi: [3, "EquipmentKeychain18", "%_AGI", "6"],
  afkgain: [3, "EquipmentKeychain19", "%_ALL_AFK_GAIN", "5"],
  pctdmg: [3, "EquipmentKeychain20", "%_TOTAL_DAMAGE", "7"],
  pctwis: [3, "EquipmentKeychain21", "%_WIS", "6"],
  pctstr: [3, "EquipmentKeychain21", "%_LUK", "6"],
  mobrsp: [3, "EquipmentKeychain22", "%_MOB_RESPAWN", "6"],
  skillspd: [3, "EquipmentKeychain23", "%_ALL_SKILL_SPEED", "2"],
  allstats: [3, "EquipmentKeychain24", "%_ALL_STATS", "4"],
};
/****************************************************************************************************
  This function is made to simplify some code, basically a bit of elementary programming.
  The arguments are as followed:
  dim 		= Amount of dimensions, can take values 2 to 4 (at 1D there's no reason for such complexity)
  KeyName 	= The respecitve key inside GameAttribute Customlist that we want to iterate
  repl 		= The replacement value
  elem 		= List of Array indices, which elements we want replaced
*/
function ChangeND(dim, KeyName, repl, elem) {
  let NDArr;
  if (typeof KeyName === "string")
    // Creates a deep-copy
    NDArr = JSON.parse(JSON.stringify(CList[KeyName]));
  else NDArr = KeyName; // Else this KeyName parameter is an object
  if (dim === 4) {
    for (const [index1, element1] of Object.entries(NDArr)) {
      for (const [index2, element2] of Object.entries(element1)) {
        for (const [index3, element3] of Object.entries(element2)) {
          for (i in elem)
            element3[elem[i]] = repl instanceof Function ? repl(element3[elem[i]]) : repl; // Fill every
          NDArr[index1][index2][index3] = element3; // Write back to the 4D Array
        }
      }
    }
  } else if (dim === 3) {
    for (const [index1, element1] of Object.entries(NDArr)) {
      for (const [index2, element2] of Object.entries(element1)) {
        for (i in elem)
          element2[elem[i]] = repl instanceof Function ? repl(element2[elem[i]]) : repl;
        NDArr[index1][index2] = element2; // Write back to the 3D Array
      }
    }
  } else if (dim === 2) {
    for (const [index1, element1] of Object.entries(NDArr)) {
      for (i in elem) element1[elem[i]] = repl instanceof Function ? repl(element1[elem[i]]) : repl;
      NDArr[index1] = element1; // Write back to the 2D Array
    }
  } else return NDArr; // Else return the original without modifications
  return NDArr;
} // This function's even less likely to ever be revisited, so it's nice here
/****************************************************************************************************
  The help function for gga/ggk
*/
function gg_func(Params, which) {
  const foundVals = [];
  try {
    let gga = bEngine.gameAttributes.h;
    let eva_gga;
    let obj_gga;
    if (Params.length > 0) {
      gga = bEngine.getGameAttribute(Params[0]);
      if ("h" in Object(gga)) gga = bEngine.getGameAttribute(Params[0]).h; // Some attributes may not have a .h
    }
    switch (Params.length) {
      case 2:
        eva_gga = gga[Params[1]];
        break;
      case 3:
        eva_gga = gga[Params[1]][Params[2]];
        break;
      case 4:
        eva_gga = gga[Params[1]][Params[2]][Params[3]];
        break;
      case 5:
        eva_gga = gga[Params[1]][Params[2]][Params[3]][Params[4]];
        break;
      default:
        // For every other length goes this
        eva_gga = gga;
        break;
    }
    if ("h" in Object(eva_gga)) eva_gga = eva_gga.h;
    let iterate = function (obj, depth) {
      if (typeof obj == "object") {
        if ("h" in obj) obj = obj.h;
        for (let index in obj) {
          if (typeof obj[index] == "object") {
            foundVals.push("  ".repeat(depth) + `${index}:`);
            iterate(obj[index], depth + 1);
          } else {
            if (which == 0) foundVals.push("  ".repeat(depth) + `${index}: ${obj[index]}`);
            // This one's for gga
            else foundVals.push("  ".repeat(depth) + `${index}`); // This one's for ggk
          }
        }
      } else {
        if (which == 0) foundVals.push("  ".repeat(depth) + `${obj}`);
        else foundVals.push("  ".repeat(depth) + `Non iterable value: ${obj}`);
      }
    };
    iterate(eva_gga, 0);
    if (typeof eva_gga == "object") {
      let keys = [];
      for (k in eva_gga) keys.push(k);
      foundVals.push(`Keys: ${keys.join(", ")}`);
    }

    return foundVals.join("\n");
  } catch (error) {
    return `Error: ${error}`;
  }
}
/*  Credit section:
 
  iBelg
    User profile:   https://fearlessrevolution.com/memberlist.php?mode=viewprofile&u=45315
  Tool release:	https://fearlessrevolution.com/viewtopic.php?p=199352#p199352
    > The creator of the console injection, designer of the cheats syntax as well as many cheats
 
  salmon85
    User profile:   https://fearlessrevolution.com/memberlist.php?mode=viewprofile&u=80266
    > Wipe inv, wipe forge and class lvl command
 
  Creater0822
    User profile:   https://fearlessrevolution.com/memberlist.php?mode=viewprofile&u=10529
    Google Drive:   https://drive.google.com/drive/folders/1MyEkO0uNEpGx1VctMEKZ5sQiNzuSZv36?usp=sharing
    > For the remaining commands
*/

/* Help & troubleshoot section:
 
      How to use:
      > Place iBelg's injecting tool and this script inside the game's root folder and execute the tool (not the game)
  > To close the game, you have to close the NodeJS console.
 
  The tool closes itself instantly after execution?!?!
  The error shows things like: UnhandledPromiseRejectionWarning: Error: No inspectable targets
  > You probably forgot to have the Steam client launched in the background.
 
  The game is has been loaded, but the console doesn't load.
  > There could be multiple sessions running.
  > If you rapidly re-start the injected game after closing it, the previous process may not be killed yet.
*/
