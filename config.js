exports.startupCheats = [];

exports.cheatConfig = {
  unban: true,
  ingameUI: true,
  steamachieve: true,

  // ⚠️ DANGER ⚠️ --------------------------------------------------------------------------------------------------
  // If this is true, chng command will become available.
  // ONLY set this to true if you 100% know what you're doing and are OK with potentially bricking your account.
  chng_enabled: false,
  // ⚠️ DANGER ⚠️ --------------------------------------------------------------------------------------------------

  maxval: { // lots of people breaking things by having too much of anything
    bones: 1e20,
    totalbones: 1e21,
    dust: 1e20,
    totaldust: 1e21,
    tach: 1e20,
    totaltach: 1e21,
    creditcap: 10000000, // dungeon
    flurbocap: 1000000, // dungeon
  },
  godlike: {
    respawn: (t) => Math.min(t, 1),
  },
  unlock: {
    islands: "abcde_",
  },
  wide: {
    gembuylimit: 0,
    autoloot: {
      itemstochest: true,
      moneytochest: true,
      zenithfarm: false,
      materialfarm: false,
      hidenotifications: true,
    },
    perfectobols: {
      preferredstat: "PRIMARY", // PRIMARY, STR, AGI, WIS or LUK
    },
    plunderous: {
      allcharacters: false,
    },
    arcade: {
      ArcadeCost: (t) => Math.min(t, 0),
    },
    dartshop: {
      DartsUpgCost: (t) => 0,
    },
    hoopshop: {
      HoopsUpgCost: (t) => 0,
    }
  },
  wipe: {
    cogs: 0,
  },
  talent: {
    168: (t) => t * 2, // orb of remembrance time doubled,
    169: (t) => 100, // 100% shockwave
    318: (t) => 10000, // 10x hp/drop plunderous mobs
    120: (t) => 800, // 800% shockwave damage
    483: (t) => Math.max(t, 3.5), // Tenteycle
    // 1: time? 2: points?
    45: (t, args) => { const fns = { 1: (t) => t, 2: (t) => t }; const fn = fns[args[0]]; return fn ? fn(t) : 0; },
  },
  w1: {
    anvil: {
      productionspeed: (t) => t * 4,
    },
    forge: {
      speed: (t) => t * 4,
      capacity: (t) => t * 2,
    },
    stampcost: (t) => t / 4, // 4x cheaper stamp upgrades
    companion: {
      // if comanions is not set in the config, it will always use all the available companions
      // if you want to just have specific companions, you can set it to a function that returns an array of companion ids [1, 2, 3, ...]
      companions: "", // let empty for all pets
      current: "11", //current companion - Glunko Supreme
    },
    owl: {
      OwlCost: (t) => t / 2,
      OwlFeatherRate: (t) => t * 2,
      OwlBonuses: (t) => t * 2,
      OwlFeatherShinyGe: (t) => t, // not sure what this does
      // OwlMegafeather: (t) => t,
      // OwlNextUpgReq: (t) => t,
    },
  },
  w2: {
    roo: {
      RooCost: (t) => t / 2,
      RooShinyMulti: (t) => t * 2,
      RooCatchRate: (t) => t * 2,
      RooCatchREQ: (t) => t / 2,
      RooCatchFishQTY: (t) => t * 2,
      RooCatchRate_S: (t) => t * 2,
      RooCatchREQ_S: (t) => t / 2,
      RooCatchRate_T: (t) => t * 2,
      RooCatchREQ_T: (t) => t / 2,
      // RooNextUpgReq: (t) => t,
      // RooShinyLuck: (t) => t, // not sure what this does
      // RooTarOwned: (t) => t,
      // RooCost_T: (t) => t,
      // RooRESETbon: (t) => t,
      // RooMegafeather: (t) => t,
      // RooBonuse: (t) => t,
    },
    alchemy: {
      BubbleBonus: (t) => t, // bubble effects (t * 2 would be 2x effects from bubbles)
      CauldronCosts: (t) => t, // cost to upgrade a bubble
      ResearchSpeed: (t) => t * 4, // brewing speed
      VialCosts: (t) => t / 2, // vials are 50% cheaper
      VialBonus: (t) => t, // vial effects (t * 2 would be 2x effects from vials)
      PctChanceNewBubble: (t) => t * 4, // 4x higher chance for a new bubble
      CauldronLvsBrewREQ: (t) => t / 2, // upgrading cauldrons is 50% cheaper
      LiquidCap: (t) => t * 2, // 2x liquid capacity
      LiquidHRrate: (t) => t * 4, // 4x liquid speed
      sigilspeed: (t) => t * 10, // 10x sigil research speed
    },
  },
  w3: {
    buildspd: (t) => t * 10,
    WorshipSpeed: (t) => t * 10,
    towerdamage: (t) => t * 10,
    refineryspeed: (t) => Math.max(1, Math.floor(t / 10)), // 10x faster refinery
    trapping: (t) => t * 10, // 10x faster trapping time
  },
  w4: {
    fasteggs: (t) => t / 4, // 4x faster incubation (you can tweak)
    petchance: (t) => t * 2,   // pet chance multiplier
    petupgrades: (t) => t / 4, // pet upgrades 4x cheaper
    mealspeed: (t) => t / 4, // meals cook 4x faster
    recipespeed: (t) => t / 4, // recipes craft 4x faster
    kitchensdiscount: (t) => t / 4, // kitchens & spice 4x cheaper
    platesdiscount: (t) => t / 2, // plates 2x cheaper
    fastforaging: (t) => t * 4, // 4x foraging speed
    luckychef: (t) => t * 2, // 2x higher "new recipe luck" in kitchen
    superpets: {
      BlockChance: (t) => t * 2, // 2x block chance when attacked
      TotalDMG: (t) => t * 4, // 4x pet damage
    },
    mainframe: {
      0: (t) => 200, // Animal farm damage bonus (119 is all pets)
      1: (t) => 2, // Wired in uploaded player printer multiplier
      2: (t) => 10, // Refinery cycle speed multiplier
      3: (t) => 10, // alch bubble level gain (game subtracts 1 from this number, and affects min(this number, 4) + up to 2 more bubbles from sailing for a max of 6)
      4: (t) => 2, // Deathnote/portal kill multiplier
      5: (t) => 1, // Shrine world tour activated
      6: (t) => 5, // Alchemy liquid capacity multi (-30% speed)
      7: (t) => 2, // Stamp bonus multiplier (must be equal to 2 to work)
      8: (t) => 5, // Spelunker jewel effect multiplier
      9: (t) => t * 2, // Fungi finger pocketer %cash bonus
      10: (t) => 2, // Alchemy vial bonus multiplier
      11: (t) => t * 1.2, // Banking fury, %damage multiplier
      12: (t) => 1, // enable sigils (this is either 1 or 0)
      13: (t) => 300, // % larger connection range
      100: (t) => 10, // meal cooking speed multiplier
      101: (t) => 3, // Animal farm additional damage % per pet
      102: (t) => 60, // additional % lab xp
      103: (t) => 36, // trim all building slots
      104: (t) => 15, // % all stat
      105: (t) => 100, //additional breeding xp
      106: (t) => 10, // kitchens gain a level each day
      107: (t) => 2, // adds to bonus 3
      108: (t) => 50, // % food non consume chance
      109: (t) => 145, // % larger connection range for bonuses and jewels
      110: (t) => 100, // % extra damage
      111: (t) => 500, // % reduced egg incubation
      112: (t) => 1500, // +base efficiency in all skills
      113: (t) => 1.5, //fungi finger pocketer extra cash %
      114: (t) => t * 3, //meal cooking bonus speed %
      115: (t) => 45, //pet passive ability speed %
      116: (t) => 50, // % additional meal bonus
      117: (t) => 1.5, // % additional damage per greened stack
    },
    chipbonuses: {
      resp: (t) => 50, //mob respawn speed bonus
      card1: (t) => 1, //double top left card effect (1=yes, 0=no)
      card2: (t) => 1, //double bottom right card effect (1=yes, 0=no)
      crys: (t) => 95, //crystal spawn % on kill
      star: (t) => 1, //double star sign effects (1=yes, 0=no)
      mkill: (t) => 40, //% multikill per tier bonus
      linewidth: (t) => 12, //lab line width % bonus
      dmg: (t) => 100, //% damage bonus
      move: (t) => 30, //mpvement speed bonus,
      acc: (t) => 30, //accuracy bonus
      pend: (t) => 1, //double pendant bonuses
      key1: (t) => 1, //double first keychain bonuses
      troph: (t) => 1, //souble trophy bonuses
      def: (t) => 10, //bonus defence %
      weappow: (t) => 100, //bonus weapon power %
      dr: (t) => 60, //bonus drop rarity %
      toteff: (t) => 40, //% skilling efficiency bonus
      eff: (t) => 1200, //base skilling efficiency bonus
      labexp: (t) => 150, //% bonus lab xp
      atkspd: (t) => 60, //% bonus attack speed
      safk: (t) => 15, //skill afk gains bonus %
      fafk: (t) => 25, //fight afk gains bonus %
    },
    meals: {
      TotDmg: (t) => t,
      Mcook: (t) => t,
      Cash: (t) => t,
      Rcook: (t) => t,
      Npet: (t) => t,
      BrExp: (t) => t,
      Seff: (t) => t,
      VIP: (t) => t,
      Lexp: (t) => t,
      Def: (t) => t,
      PxLine: (t) => t,
      KitchenEff: (t) => t,
      TimeEgg: (t) => t,
      KitchC: (t) => t,
      PetDmg: (t) => t,
      TDpts: (t) => t,
      CookExp: (t) => t,
      Breed: (t) => t,
      TotAcc: (t) => t,
      AtkSpd: (t) => t,
      Sprow: (t) => t,
      Lib: (t) => t,
      Critter: (t) => t,
      Crit: (t) => t,
      LinePct: (t) => t,
      TPpete: (t) => t,
      Liquid12: (t) => t,
      DivExp: (t) => t,
      GamingBits: (t) => t,
      Liquid34: (t) => t,
      Sailing: (t) => t,
      GamingExp: (t) => t,
    },
  },
  w5: {
    sailing: {
      IslandDistance: (t) => t / 2, // islands 50% closer
      MaxChests: (t) => t, // ! Caution if the pile is too high the game wont save to the cloud anymore !
      RareTreasureChance: (t) => t * 5, // 5x chance for rare treasure
      Minimumtraveltime: (t) => t / 5, // minimum travel time reduced from 2h to 30m ( t => 10 would be 10 minues )
      BoatUpgCostType: (t) => t, // loot type for upgrade
      BoatUpgCostQty: (t) => t, // loot amount for upgrade, t => 0 for free upgrades
      BoatValue: (t) => t * 2, // 2x boat loot
      BoatSpeed: (t) => t * 2, // 2x boat speed
      CloudDiscoverBonus: (t) => t * 2, // 2x cloud discover bonus
      ArtifactChance: (t) => t, // ! Caution changing this causes crashes. ! artifact discover bonus (lower is better)
      AncientChances: (t) => t / 5, // 5x ancient chance (lower is better)
      EldritchChances: (t) => t / 5, // eldritch chance (is lower is better)
      SovereignChances: (t) => t / 5, // sovereign chance (is lower is better)
      OmnipotentChances: (t) => t / 5, // omnipotent chance (is lower is better)
      NewCaptBoatSlot: (t) => 0, // free boat and captain slots
      BuyCaptainCost: (t) => 0, // free captains
      ArtifactBonus: (t) => t, // bonus from the artifact, needs investigation as to what can be done here!

    },
    gaming: {
      FertilizerUpgCosts: (t) => 0, // fertilizer upgrade costs are free
      SproutCapacity: (t) => Math.max(22, t + 2), // 2 more sprout slots, or 22 if that's higher
      MutateUpgCosts: (t) => 0, // mutate upgrade costs are free
      LogBookBitBonus: (t) => Math.max(20, t * 2), // 2x logbook bits bonus, or 20 if that's higher
      GamingExpPCT: (t) => t * 1.5, // 1x gaming exp multiple
      NewMutantChanceDEC: (t) => 1, // new mutant guaranteed
      SproutGrowthCHANCEperMUT: (t) => t, // could be a bit fiddly, i assume this gives the chance of each plant type growing
      SproutGrowthTime: (t) => t / 5, // sprouts grow 5x faster
      SaveSprinkler: (t) => t * 1.1, // Don't use water when using the sprinkler. 1 is a guarantee
      ImportItemCOST: (t) => 0, // import item upgrades are free
      AcornShopCost: (t) => 0, //acorn shop upgrades are free
      BoxCost: (t) => 0, //new boxes are free
      // 0: upgrade chance 1: reset chance 2: bit multiplier
      SnailStuff: (t, args) => { const fns = { 0: (t) => 1, 1: (t) => 0, 2: (t) => t }; return fns[args[1]] ? fns[args[1]](t) : 0; },
      SnailMail: false,
      // new w7 update stuff
      PaletteLuck: (t) => t * 2, // 2x palette luck
      PaletteBonus: (t) => t * 2, // 2x palette bonus
    },
    divinity: {
      unlinks: true,
      StyleLvReq: (t) => 0, // allow all meditation styles from lvl 0
      DivPerHr: (t) => t * 3, // base div per hr
      DivPerHr_EXP: (t) => t * 3, // base xp per hr
      BlesssBonus: (t) => t * 2, // god blessing bonus
      Bonus_MAJOR: (t) => t, // main bonus
      Bonus_Minor: (t) => t * 2, // passive bonus
      OfferingCost: (t) => 0, // free offerings
      OfferingOdds: (t) => 1, //offerings always work
    },
    collider: {
      AtomsUnlocked: (t) => t, // max 10
      AtomCost: (t) => 0, // atom collider upgrades are free,
      AtomBonuses: (t) => t, // atom bonus amount. Unclear how this works yet, assume t => t * 2 would be 2x regular bonus
      AtomBubbleUpgCost: (t) => 0, // atom bubble upgrades are free,
    },
    holes: {
      VillagerExpPerHour: (t) => t * 2, // 2x villager exp
      BuildCost: (t) => t / 2, // building upgrades are 0.5x cost
      BucketFillRate: (t) => t * 2, // 2x bucket fill rate
      AmpMulti: (t) => t * 2, // 2x amp multiplier
      MeasurementCost: (t) => t / 2, // measurement upgrades are 0.5x cost
      MeasurementBaseBonus: (t) => t * 2, // 2x measurement base bonus
      MotherlodeEffBase: (t) => t / 2, // 0.5 motherlode efficiency
      MonumentRewardMulti: (t) => t * 2, // 2x bravery reward multiplier this is the time multiplier
      MonumentROGbonuses: (t) => t * 2, // 2x bravery right side rewards
      // MonumentHRbonuses: t => t * 2, // 2x bravery left side rewards
      Bravery_MinDMG: (t) => t * 10, // 10x bravery min damage
      Bravery_MaxDMG: (t) => t * 2, // 2x bravery max damage
      Bravery_SwordsOwned: (t) => 8, // 8 swords for bravery 10 swords glitch out
      MaxRerolls: (t) => 20, // 20 rerolls for bravery
      MaxRevisions: (t) => 5, // 5 revisions for bravery
      Bravery_MonsterHP: (t) => t / 2, // 0.5 x monster hp
      Bravery_BlueChestChanceDEC: (t) => 0.5, // 50% blue chest chance. Those are really rare 0.001% its like double loot.
      BellCosts: (t) => t / 2, // bell improvements are 0.5x cost
      BellBonuss: (t) => t * 2, // 2x bell bonus from first bell
      BellExpPerHR: (t) => t * 2, // 2x all bell exp
      BellEXPreq: (t) => t / 2, // 0.5x bell uses cost.
      HarpNewNote_Cost: (t) => t / 2, // harp new note cost is 0.5x
      HarpNoteProduced: (t) => t * 2, // 2x harp note produced
      HarpPOWperHR: (t) => t * 10, // 10x harp power per hr
      LampWishCost: (t) => t / 2, // lamp wish cost is 0.5x
      LampWishPerDay: (t) => t * 2, // 2x lamp wish per day
      MushKillsLeft: (t) => 0, // always able to kill boss.
      J_StartCoins: (t) => t * 5, // justice start with 5x coins
      J_Happiness: (t) => t * 5, // justice start with 5x happiness
      J_Dismissals: (t) => t * 5, // justice start with 5x dismissals
      J_StartHealth: (t) => t * 5, // justice start with 5x health
      Justice_BlueChestChanceDEC: (t) => 0.5, // 50% blue chest chance. Those are really rare 0.001% its like double loot.
      // New bonuses 13.03.2024
      BolaiaStudyRate: (t) => t * 2, // 2x bolaia study rate
      JarProductionPerHR: (t) => t * 2, // 2x jar production rate
      // new 07.12.2025
      TempleTorchCost: (t) => t / 2, // 0.5x torch cost
      JarCollectibleBonus: (t) => t * 2, // 2x jar collectible bonus
      JarEnchantChance: (t) => t * 2, // 2x jar enchant chance
      JarNewCollectibleChance: (t) => t * 2, // 2x jar new collectible chance
    },
    fixobj: false,
  },
  w6: {
    farming: {
      GrowthReq: (t) => t / 5, // time for plants to grow (base is 4 hours * 1.5 ^ seedtype (0 for basic, etc))
      OGunlocked: (t) => t, //if overgrowth unlocked in shop (0 -> locked, 1 -> unlocked)
      NextOGchance: (t) => t * 5, // chance to get next OG multi (5x chance)
      OGmulti: (t) => (t == 1 ? 1 : Math.max(1, t * 2)), // OG bonus multiplier (1 -> no multiplier, 2 -> 2x, 4 -> 4x, etc) minimum is 1x to prevent bricking
      PlotOwned: (t) => Math.min(36, t + 2), // number of plots owned, additional two plots to your farm, max is 36
      MarketCostType: (t) => t, // plant type for upgrade
      MarketCostQTY: (t) => Math.floor(t / 5), // plant amount for upgrade, t => 0 for free upgrades
      NextCropChance: (t) => t * 2, // chance to get next plant evo level (2x chance)
      CropsBonusValue: (t) => t * 2, // how much each crop is worth (2x)
      CropsOnVine: (t) => t * 2, // 2 x Num of crops on each plant
      GrowthRate: (t) => t, // Growth rate multiplier (growth increase/sec)
      // new w7 stuff
      ExoticPurchasesAllowed: (t) => Math.max(8, t), // Exotic purchases allowed 8 are only available
      ExoticLVQTY: (t) => t * 2, // Exotic LV QTY
    },
    ninja: {
      EmporiumCost: (t) => t / 5, // emporium cost are 5x cheaper
      KOtime: (t) => t / 5, // KO time 5x shorter (lower is better)
      ActionSpd: (t) => t * 2, // Action speed 2x faster
      Stealth: (t) => t * 2, // Stealth 2x more
      DetectionDEC: (t) => t / 5, // Detection rate 5x lesser (lower is better)
      DoorMaxHP: (t) => t, // Door HP
      JadeUpgCost: (t) => t, // Jade upgrades cost 5x cheaper (lower is better), t => 0 for free upgrades
      ItemStat: (t) => t * 2, // 2x Item stats
      ItemFindOdds: (t) => t * 2, // 2x Item find rate
      PristineBon: (t) => t, // 2x Pristine Bon stats
    },
    summoning: {
      ManaStart: (t) => t, // starting mana (can be t * 2 for 2x current start or t => 10)
      ManaRegen: (t) => t * 2, // 2x mana regen rate
      UnitSpd: (t) => t, // set own unit speed
      UnitHP: (t) => t * 2, // 2x unit HP
      UnitDMG: (t) => t * 2, // 2x unit damage
      UnitDODGE: (t) => Math.min(1, t * 2), // 2x dodge rate max of 1
      EndlessUnlocked: (t) => 1, // unlock endless mode
      SummUpgBonus: (t) => t * 2, // 2x value of all summoning upgrade bonuses
      SummRockEssGen: (t) => t * 1.5, // 1.5x essence gain for all colours
      UpgCost: (t) => t / 2, // t => 0 for free upgrades
      UnitCost: (t) => Math.ceil(t / 2), // halved unit cost (lower is better)
      RerollCost: (t) => 0, // summon unit cost always 0
      SummEXPgain: (t) => t, // increase summoning exp gain
      EnemyHP: (t) => t / 2, // halved enemy hp
      EnemyDMG: (t) => t / 2, // halved enemy dmg
      EnemySpd: (t) => t, // set enemy unit speed
    },
    grimoire: {
      GrimoireBoneQTYbase: (t) => t * 2,
      GrimoireUpgCost: (t) => t / 2, // grimoire upgrade costs are halfed, set this to 0 for free upgrades
      Grimoire_HP: (t) => t * 2,
      Grimoire_DMG: (t) => t * 2,
      Grimoire_ACC: (t) => t * 2,
      Grimoire_DEF: (t) => t * 2,
      Grimoire_CRITPCT: (t) => t * 2,
      Grimoire_CRITDMG: (t) => t * 2,
    },
    windwalker: {
      CompassUpgCost: (t) => t / 2,
      Compass_HP: (t) => t * 2,
      Compass_DMG: (t) => t * 2,
      Compass_ACC: (t) => t * 2,
      Compass_DEF: (t) => t * 2,
      Compass_CRITPCT: (t) => t * 2,
      Compass_CRITDMG: (t) => t * 2,
      Compass_MoveSpeed: (t) => Math.max(300, t),
      TempestMultishotPCT: (t) => t * 2,
      CompassDustQTYbase: (t) => t * 2,
      TempestWepDropChance: (t) => Math.max(0.1, t),
      TempestRingDropChance: (t) => Math.max(0.1, t),
      TempestStoneDropChance: (t) => Math.max(0.1, t),
      TempestMedallionDropChance: (t) => 1,
      PortalCostQTY: (t) => 1,
      // Not tested and or not interesting or maybe dangerous!
      // PortalCostType: (t) => t,
      // CompassBonus: (t) => t,
      // StampDoubler: (t) => t,
      // StampDoublersLeft: (t) => t,
      // Compass_AttackSpdPCT: (t) => t,
      // Compass_InvulnSec: (t) => t,
      // Compass_Range: (t) => t,
      // CompassUpgTotal: (t) => t,
      // TotBreedzWWz: (t) => t,
      // TotalTitanKills: (t) => t,
      // CompassDustType: (t) => t,
      // TempestWepDrop: (t) => t,
      // TempestRingDrop: (t) => t,
      // TempestWeaponXtraPowerChance: (t) => t,
      // TempestAllDropBonus: (t) => t,
      // TempestNovadustChance: (t) => t,
      // StoneChancePCT: (t) => t,
      // ExtraDust: (t) => t,
      // CompassUpgXY: (t) => t,
      // CompassTempest: (t) => t,
      // Compass_MASTERY: (t) => t,
      // TitanWeakness: (t) => t,
      // MobWeakness: (t) => t,
      // EffectAmount: (t) => t,
      // CurrentEffect: (t) => t,
      // TotalTitansKilled: (t) => t,
      // InitializeTitanHP: (t) => t,
      // TitanKillReqTown: (t) => t,
      // CanWeEnterPortal: (t) => t,
    },
    arcane: {
      ArcaneUpgCost: (t) => t / 2,
      Arcane_HP: (t) => t * 2,
      Arcane_DMG: (t) => t * 2,
      Arcane_ACC: (t) => t * 2,
      Arcane_DEF: (t) => t * 2,
      Arcane_CRITPCT: (t) => t * 2,
      Arcane_CRITDMG: (t) => t * 2,
      Arcane_AttackSpdPCT: (t) => t * 2,
      ArcaneMultishotPCT: (t) => t * 2,
      TenteyeclePCT: (t) => Math.max(100, t), // this is the same as fully upgraded tent.
      PrismaBubDropChance: (t) => t * 2,
      WepDropChance: (t) => t * 2,
      // WepDropQuality: (t) => t, // not sure about that needs testing
      RingDropChance: (t) => t * 2,
      // RingDropQuality: (t) => t, // not sure about that needs testing
      DoubleItemDropz: (t) => Math.max(100, t), // always double statue drops
      ExtraTachyon: (t) => t * 2,
      ExtraTachyonMulti: (t) => t * 2,
      ArcaneTachyonQTYbase: (t) => t * 2,
      // Not tested and or not interesting or maybe dangerous!
      // TesseractArcanist: (t) => t,
      // ArcaneUpgUNLOCKED: (t) => t,
      // ArcaneUpgTotal: (t) => t,
      // ArcaneUpgBonus: (t) => t,
      // ArcaneMapMulti: (t) => t,
      // ArcaneMobSpawnQTY: (t) => t,
      // CrystalChargeReq: (t) => t,
      // ArcaneMapMulti_bon: (t) => t,
      // ArcaneMapMulti_bonMAX: (t) => t,
      // Arcane_MASTERY: (t) => t,
      // TimeLeft: (t) => t,
      // KillsReq: (t) => t,
      // is_NBLB_on: (t) => t,
      // NBLB_bubbleQTY: (t) => t,
      // NBLB_bubbleLVrangeDisp: (t) => t,
      // ArcaneTachyonType: (t) => t,
    },
    sneaksymbol: {
      SneakSymbolChanceBase: (t) => 1,
    },
  },
  w7: {
    bubba: {
      // HappinessRank: (t) => t,
      // HappinessBonus: (t) => t,
      MeatsliceRate: (t) => t * 2,
      // TotalUpgTypesAvailable: (t) => t,
      // TotalQTYofLVs: (t) => t,
      // MeatProdREQ: (t) => t,
      UpgCost: (t) => t / 2,
      // Xupg: (t) => t,
      // Yupg: (t) => t,
      // RealLV: (t) => t,
      DoubleLVchancePCT: (t) => t,
      DailyPetting: (t) => t * 2,
      DailyPet_HappinessQTY: (t) => t * 2,
      DailyPet_HappinessFromUpg: (t) => t * 2,
      HappinessLoss: (t) => t / 2,
      CharismaTraitSPD: (t) => t * 2,
      CharismaTraitREQ: (t) => t / 2,
      CharismaBonus: (t) => t * 2,
      // DoWeNeedToSelectGift: (t) => t,
      // GiftSelectionOptions: (t) => t,
      GiftPassiveBonus: (t) => t * 2,
      Dice_Result: (t) => t * 2,
      // Dice_Rolled: (t) => t,
      // Dice_MaxSides: (t) => t,
      // Dice_Luck: (t) => t,
      // Dice_Multi: (t) => t,
      SmokeMeat_Multi: (t) => t * 2,
      // SmokeMeat_QTYproduced: (t) => t,
      // SmokeMeat_2xChancePCT: (t) => t,
      // SmokeMeat_10xChancePCT: (t) => t,
      SpareCoins_Multi: (t) => t * 2,
      // SpareCoins_FindChance: (t) => t,
      // SpareCoins_QTYfound: (t) => t,
      // SpareCoins_FoundOne: (t) => t,
      // BubbaRoG_Bonuses: (t) => t,
      // MegafleshOwned: (t) => t,
      // TotUpgBonus: (t) => t,
      // T_FeatureUnlocked: (t) => t,
      // BubbaUnlocked: (t) => t,
    },
    spelunk: {
      // one pow change is enough to boost no need to bost all
      // POW_base: (t) => t * 2,
      // POW_multi: (t) => t * 2,
      POW: (t) => t * 2,
      StaminaMax: (t) => t * 2,
      StaminaRegenRate: (t) => t * 2,
      OverstimFillRate: (t) => t * 2,
      AmberGain: (t) => t * 2,
      AmberDropChance: (t) => t * 2,
      AmberDropChance2nd: (t) => t * 2,
      EscapeRopeChance: (t) => Math.max(t, 1), // every stage is a escape rope
      TollExitTax: (t) => 1, // no exit tax
      SpelunkingEfficiency: (t) => t * 2,
      SpelunkingSpeed: (t) => t / 2,
      // SpelunkingMultiOre: (t) => t,
      // SpelunkingOreValue: (t) => t,
      // SpelunkingExpMulti: (t) => t,
      // SpelunkingAFKgains_PCTofALL: (t) => t,
      ExaltDropChance: (t) => t * 2,
      PrismaDropChance: (t) => t * 2,
      MiscDropChance: (t) => t * 2,
      GoldPieceDropChance: (t) => t * 2,
      w7itemDropChance: (t) => t * 2,
      blingbagDropChance: (t) => t * 2,
      ShadowStrikeChance: (t) => t * 2,
      // ShadowStrikeQTY: (t) => t,
      // GrandDiscoveries_Total: (t) => t,
      GrandDiscoveries_FindChance: (t) => t * 2,
      RockPOWreq: (t) => t / 2,
      RockHP: (t) => t / 2,

      // i dont know what the most of the following things will do.
      // CavesUnlocked: (t) => t,
      // QuickRefUnlocked: (t) => t,
      // ElixirsUnlocked: (t) => t,
      // // 4thtabUnlocked: (t) => t,
      // // 6starCards: (t) => t,
      // DuperBits: (t) => t,
      // CanWeOveruseStamina: (t) => t,
      // DoWeHaveLoreN1: (t) => t,
      // CanWeUseAUTO: (t) => t,
      // AutoFullClearNECESSARY: (t) => t,
      // ToolkitUnlocked: (t) => t,
      // BestToolUnlocked: (t) => t,
      // ToolUnlocked: (t) => t,
      // PlayerSelectSlots: (t) => t,
      // BiggestHaulUnlocked: (t) => t,
      // BonusDMG: (t) => t,
      // RockTypeCreated: (t) => t,
      // RockAmber: (t) => t,
      // StaminaBarWidth: (t) => t,
      // ShopUpgVisible: (t) => t,
      // ShopUpgMaxLV: (t) => t,
      // ShopUpgCost: (t) => t,
      // ShopUpgBuyable: (t) => t,
      // ShopUpgBonus: (t) => t,
      // ElixirsOwned: (t) => t,
      // ElixirMaxDupes: (t) => t,
      // ElixirSlotsOwned: (t) => t,
      // ElixirNotUsed: (t) => t,
      // ElixirEffectQTY: (t) => t,
      // CanWeUseElixir: (t) => t,
      // ElixirEquippedStatus: (t) => t,
      // AmberDenominator: (t) => t,
      // AmberIndex: (t) => t,
      // AmberDailyHaul: (t) => t,
      // GridCoord: (t) => t,
      // HolesToNextFloor: (t) => t,
      // OmnipotentArtifactsUnlocked: (t) => t,
      // OverstimUnlocked: (t) => t,
      // OverstimBonus_PerLV: (t) => t,
      // OverstimBonus: (t) => t,
      // OverstimQtyREQ: (t) => t,
      // NovaBlastHitChance: (t) => t,
      // SampleRedux: (t) => t,
      // ChapterBonus: (t) => t,
      // MaxDailyPageReads: (t) => t,
      // PageReadingLVgains: (t) => t,
      // BigFishBonuses: (t) => t,
      // BigFishCost: (t) => t,
      // isBigFishUpgUnlocked: (t) => t,
      // BigFishUpgLVREQ: (t) => t,
      StaminaCostMulti: (t) => t,
    },
    gallery: {
      GalleryBonusMulti: (t) => t * 2,
      InitializeTrophyBonuses: (t) => t,
      InitializeNametagBonuses: (t) => t,
      // PodiumsOwned: (t) => t,
      // PodiumsOwned_Lv2: (t) => t,
      // PodiumsOwned_Lv3: (t) => t,
      PodiumsOwned_Lv4: (t) => 19, // 19 that is the current max of PodumsOwned
      // GalleryBonusSystemON: (t) => t,
      // PodiumX_inGallery: (t) => t,
      // PodiumY_inGallery: (t) => t,
      // PodiumX_inTown: (t) => t,
      // PodiumY_inTown: (t) => t,
      // NametagX_inTown: (t) => t,
      // NametagY_inTown: (t) => t,
    },
    reef: {
      ReefCost: (t) => 0,
    },
    clam: {
      ClamPromochance: (t) => t * 2,
      ClamBonuses: (t) => t * 2,
      ClamPearlValue: (t) => t * 2,
      // ClamPearl10x: (t) => t * 2,
      Clam_BlackPearlValue: (t) => t * 2,
      Clam_Cost: (t) => t / 2,
      Clam_PearlUpgReq: (t) => t,
      Clam_Mobs: (t) => t * 2,
      // Clam_Respawn: (t) => t,
      // ClamWorkBonus: (t) => t,
      // Clamz_HP: (t) => t,
    },
    coralkid: {
      CoralKidUpgCost: (t) => 0,
    },
    bigfish: {
      BigFishCost: (t) => 0,
    },
    zenith: {
      ZenithMarketCost: (t) => t / 2,
      ZenithMarketBonus: (t) => t * 2,
    },
  },
  misc: {
    keychain: (t) => t,
  },
};

exports.injectorConfig = {
  injreg: "\\w+\\.ApplicationMain\\s*?=",
  interceptPattern: "*N.js",
  showConsoleLog: false,
  chrome: "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  enableUI: true,
  onLinuxTimeout: 30000,
  webPort: 8080,
  // gameExePath: "C:/Path/To/LegendsOfIdleon.exe", // Optional: set this to override EXE search on Windows
};
