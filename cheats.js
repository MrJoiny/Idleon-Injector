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
const itemTypes = new Set();

let iframe; // Declare iframe globally, initialize later

// ingame webui
let uiIframe;
let uiContainer;
let isUiExpanded = false;

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
  Object.values(itemDefs).forEach(entry => {
    const type = entry.h?.Type;
    if (type) itemTypes.add(type);
  });
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
    const item = params[0];
    const amount = params[1] || 1;

    dropOnChar(item, amount);
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
    "unlock portals, rifts, pearls, presets, quickref, teleports, colloseum, silver pens, revives, storagecrafting",
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
    {
      name: "storagecrafting",
      message: "unlocks craft from storage feature for all items in the anvil",
      fn: function () {
        const status = bEngine.getGameAttribute("AnvilCraftStatus");
        for (let i = 0; i < status.length; i++) {
          const tab = status[i];
          if (!tab) continue;
          for (let j = 0; j < tab.length; j++) {
            if (tab[j] == 0) tab[j] = 1;
          }
        }
        return "Unlocked all anvil crafts.";
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
        ["Santa helper bundle", "bon_p"],
      ].map(([name, code]) => createBundleCheat(name, code));
    })(),
  ],
});

// TODO: fix the proxy in proxy issue that would appear, when minigame is called multiple times.
const minigameCheat = function (params) {
  setupMinigameProxy.call(this);
  setupCatchingMinigameProxy.call(this);
  setupGeneralInfoProxy.call(this);
  setupPoingProxy.call(this);
  setupHoopsMinigameProxy.call(this);
  setupDartsMinigameProxy.call(this);
  setupMonumentProxy.call(this);
  setupScratchMinigameProxy.call(this);
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
    { name: "wisdom", message: "wisdom monument minigame cheat", fn: minigameCheat },
    { name: "scratch", message: "event scratch minigame cheat", fn: minigameCheat },
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
    { name: "gems", message: "freezes current gem amount" },
    {
      name: "plunderous",
      message: "100% plunderous mob spawn rate",
      configurable: { isObject: true },
    },
    { name: "candy", message: "candy use everywhere" },
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

registerCheats({
  name: "w1",
  message: "all w1 cheats.",
  canToggleSubcheats: true,
  subcheats: [
    { name: "anvil", message: "anvil cost and duration nullification." },
    { name: "forge", message: "forge speed and capacity multiplier check config" },
    { name: "stampcost", message: "stamp cost reduction multiplier check config" },
    {
      name: "smith",
      message: "smithing cost nullification (change maps to have the effect apply).",
    },
    { name: "companion", message: "companions cheat", configurable: true },
    { name: "owl", message: "owl cheats, check config file", configurable: true }
  ],
});

// All w2 related Proxy cheats
registerCheats({
  name: "w2",
  message: "World 2 cheats",
  canToggleSubcheats: true,
  subcheats: [
    { name: "boss", message: "unlimited boss attempts" },
    { name: "roo", message: "roo cheats, check config file", configurable: true },
    { name: "alchemy", message: "alchemy cheats, check config file", configurable: true },
    { name: "vialrng", message: "vial unlock upon rolling 1+" },
    { name: "vialattempt", message: "unlimited vial attempts" },
    { name: "sigilspeed", message: "fast sigil research (see config)" },
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
      name: "endercaptains",
      message: "100% ender captains (requires Emporium bonus unlock)",
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
    },
    {
      name: "sneaksymbol",
      message: "sneaksymbol 100% chance",
      configurable: { isObject: true },
    },
    {
      name: "ninjaItem",
      message: "Generates a ninja item based on the floor which ninja twin is inputted.",
      fn: function (params) {
        if (params && params[1]) {
          const char = parseInt(params[1]);
          let loopTimes = 1;

          // TODO: make this dynamic with character count
          if (char < 0 || char > 9)
            return `Please choose a ninja twin to generate item, 0 -> first char, 1 -> second char.`;
          try {
            loopTimes = params[2] && parseInt(params[2]) > 0 ? parseInt(params[2]) : 1;
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
    },
    {
      name: "sumunit",
      message: "Set summoning units to be always a certain type",
      fn: function (params) {
        if (params && params[1]) {
          try {
            if (params[1] === "reset") {
              cheatConfig.w6.summoning["UnitTypeDraw"] = (t) => t;
              return `summoning units has been reset to default`;
            }

            const summonUnit = summonUnits[params[1]];
            if (summonUnit || summonUnit === 0) {
              cheatConfig.w6.summoning["UnitTypeDraw"] = (t) => summonUnit;
              return `${params[1]} set as unit to be drawn`;
            }
            return `no such unit ${params[1]} found`;
          } catch (err) {
            return `Error: ${err}`;
          }
        }
        return `Please input a unit name 'basic' 'vrumbi' 'bloomy' 'tonka' 'regalis' 'sparkie' 'guardio' 'muddah' OR 'reset' to summon as per normal.`;
      },
    },
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
      name: "bubba",
      message: "bubba cheats check config file",
      configurable: { isObject: true },
    },
    {
      name: "zenith",
      message: "zenith market cheats check config file",
      configurable: { isObject: true },
    },
  ],
});

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
    // init nomore, removed from config because of the webui overwriting it
    if (!cheatConfig.nomore) {
      cheatConfig.nomore = {
        items: [],
      };
    }
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

registerCheat(
  "multiplestacks",
  function (params) {
    // init multiplestack, removed from config because of the webui overwriting it
    if (!cheatConfig.multiplestacks) {
      cheatConfig.multiplestacks = {
        items: new Map(),
      }
    }

    const name = params[0];
    const amount = params[1];
    if (cheatConfig.multiplestacks.items.has(name) && amount <= 1) {
      cheatConfig.multiplestacks.items.delete(name);
      return `${name} has been removed from multiplestacks.`;
    } else {
      cheatConfig.multiplestacks.items.set(name, amount);
      return `${name} has been added to multiplestacks with ${amount} stacks.`;
    }
  },
  `Will make multiple stacks of specified items in chest when autochest is on.`
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
        dictVals.itemDefs = deepCopy(itemDefs);
        dictVals.CardStuff = deepCopy(CList.CardStuff);
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


const listFunction = function (params) {

  const formatText = (name) => name.replace(/_/g, " ").toLowerCase();

  const listType = params[0];
  const filterQuery = params[1];
  const results = [];

  const listHandlers = {
    item: () => {
      results.push("Id, ingameName");
      for (const [key, value] of Object.entries(itemDefs)) {
        if (key.startsWith("Cards")) {
          const desc1 = formatText(value.h.desc_line1);
          const desc2 = formatText(value.h.desc_line2);
          const displayName = (desc1 + desc2).replace("filler", "");
          results.push(`${key}, ${displayName}`);
          continue;
        }
        const displayName = formatText(value.h.displayName);
        results.push(`${key}, ${displayName}`);
      }
    },

    bundle: () => {
      results.push("Bundle, Message");
      const bundleMessages = this["scripts.CustomMapsREAL"].GemPopupBundleMessages().h;

      for (const [key, value] of Object.entries(bundleMessages)) {
        if (key === "Blank") continue;

        const cleanedMessage = formatText(value);
        results.push(`${key}, ${cleanedMessage}`);
        results.push("\n");
      }
    },

    missing_bundle: () => {
      results.push("Bundle, Message");
      const bundleMessages = this["scripts.CustomMapsREAL"].GemPopupBundleMessages().h;
      const bundlesReceived = bEngine.gameAttributes.h.BundlesReceived.h;

      for (const [key, value] of Object.entries(bundleMessages)) {
        const isNotReceived = bundlesReceived[key] !== 1;
        const isNotBlank = key !== "Blank";

        if (isNotReceived && isNotBlank) {
          const cleanedMessage = formatText(value);
          results.push(`${key}, ${cleanedMessage}`);
          results.push("\n");
        }
      }
    },

    monster: () => {
      results.push("Id, ingameName, HP, Defence, Damage, EXP");
      for (const [key, value] of Object.entries(monsterDefs)) {
        const monsterData = value.h;
        const name = formatText(monsterData.Name);
        const hp = monsterData.MonsterHPTotal;
        const defence = monsterData.Defence;
        const damage = monsterData.Damages[0];
        const exp = monsterData.ExpGiven;

        results.push(`${key}, ${name}, ${hp}, ${defence}, ${damage}, ${exp}`);
      }
    },

    card: () => {
      results.push("Id, Entity, Value, Effect");
      const cardData = CList.CardStuff;

      for (const category of Object.values(cardData)) {
        for (const card of Object.values(category)) {
          if (!card[0]) continue;

          const cardId = card[0];
          const cardValue = card[4];
          const cardEffect = card[3];
          const entityName = monsterDefs[cardId]?.h?.Name ?? "Unknown";

          results.push(`${cardId}, ${entityName}, ${cardValue}, ${cardEffect}`);
        }
      }
    },

    class: () => {
      results.push("Id, ClassName, PromotesTo");
      for (const [index, className] of CList.ClassNames.entries()) {
        const promotions = CList.ClassPromotionChoices[index];
        results.push(`${index}, ${className}, [${promotions}]`);
      }
    },

    quest: () => {
      results.push("Id, QuestName, NPC, QuestlineNo, paramX1");
      for (const [index, questId] of CList.SceneNPCquestOrder.entries()) {
        const questInfo = CList.SceneNPCquestInfo[index].join(", ");
        results.push(`${questId}, ${questInfo}`);
      }
    },

    map: () => {
      results.push("Num_Id, Str_Id, MapName, AFK1, AFK2, Transition");
      for (const [index, mapId] of CList.MapName.entries()) {
        const displayName = CList.MapDispName[index];
        const afkTarget = CList.MapAFKtarget[index];
        const afkTargetSide = CList.MapAFKtargetSide[index];
        const transitions = CList.SceneTransitions[index];

        results.push(`${index}, ${mapId}, ${displayName}, ${afkTarget}, ${afkTargetSide}, [${transitions}]`);
      }
    },

    talent: () => {
      results.push("Order, Id, Name");
      const talentOrder = CList.TalentOrder;
      const talentNames = CList.TalentIconNames;

      for (let i = 0; i < talentOrder.length; i++) {
        const talentId = talentOrder[i];
        const talentName = talentNames[talentId];

        if (talentName !== "_") {
          results.push(`${i}, ${talentId}, ${talentName}`);
        }
      }
    },

    ability: () => {
      results.push("Order, Id, Name");
      const talentOrder = CList.TalentOrder;
      const talentNames = CList.TalentIconNames;
      const abilityMap = this["scripts.CustomMaps"].atkMoveMap.h;

      for (let i = 0; i < talentOrder.length; i++) {
        const talentId = talentOrder[i];
        const talentName = talentNames[talentId];

        // Only include talents that are abilities (exist in abilityMap)
        const isValidTalent = talentName !== "_";
        const isAbility = abilityMap[talentName];

        if (isValidTalent && isAbility) {
          results.push(`${i}, ${talentId}, ${talentName}`);
        }
      }
    },

    companion: () => {
      results.push("Id, Name, Effects");
      const companions = CList.CompanionDB;

      for (let i = 0; i < companions.length; i++) {
        const id = companions[i][0];
        const effects = formatText(companions[i][1]);
        const ingameName = formatText(monsterDefs[id]?.h?.Name) ?? "Unknown";
        results.push(`${i}, ${ingameName}, ${effects}`);
      }
    },

    smith: () => {
      results.push("CraftId, Tab, ItemId, ItemName");
      const craftingRecipes = CList.ItemToCraftNAME;

      for (let tabIndex = 0; tabIndex < craftingRecipes.length; tabIndex++) {
        const tab = craftingRecipes[tabIndex];

        for (let recipeIndex = 0; recipeIndex < tab.length; recipeIndex++) {
          const itemId = tab[recipeIndex];
          const itemName = formatText(itemDefs[itemId].h.displayName);

          results.push(`${tabIndex + 1}, ${recipeIndex}, ${itemId}, ${itemName}`);
        }
      }
    },

    gga: () => {
      for (const key of Object.keys(bEngine.gameAttributes.h)) {
        results.push(key);
      }
    },
  };

  const handler = listHandlers[listType];
  if (!handler) {
    const validTypes = Object.keys(listHandlers).join("\n ");
    return `Valid sub-commands are:\n ${validTypes}`;
  }

  handler.call(this);

  // filter if provided
  if (filterQuery) {
    return results
      .filter((entry) => entry.includes(filterQuery))
      .join("\n");
  }

  return results.join("\n");
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
    {
      name: "companion",
      message: "list all companions",
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

    // Ensure cheatConfig.multiply exists with defaults
    // TODO: find a better solution
    if (!cheatConfig.multiply) {
      cheatConfig.multiply = {
        damage: 1,
        efficiency: 1,
        afk: 1,
        drop: 1,
        money: 1,
        classexp: 1,
        crystal: 1,
        skillexp: 1,
        shopstock: 1,
        printer: 1,
        monsters: 1,
      };
    }

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
    // window[0].agIis = function () { };
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

    // TODO: books, anvil receipe only drop default | dungeon items drop with ring, weap, etc.
    registerCheats({
      name: "bulk",
      message: "Drop a collection of items at once. Usage: bulk [sub-command] [amount]",
      canToggleSubcheats: true,
      subcheats: Array.from(itemTypes).sort().map(type => ({
        name: type,
        message: `Drop all items of type ${type}`,
        fn: function (params) {
          const amount = parseInt(params[0]) || 1;
          const blackList = CList.RANDOlist[64];
          let droppedCount = 0;

          for (const [code, entry] of Object.entries(itemDefs)) {
            if (entry.h?.Type === type && !blackList.includes(code)) {
              dropOnChar(code, amount);
              droppedCount++;
            }
          }
          return `Dropped ${droppedCount} types of ${type} items (x${amount} each)`;
        }
      }))
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

    // inject webui ingame
    if (cheatConfig.ingameUI) injectWebUI();

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
  setupGemsProxy.call(this);
  setupSteamAchProxy.call(this);
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
  setupw5Proxies.call(this);
  setupw6Proxies.call(this);
  setupw7Proxies.call(this);
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
        setupAlchProxy.call(this);
        setupMonsterProxy.call(this);
        return result;
      },
    });
  }
}

// the game is spamming via stdout? to steam and that freezes the game with the cheatinject
// this creates a list that already sent to steam and stops the spam
function setupSteamAchProxy() {
  let achieveList = [];
  this["FirebaseStorage"].areaCheck = new Proxy(this["FirebaseStorage"].areaCheck, {
    apply: function (target, thisArg, args) {
      if (!cheatConfig.steamachieve) return;
      if (achieveList.includes(args[0])) return;
      achieveList.push(args[0]);
      return Reflect.apply(target, thisArg, args)
    }
  });
}

// freezes gems not changable
function setupGemsProxy() {
  createProxy(bEngine.gameAttributes.h, "GemsOwned", {
    get: function (original) {
      return original;
    },
    set: function (value, backupKey) {
      if (cheatState.wide.gems) return;
      this[backupKey] = value
    },
  });
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

      // this forces the vip book to always be max level, it does not show ingame
      if (cheatState.w3.book && bEngine.getGameAttribute("MenuType2") == 31 && argumentsList[0] == 1) {
        return argumentsList[1];
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

      //Easy to read boolean checks
      const dropType = context._DropType;
      const itemType = itemDefs[dropType].h.Type;
      const toChest = cheatConfig.wide.autoloot.itemstochest;
      const playerDropped = context._PlayerDroppedItem !== 0;
      const blockAutoLoot = context._BlockAutoLoot !== 0;
      const safeToLootItem = lootableItemTypes.includes(itemType) || dropType === "Quest110"; // Zenith Clusters.
      const inDungeon = context._DungItemStatus !== 0 || actorEvents345._customBlock_Dungon() !== -1;
      const notAnItem = bEngine.getGameAttribute("OptionsListAccount")[83] !== 0 || !itemDefs[dropType];

      // Early Pre-check logic
      if (!cheatState.wide.autoloot || inDungeon || notAnItem || playerDropped || blockAutoLoot || !safeToLootItem)
        return;

      // Collect item into first open inventory slot
      context._CollectedStatus = 0;
      bEngine.gameAttributes.h.DummyNumber4 = 23.34;
      context._customEvent_ItemPickupInTheFirstPlace();

      // Get coin and card information.
      const isCoin = "COIN".includes(dropType);
      const isCard = dropType.substring(0, 5) === "Cards";

      // Deal with coins and cards.
      if (isCoin || isCard) {
        const moneyKey = cheatConfig.wide.autoloot.moneytochest && isCoin ? "MoneyBANK" : "Money";
        bEngine.gameAttributes.h[moneyKey] = bEngine.getGameAttribute(moneyKey) + context._DropAmount;
        context._DropAmount = 0;
        context._ImageInst = null;
        behavior.recycleActor(context.actor);
        return;
      }

      // Separate out items for Zenith farming and Material farming
      // Materials as in Monster drops for stamps and such.
      const zenithFarming = (itemType === "STATUE" || dropType === "Quest110") && cheatConfig.wide.autoloot.zenithfarm;
      const materialFarming = itemType === "MONSTER_DROP" && cheatConfig.wide.autoloot.materialfarm;
      if (!toChest || zenithFarming || materialFarming) {
        context._DropAmount = 0;
        context._ImageInst = null;
        behavior.recycleActor(context.actor);
        return rtn;
      }

      // Variable setup for chest and inventory management.
      const chestOrder = bEngine.getGameAttribute("ChestOrder");
      const chestQuantity = bEngine.getGameAttribute("ChestQuantity");
      const inventoryOrder = bEngine.getGameAttribute("InventoryOrder");
      const itemQuantity = bEngine.getGameAttribute("ItemQuantity");

      // First open slots for item and blank spot.
      const blankSlot = chestOrder.indexOf("Blank");
      const dropSlot = chestOrder.indexOf(dropType);
      let chestSlot = dropSlot !== -1 ? dropSlot : blankSlot;

      // Check if item is on Multiple stacks list.
      const items = cheatConfig.multiplestacks?.items ?? new Map();
      // Grab correct slot for multiple stacks.
      if (items.has(dropType)) {
        const maxStacks = items.get(dropType);
        let stackCount = 0;
        let chestSlotFound = false;

        for (let i = 0; i < chestOrder.length; i++) {
          if (chestOrder[i] !== dropType) continue;

          stackCount++;
          if (chestQuantity[i] < 1050000000) {
            chestSlotFound = true;
            chestSlot = i;
            break;
          }
          if (stackCount >= maxStacks) {
            chestSlotFound = true;
            break;
          }
        }

        if (!chestSlotFound && blankSlot !== -1)
          chestSlot = blankSlot;
      }

      // Move item from inventory into chest if the slot isn't locked.
      let inventorySlot;
      while (chestSlot !== -1 &&
      (inventorySlot = inventoryOrder.indexOf(dropType)) !== -1 &&
      !bEngine.getGameAttribute("LockedSlots")[inventorySlot !== -1 ? inventorySlot : 0]) {
        chestOrder[chestSlot] = chestOrder[chestSlot] === "Blank" ? context._DropType : chestOrder[chestSlot];
        chestQuantity[chestSlot] += itemQuantity[inventorySlot];
        itemQuantity[inventorySlot] = 0;
        inventoryOrder[inventorySlot] = "Blank";
      }

      // Zero out values and return.
      context._DropAmount = 0;
      context._ImageInst = null;
      behavior.recycleActor(context.actor);
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
  const monsterRespawnTime = bEngine.gameAttributes.h.MonsterRespawnTime;

  if (monsterRespawnTime._isPatched) return;
  Object.defineProperty(monsterRespawnTime, "_isPatched", { value: true, enumerable: false });

  const respawnHandler = {
    set(target, prop, value) {
      const newValue = cheatState.godlike.respawn
        ? cheatConfig.godlike.respawn(value)
        : value;
      target[prop] = newValue;
      return true;
    },
  };


  bEngine.gameAttributes.h.MonsterRespawnTime = new Proxy(monsterRespawnTime, respawnHandler);
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
  const optionsListAccount = bEngine.gameAttributes.h.OptionsListAccount;

  if (optionsListAccount._isPatched) return;
  Object.defineProperty(optionsListAccount, "_isPatched", { value: true, enumerable: false });

  // unban
  createProxy(optionsListAccount, 26, {
    get: function (original) {
      if (cheatState.unban) return 0;
      return original;
    },
    set: function (value, backupKey) {
      if (cheatState.unban) return;
      this[backupKey] = value
    },
  });

  // unlimited eventitems
  createProxy(optionsListAccount, 29, {
    get: function (original) {
      if (cheatState.wide.eventitems) return 0;
      return original;
    },
    set: function (value, backupKey) {
      if (cheatState.wide.eventitems) return;
      this[backupKey] = value
    },
  });

  // unlimited minigames
  createProxy(optionsListAccount, 33, {
    get: function (original) {
      if (cheatState.minigames) return 1;
      return original;
    },
    set: function (value, backupKey) {
      if (cheatState.minigames) return;
      this[backupKey] = value
    },
  });

  // unlock quickref everywhere
  createProxy(optionsListAccount, 34, {
    get: function (original) {
      if (cheatState.unlock.quickref) return 0;
      return original;
    },
    set: function (value, backupKey) {
      if (cheatState.unlock.quickref) return;
      this[backupKey] = value
    },
  });

  // set maximum dungeon creditcap, prevent account bricking
  // 71 - total number of credits, for rank
  createProxy(optionsListAccount, 71, {
    get: function (original) {
      return original;
    },
    set: function (value, backupKey) {
      value = Math.min(cheatConfig.maxval.creditcap, value);
      this[backupKey] = value
    },
  });

  // set maximum dungeon creditcap, prevent account bricking
  // 72 - current amount of credits
  createProxy(optionsListAccount, 72, {
    get: function (original) {
      return original;
    },
    set: function (value, backupKey) {
      value = Math.min(cheatConfig.maxval.creditcap, value);
      this[backupKey] = value
    },
  });

  // set maximum dungeon flurbocap, prevent account bricking
  // 73 - current amount of flurbo
  createProxy(optionsListAccount, 73, {
    get: function (original) {
      return original;
    },
    set: function (value, backupKey) {
      value = Math.min(cheatConfig.maxval.flurbocap, value);
      this[backupKey] = value
    },
  });

  // w4 unlimited spiceclaim
  createProxy(optionsListAccount, 100, {
    get: function (original) {
      if (cheatState.w4.spiceclaim) return 0;
      return original;
    },
    set: function (value, backupKey) {
      if (cheatState.w4.spiceclaim) return;
      this[backupKey] = value
    },
  });

  // unlocks islands via string from config
  createProxy(optionsListAccount, 169, {
    get: function (original) {
      if (cheatState.unlock.islands) return cheatConfig.unlock.islands;
      return original;
    },
    set: function (value, backupKey) {
      if (cheatState.unlock.islands) return;
      this[backupKey] = value
    },
  });

  // boss attempts / not sure what it does and how it works
  // sets to 0 if cheat is enabled and original is 10
  createProxy(optionsListAccount, 185, {
    get: function (original) {
      if (cheatState.w2.boss && original == 10) original = 0;
      return original;
    },
    set: function (value, backupKey) {
      this[backupKey] = value
    },
  });

  // event spins
  createProxy(optionsListAccount, 325, {
    get: function (original) {
      if (cheatState.wide.eventspins) return 10;
      return original;
    },
    set: function (value, backupKey) {
      if (cheatState.wide.eventspins) return;
      this[backupKey] = value
    },
  });

  // max cap for total bones
  createProxy(optionsListAccount, 329, {
    get: function (original) {
      return original;
    },
    set: function (value, backupKey) {
      if (isNaN(value)) {
        this[backupKey] = cheatConfig.maxval.totalbones;
        return;
      }
      value = Math.min(cheatConfig.maxval.totalbones, value);
      this[backupKey] = value
    },
  });

  // max cap for all bones
  bonesID = [330, 331, 332, 333]
  bonesID.forEach(index => {
    createProxy(optionsListAccount, index, {
      get: function (original) {
        return original;
      },
      set: function (value, backupKey) {
        if (isNaN(value)) {
          this[backupKey] = cheatConfig.maxval.bones;
          return;
        }
        value = Math.min(cheatConfig.maxval.bones, value);
        this[backupKey] = value
      },
    });
  });

  // max cap for all dusts
  dustID = [357, 358, 359, 360, 361]
  dustID.forEach(index => {
    createProxy(optionsListAccount, index, {
      get: function (original) {
        return original;
      },
      set: function (value, backupKey) {
        if (isNaN(value)) {
          this[backupKey] = cheatConfig.maxval.dust;
          return;
        }
        value = Math.min(cheatConfig.maxval.dust, value);
        this[backupKey] = value
      },
    });
  });

  // max cap for total dust
  createProxy(optionsListAccount, 362, {
    get: function (original) {
      return original;
    },
    set: function (value, backupKey) {
      if (isNaN(value)) {
        this[backupKey] = cheatConfig.maxval.totaldust;
        return;
      }
      value = Math.min(cheatConfig.maxval.totaldust, value);
      this[backupKey] = value
    },
  });

  // unlimited emperor runs 
  createProxy(optionsListAccount, 370, {
    get: function (original) {
      if (cheatState.w6.emperor) return -10;
      return original;
    },
    set: function (value, backupKey) {
      if (cheatState.w6.emperor) return;
      this[backupKey] = value
    },
  });

  // max cap for all tach
  tachID = [388, 389, 390, 391, 392, 393]
  tachID.forEach(index => {
    createProxy(optionsListAccount, index, {
      get: function (original) {
        return original;
      },
      set: function (value, backupKey) {
        if (isNaN(value)) {
          this[backupKey] = cheatConfig.maxval.tach;
          return;
        }
        value = Math.min(cheatConfig.maxval.tach, value);
        this[backupKey] = value
      },
    });
  });

  // max cap for total tach
  createProxy(optionsListAccount, 394, {
    get: function (original) {
      return original;
    },
    set: function (value, backupKey) {
      if (isNaN(value)) {
        this[backupKey] = cheatConfig.maxval.totaltach;
        return;
      }
      value = Math.min(cheatConfig.maxval.totaltach, value);
      this[backupKey] = value
    },
  });

  // unlimited jeweled cogs
  createProxy(optionsListAccount, 414, {
    get: function (original) {
      if (cheatState.w3.jeweledcogs) return 0;
      return original;
    },
    set: function (value, backupKey) {
      if (cheatState.w3.jeweledcogs) return;
      this[backupKey] = value
    },
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

    if (cheatState.w1.forge) {
      // 1 = forge capacity (branch with ForgeCap stamp / furnace levels)
      if (key === 1) return cheatConfig.w1.forge.capacity(base);
      // 2 = forge speed (used by ForgeSpeeed)
      if (key === 2) return cheatConfig.w1.forge.speed(base);
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
    // if cheatConfig.nomore not defined, return all drops
    if (!cheatConfig.nomore) return drops;
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
  const atkMoveMap = deepCopy(this["scripts.CustomMaps"].atkMoveMap.h);
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

function setupCListProxy() {
  // this stops the function from running multiple times, if already proxied
  if (CList._isPatched) return;
  Object.defineProperty(CList, "_isPatched", { value: true, enumerable: false });

  // Nullify MTX cost / Set gem buy limit
  const mtxIndex = [3, 7]
  const gembuylimitIndex = 5

  traverse(CList.MTXinfo, 3, (data) => {
    // free mtx
    mtxIndex.forEach(index => {
      createProxy(data, index, (original) => {
        if (cheatState.wide.mtx) return 0;
        return original;
      });
    })

    // gembuylimit
    createProxy(data, gembuylimitIndex, (original) => {
      if (cheatState.wide.gembuylimit) return Math.max(original, cheatConfig.wide.gembuylimit);
      return original;
    })
  })

  // Nullify refinery cost
  const refineryIndex = [6, 7, 8, 9, 10, 11]

  traverse(CList.RefineryInfo, 1, (data) => {
    refineryIndex.forEach(index => {
      createProxy(data, index, (original) => {
        if (cheatState.w3.refinery) return "0";
        return original;
      });
    })
  })

  // Vials unlock at rollin 1+
  const vials = CList.AlchemyVialItemsPCT;
  createProxy(CList, "AlchemyVialItemsPCT", (original) => {
    if (cheatState.w2.vialrng) return new Array(vials.length).fill(99);
    return original;
  })

  // Nullify Saltlick upgrade cost
  traverse(CList.SaltLicks, 1, (data) => {
    createProxy(data, 2, (original) => {
      if (cheatState.w3.saltlick) return "0";
      return original;
    })
  })

  // Nullify prayer requirements
  const prayerIndex = [4, 6]

  traverse(CList.PrayerInfo, 1, (data) => {
    prayerIndex.forEach(index => {
      createProxy(data, index, (original) => {
        if (cheatState.w3.prayer) return "0";
        return original;
      })
    })

    createProxy(data, 2, (original) => {
      if (cheatState.w3.prayer) return "None._Even_curses_need_time_off_every_now_and_then.";
      return original;
    })
  })

  // Nullify post office order cost
  traverse(CList.PostOfficePossibleOrders, 3, (data) => {
    createProxy(data, 1, (original) => {
      if (cheatState.wide.post) return "0";
      return original;
    })
  })


  // Nullify guild task requirements
  traverse(CList.GuildGPtasks, 1, (data) => {
    createProxy(data, 1, (original) => {
      if (cheatState.wide.guild) return "0";
      return original;
    })
  })

  // Nullify task requirements
  const taskIndex = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

  traverse(CList.TaskDescriptions, 2, (data) => {
    taskIndex.forEach(index => {
      createProxy(data, index, (original) => {
        if (cheatState.wide.task) return "0";
        return original;
      })
    })
  })

  // Nullify star sign unlock req
  traverse(CList.SSignInfoUI, 1, (data) => {
    createProxy(data, 4, (original) => {
      if (cheatState.wide.star) return "0";
      return original;
    })
  })

  // Nullify worship cost
  traverse(CList.WorshipBASEinfos, 1, (data) => {
    createProxy(data, 6, (original) => {
      if (cheatState.w3.freeworship) return "0";
      return original;
    })
  })

}

// The proxy that allows us to enable/disable quest item requirement nullifications whenever we like
function setupQuestProxy() {
  const dialogueDefs = this["scripts.DialogueDefinitions"].dialogueDefs.h;
  const dialogueDefsOriginal = deepCopy(dialogueDefs);
  const dialogueDefsUpdated = deepCopy(dialogueDefs);
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

  if (p2w._isPatched) return;
  Object.defineProperty(p2w, "_isPatched", { value: true, enumerable: false });

  createProxy(p2w[5], 0, {
    get: function (original) {
      return cheatState.w2.vialattempt ? this[1] : original;
    },
    set: function (value, backupKey) {
      if (cheatState.w2.vialattempt) return;
      this[backupKey] = value;
    },
  });
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
  const actorEvents345 = events(345);
  const actorEvents189 = events(189);

  const Roo = actorEvents579._customBlock_Summoning;
  actorEvents579._customBlock_Summoning = function (...argumentList) {
    return cheatState.w2.roo && cheatConfig.w2.roo.hasOwnProperty(argumentList[0])
      ? cheatConfig.w2.roo[argumentList[0]](Reflect.apply(Roo, this, argumentList))
      : Reflect.apply(Roo, this, argumentList);
  };

  // wide arcade, not sure if this should be switched to w2 arcade?
  const DungeonCalc = actorEvents345._customBlock_DungeonCalc;
  actorEvents345._customBlock_DungeonCalc = function (...argumentList) {
    return cheatState.wide.arcade && cheatConfig.wide.arcade.hasOwnProperty(argumentList[0])
      ? cheatConfig.wide.arcade[argumentList[0]](Reflect.apply(DungeonCalc, this, argumentList))
      : Reflect.apply(DungeonCalc, this, argumentList);
  };

  // alchemy cheats
  const Alchemy = actorEvents189._customBlock_CauldronStats;
  actorEvents189._customBlock_CauldronStats = function (...argumentList) {
    return cheatState.w2.alchemy && cheatConfig.w2.alchemy.hasOwnProperty(argumentList[0])
      ? cheatConfig.w2.alchemy[argumentList[0]](Reflect.apply(Alchemy, this, argumentList))
      : Reflect.apply(Alchemy, this, argumentList);
  };
}

// w3 cheats
function setupw3StuffProxy() {
  const actorEvents345 = events(345);
  const actorEvents481 = events(481);
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

  // tbh this should be removed for good!
  const Workbenchstuff = actorEvents481.prototype._customEvent_WorkbenchStuff2
  actorEvents481.prototype._customEvent_WorkbenchStuff2 = new Proxy(Workbenchstuff, {
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
    if (cheatState.w2.sigilspeed && t == "SigilBonusSpeed")
      return cheatConfig.w2.alchemy.sigilspeed(Reflect.apply(Lab, this, argumentsList));
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
    let res = Reflect.apply(Sailing, this, argumentsList);
    if (cheatState.w5.sailing && cheatConfig.w5.sailing.hasOwnProperty(argumentsList[0]))
      return cheatConfig.w5.sailing[argumentsList[0]](res);
    if (cheatState.w5.endercaptains && "CaptainPedastalTypeGen" == argumentsList[0]) {
      if (
        1 == this._customBlock_Ninja("EmporiumBonus", 32, 0) &&
        50 <= Number(bEngine.getGameAttribute("Lv0")[13])
      ) {
        const dnsm = bEngine.getGameAttribute("DNSM");
        dnsm.h.SailzDN4 = 6;
        return 6;
      }
    }
    return res;
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

  const Zenith = actorEvents579._customBlock_Thingies;
  actorEvents579._customBlock_Thingies = function (...argumentList) {
    return cheatState.w7.zenith && cheatConfig.w7.zenith.hasOwnProperty(argumentList[0])
      ? cheatConfig.w7.zenith[argumentList[0]](Reflect.apply(Zenith, this, argumentList))
      : Reflect.apply(Zenith, this, argumentList);
  };

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
    return cheatState.w6.sneaksymbol && cheatConfig.w6.sneaksymbol.hasOwnProperty(argumentList[0])
      ? cheatConfig.w6.sneaksymbol[argumentList[0]](Reflect.apply(Sneaksymbol, this, argumentList))
      : Reflect.apply(Sneaksymbol, this, argumentList);
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

  const poingGeninfo = bEngine
    .gameAttributes.h.PixelHelperActor[23]
    .behaviors.behaviors[0].script._GenINFO;

  Object.defineProperty(poingGeninfo[63], "1", {
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

// TODO: to fix the proxy when used portal, we have to create a proxy where the window is created and on that call we call that proxy again.
function setupScratchMinigameProxy() {
  try {
    const scratchBehavior = bEngine
      .getGameAttribute("PixelHelperActor")[25]
      .behaviors.getBehavior("ActorEvents_670");

    if (!scratchBehavior || typeof scratchBehavior._GenINFO === "undefined") {
      console.error("Scratch Proxy Failed: Behavior not found.");
      return;
    }

    const originalGenInfo = scratchBehavior._GenINFO;

    const SCRATCH_ARRAY_IDX = 212; // The array containing scratch logic
    const STATE_IDX = 50;          // Index 50: 0=Idle, 1=Playing, 2=Won
    const COVER_IMG_ARRAY_ID = 68; // Inside _UIinventory15
    const COVER_IMG_ID = 1;        // The specific index of the grey cover image

    const handler = {
      get: function (target, property, receiver) {
        const value = Reflect.get(target, property, receiver);

        // Intercept access to the Scratch Data Array [212]
        if (Number(property) === SCRATCH_ARRAY_IDX && cheatState.minigame.scratch) {
          // Check if the game state is "Playing" (1)
          if (Array.isArray(value) && value[STATE_IDX] === 1) {
            // [25] to [49] are the scratch zones
            for (let i = 25; i <= 49; i++) {
              if (value[i] !== 1) {
                value[i] = 1;
              }
            }

            const coverImage = scratchBehavior._UIinventory15[COVER_IMG_ARRAY_ID][COVER_IMG_ID];
            // remove cover
            if (coverImage.get_alpha() > 0) { coverImage.set_alpha(0); }
          }
        }

        return value;
      },
    };

    const proxyScratch = new Proxy(originalGenInfo, handler);
    scratchBehavior._GenINFO = proxyScratch;

  } catch (error) {
    console.error("Error setting up Scratch proxy:", error);
  }
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

function cheatStateList() {
  try {
    return cheatState;
  } catch (error) {
    console.error('Error getting cheatStateList:', error);
    return null;
  }
}

// Here you can add suggestions for the autocomplete
async function getAutoCompleteSuggestions() {
  let choices = [];

  const cheatNames = cheats['cheats'].fn.call(this, []);
  const items = cheats['list item'].fn.call(this, []);
  const monsters = cheats['list monster'].fn.call(this, []);
  const attributes = cheats['list gga'].fn.call(this, []);

  cheatNames.split("\n").forEach(function (cheat) {
    choices.push({
      message: cheat,
      value: cheat.substring(0, cheat.indexOf("(")).trim(),
    });
  });

  items.split("\n").forEach(function (item) {
    let itemParts = item.split(", ");
    if (!["error", "null", undefined, "ingameName"].includes(itemParts[1])) {
      choices.push({
        message: `drop ${itemParts[0]} (${itemParts[1]})`,
        value: "drop " + itemParts[0],
      });
      choices.push({
        message: `nomore ${itemParts[0]} (${itemParts[1]})`,
        value: "nomore " + itemParts[0],
      });
      choices.push({
        message: `multiplestacks ${itemParts[0]} (${itemParts[1]})`,
        value: "multiplestacks " + itemParts[0],
      });
    }
  });


  monsters.split("\n").forEach(function (item) {
    let itemParts = item.split(", ");
    if (!["error", "null", undefined, "ingameName"].includes(itemParts[1])) {
      choices.push({
        message: `spawn ${itemParts[0]} (${itemParts[1]})`,
        value: "spawn " + itemParts[0],
      });
    }
  });


  attributes.split("\n").forEach(function (item) {
    if (!["error", "null", undefined, "ingameName"].includes(item)) {
      choices.push({
        message: `gga ${item}`,
        value: "gga " + item,
      });
    }
  });


  Object.keys(summonUnits).forEach(function (item) {
    if (!["error", "null", undefined, "ingameName"].includes(item)) {
      choices.push({
        message: "w6 sumunit " + item,
        value: "w6 sumunit " + item,
      });
    }
  });

  Object.keys(keychainStatsMap).forEach(function (item) {
    if (!["error", "null", undefined, "ingameName"].includes(item)) {
      choices.push({
        message: "keychain " + item,
        value: "keychain " + item,
      });
    }
  });
  return choices;
}

// These choices won't execute immediately when you hit enter,
// they will allow you to add additional input such as a number if you like,
// then execute the second time you press enter
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
    "w6 summoning",
    "w6 ninjaItem",
    "lvl",
    "qnty",
    "setalch",
    "wipe invslot",
    "wipe chestslot",
    "bulk",
    "class",
    "multiplestacks",

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

// TODO: Make this dynamic, if possible
const summonUnits = {
  vrumbi: 4,
  bloomy: 3,
  tonka: 5,
  regalis: 2,
  basic: 0,
  sparkie: 1,
  guardio: 6,
  muddah: 7,
  reset: -1,
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
  baseluk: [1, "EquipmentKeychain7", "_LUK", "6"],
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
  pctluk: [3, "EquipmentKeychain21", "%_LUK", "6"],
  mobrsp: [3, "EquipmentKeychain22", "%_MOB_RESPAWN", "6"],
  skillspd: [3, "EquipmentKeychain23", "%_ALL_SKILL_SPEED", "2"],
  allstats: [3, "EquipmentKeychain24", "%_ALL_STATS", "4"],
};

// List of Item Types that are safe to loot straight into chest.
const lootableItemTypes = [
  "ORE",
  "BAR",
  "LOG",
  "LEAF",
  "FISH",
  "BUG",
  "CRITTER",
  "SOUL",
  "SPELUNKY_PAGE",
  "KITCHEN_LADLE",
  "PET_EGG",
  "MATERIAL",
  "MONSTER_DROP",
  "BOSS_KEY",
  "FISHING_ACCESSORY",
  "FRAGMENT",
  "TELEPORT",
  "TALENT_POINT",
  "OFFICE_PEN",
  "TELEPORTER",
  "STATUE",
  "UPGRADE",
  "TIME_CANDY",
  "HEALTH_FOOD",
  "BOOST_FOOD",
  "GOLDEN_FOOD",
  "USABLE",
  "TICKET",
  "EXP_BALLOON",
  "EVENT_WISH",
  "RESET_POTION",
  "CARD",
  "FISTICUFF",  // Coins
  "GEM",
  "EVENT_BOX",
  "QUEST_ITEM",
];

// function to drop an item on the character 
function dropOnChar(item, amount) {
  const actorEvents189 = events(189);
  const character = bEngine.getGameAttribute("OtherPlayers").h[bEngine.getGameAttribute("UserInfo")[0]];

  try {
    const itemDefinition = itemDefs[item];

    if (itemDefinition) {
      const toChest = cheatConfig.wide.autoloot.itemstochest;
      cheatConfig.wide.autoloot.itemstochest = false;

      let x = character.getXCenter();
      let y = character.getValue("ActorEvents_20", "_PlayerNode");

      if (item.includes("SmithingRecipes"))
        actorEvents189._customBlock_DropSomething(item, 0, amount, 0, 2, y, 0, x, y);

      else actorEvents189._customBlock_DropSomething(item, amount, 0, 0, 2, y, 0, x, y);

      cheatConfig.wide.autoloot.itemstochest = toChest;

      return `Dropped ${itemDefinition.h.displayName.replace(/_/g, " ")}. (x${amount})`;

    }
    else return `No item found for '${item}'`;

  } catch (err) {
    return `Error: ${err}`;
  }
}


/**
 * Creates a proxy for a specific property on an object, allowing custom getter and setter logic.
 * The original value is stored in a hidden property prefixed with an underscore.
 *
 * @param {object} targetObj - The object on which to create the proxy.
 * @param {string | number} index - The name of the property to proxy.
 * @param {function(any): any | {get?: function(any): any, set?: function(any, string): void}} callback -
 *   A function to be used as a simple getter, or an object containing `get` and/or `set` methods
 *   to define custom behavior for property access.
 */
function createProxy(targetObj, index, callback) {
  const backupKey = "_" + index;

  // hidden values ᓚᘏᗢ meow
  Object.defineProperty(targetObj, backupKey, {
    value: targetObj[index],
    writable: true, enumerable: false
  });

  const isSimpleCallback = typeof callback === "function";

  Object.defineProperty(targetObj, index, {
    get: function () {
      const original = this[backupKey];
      if (isSimpleCallback) return callback(original);
      if (callback.get) return callback.get.call(this, original);
      return original
    },

    set: function (value) {
      if (isSimpleCallback) return;
      if (callback.set) return callback.set.call(this, value, backupKey);
      this[backupKey] = value
    },
    enumerable: true, configurable: true,
  });
}

/**
 * Recursively traverses an object up to a specified depth, applying a worker function to each traversed object at the given depth.
 *
 * @param {object} obj - The object to traverse.
 * @param {number} depth - The maximum depth to traverse. When depth reaches 0, the worker function is called.
 * @param {function(object): void} worker - The function to call on objects at the specified depth.
 */
function traverse(obj, depth, worker) {
  if (depth === 0) {
    worker(obj);
    return;
  }
  for (const key in obj) {
    // Safety check to ensure we don't crash on nulls
    if (obj[key]) traverse(obj[key], depth - 1, worker);
  }
}


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

// till a better solution is found it stays here :(
function injectWebUI() {
  if (uiContainer || typeof webPort === 'undefined') return;

  uiContainer = document.createElement('div');
  uiContainer.id = 'cheat-ui-container';
  uiContainer.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    pointer-events: none;
    overflow: hidden;
  `;

  const toggleBtn = document.createElement('div');
  toggleBtn.id = 'cheat-ui-toggle';
  toggleBtn.innerHTML = 'CHEATS';
  const defaultBtnStyle = `
    background: linear-gradient(180deg, #161821, #0e0f14);
    color: #ffb700;
    padding: 0 20px;
    height: 32px;
    line-height: 32px;
    cursor: pointer;
    border-radius: 0 0 8px 8px;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    font-size: 14px;
    letter-spacing: 2px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    border: 1px solid #2a2b36;
    border-top: none;
    user-select: none;
    transition: all 0.2s cubic-bezier(0.2, 0.6, 0.3, 1);
    pointer-events: auto;
    text-shadow: 0 0 10px rgba(255, 183, 0, 0.3);
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2147483649;
    text-align: center;
    -webkit-app-region: no-drag;
  `;

  const expandedBtnStyle = `
    background: #ffb700;
    color: #050507;
    padding: 10px 24px;
    cursor: pointer;
    border-radius: 2px;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    font-size: 14px;
    letter-spacing: 1px;
    box-shadow: 0 0 20px rgba(255, 183, 0, 0.2);
    border: none;
    user-select: none;
    transition: all 0.2s cubic-bezier(0.2, 0.6, 0.3, 1);
    pointer-events: auto;
    position: absolute;
    top: 20px;
    right: 30px;
    transform: none;
    z-index: 2147483649;
    text-transform: uppercase;
    height: auto;
    line-height: normal;
    -webkit-app-region: no-drag;
  `;

  toggleBtn.style.cssText = defaultBtnStyle;

  toggleBtn.onmouseover = () => {
    if (!isUiExpanded) {
      toggleBtn.style.background = '#161821';
      toggleBtn.style.color = '#ffe066';
      toggleBtn.style.boxShadow = '0 4px 20px rgba(255, 183, 0, 0.15)';
      toggleBtn.style.height = '36px';
    } else {
      toggleBtn.style.background = '#ffe066';
      toggleBtn.style.boxShadow = '0 0 25px rgba(255, 183, 0, 0.4)';
    }
  };
  toggleBtn.onmouseout = () => {
    if (!isUiExpanded) {
      toggleBtn.style.background = 'linear-gradient(180deg, #161821, #0e0f14)';
      toggleBtn.style.color = '#ffb700';
      toggleBtn.style.boxShadow = '0 4px 15px rgba(0,0,0,0.5)';
      toggleBtn.style.height = '32px';
    } else {
      toggleBtn.style.background = '#ffb700';
      toggleBtn.style.boxShadow = '0 0 20px rgba(255, 183, 0, 0.2)';
    }
  };

  uiIframe = document.createElement('iframe');
  uiIframe.src = `http://localhost:${webPort}`;
  uiIframe.style.cssText = `
    position: absolute;
    inset: 0;
    width: 100vw;
    height: 100vh;
    border: none;
    transform: translateY(-100%);
    transition: transform 0.6s cubic-bezier(0.05, 0.7, 0.1, 1);
    background: #050507;
    box-shadow: 0 10px 30px rgba(0,0,0,0.7);
    pointer-events: auto;
    z-index: 2147483648;
  `;

  toggleBtn.onclick = () => {
    isUiExpanded = !isUiExpanded;
    if (isUiExpanded) {
      uiIframe.style.transform = 'translateY(0)';
      toggleBtn.innerHTML = 'CLOSE';
      toggleBtn.style.cssText = expandedBtnStyle;
    } else {
      uiIframe.style.transform = 'translateY(-100%)';
      toggleBtn.innerHTML = 'CHEATS';
      toggleBtn.style.cssText = defaultBtnStyle;
    }
  };

  uiContainer.appendChild(uiIframe);
  uiContainer.appendChild(toggleBtn);
  document.body.appendChild(uiContainer);
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
