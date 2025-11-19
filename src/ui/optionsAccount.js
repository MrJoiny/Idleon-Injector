// Options Account Editor Module
// Handles the Options List Account editor functionality
// Special thanks to sciomachist for his great work in finding out a lot off stuff in the OLA

// Import schema (will be loaded via script tag in HTML)
const optionsListAccountSchema = {
  15: { name: "Unclaimed W1 Colosseum Ticket Days", description: "Number of unclaimed W1 colosseum ticket days", type: "number" },
  16: { name: "Unclaimed W1 Boss Keys Days", description: "Number of unclaimed W1 boss keys days", type: "number" },
  26: { name: "Shadowban", description: "Set to 0 to remove shadowban", type: "number", warning: "Modifying this may affect your account status" },
  27: { name: "Idleon Discord Button Clicked", description: "Idleon discord button clicked (50 gems)", type: "number" },
  28: { name: "Lava's Twitch Button Clicked", description: "Lava's twitch button clicked (50 gems)", type: "number" },
  31: { name: "Unclaimed W2 Boss Keys Days", description: "Number of unclaimed W2 boss keys days", type: "number" },
  33: { name: "Minigames Amount", description: "Number of minigames", type: "number" },
  35: { name: "Unclaimed W2 Colosseum Ticket Days", description: "Number of unclaimed W2 colosseum ticket days", type: "number" },
  37: { name: "Guild Name", description: "Your guild name", type: "string" },
  55: { name: "Accumulated Talent Skill Book Checkouts", description: "Total talent skill book checkouts", type: "number" },
  56: { name: "Unclaimed W3 Colosseum Ticket Days", description: "Number of unclaimed W3 colosseum ticket days", type: "number" },
  57: { name: "Giant Mobs Spawn Decrease Multiplier", description: "Controls giant mob spawn rate", type: "number" },
  60: { name: "Item Shop Popup", description: "Item shop popup setting", type: "number" },
  68: { name: "DO NOT TOUCH", description: "Triggers Abuse Message (different shadowban)", type: "number", warning: "DO NOT MODIFY - Will trigger shadowban" },
  71: { name: "Dungeon Credits (Blue) - Total", description: "Total number - determines rank - keep lower than 100m", type: "number", warning: "Keep lower than 100m" },
  72: { name: "Dungeon Credits (Blue) - Actual", description: "Actual amount of blue dungeon credits", type: "number" },
  73: { name: "Dungeon Credits (Pink/Flurbos)", description: "Pink dungeon credits (flurbos)", type: "number" },
  74: { name: "Arcade Balls (Normal)", description: "Normal arcade balls", type: "number" },
  75: { name: "Arcade Balls (Golden)", description: "Golden arcade balls", type: "number" },
  80: { name: "Unclaimed W3 Boss Keys Days", description: "Number of unclaimed W3 boss keys days", type: "number" },
  86: { name: "Recipe Points", description: "Recipe points (needs confirmation)", type: "number" },
  88: { name: "W4 Arena Timer", description: "World 4 arena timer", type: "number" },
  92: { name: "4-Star Cardifiers", description: "Number of 4-star cardifiers", type: "number" },
  96: { name: "Accumulated Dilapidated Slush Days", description: "Days of accumulated dilapidated slush", type: "number" },
  98: { name: "Accumulated Mutated Mush Days", description: "Days of accumulated mutated mush", type: "number" },
  101: { name: "Killroy Crystals", description: "Killroy crystals (minus value)", type: "number" },
  105: { name: "Killroy Skulls", description: "Killroy skulls currency", type: "number" },
  106: { name: "Killroy Upgrade - Timer", description: "Killroy timer upgrade level", type: "number" },
  107: { name: "Killroy Upgrade - Talent Drops", description: "Killroy talent drops upgrade level", type: "number" },
  108: { name: "Killroy Upgrade - Bonus Skulls", description: "Killroy bonus skulls upgrade (do not set if not unlocked)", type: "number", warning: "Do not set if you haven't unlocked this upgrade yet" },
  109: { name: "Killroy Upgrade - Respawn", description: "Killroy respawn upgrade (do not set if not unlocked)", type: "number", warning: "Do not set if you haven't unlocked this upgrade yet" },
  110: { name: "Killroy Upgrade - 5th", description: "Killroy 5th upgrade (do not set if not unlocked)", type: "number", warning: "Do not set if you haven't unlocked this upgrade yet" },
  111: { name: "Killroy Upgrade - 6th", description: "Killroy 6th upgrade (do not set if not unlocked)", type: "number", warning: "Do not set if you haven't unlocked this upgrade yet" },
  112: { name: "Killroy Runs Total", description: "Total number of finished Killroy runs", type: "number" },
  113: { name: "Killroy Wake Status", description: "Set to 0 to wake up Killroy", type: "number" },
  115: { name: "Killroy Airhorn Reset", description: "Set to 0 to make airhorn reset available", type: "number" },
  121: { name: "Next Idleskilling Codes Days", description: "Days left for next idleskilling codes", type: "number" },
  123: { name: "Draconic Cauldrons", description: "Number of draconic cauldrons for liquid cauldrons in alchemy", type: "number" },
  125: { name: "3D Printer Days for Multi", description: "3D printer days for multi artifact", type: "number" },
  134: { name: "Hydrogen Bonus Stamp Days", description: "Days of accumulated hydrogen bonus for stamp", type: "number" },
  138: { name: "Corsair Kill Count", description: "Corsair kill count (Pirate Flag skill)", type: "number" },
  139: { name: "Divine Knight Kill Count", description: "Divine knight kill count (Divine Orb skill)", type: "number" },
  152: { name: "Mage Kill Count", description: "Mage kill count (Wormhole skill)", type: "number" },
  154: { name: "95% Stamp Cost Reduction", description: "95% stamp cost reduction amount", type: "number" },
  156: { name: "5-Star Cardifiers", description: "Number of 5-star cardifiers", type: "number" },
  158: { name: "Void Man Portals Cleared", description: "Void man portals cleared highscore (for talent calculations)", type: "number" },
  160: { name: "Uncollected Garbage (Ground)", description: "Uncollected garbage on the ground", type: "number" },
  161: { name: "Garbage Currency", description: "Garbage currency in Fishing Islands", type: "number" },
  162: { name: "Bottles Currency", description: "Bottles currency in Fishing Islands", type: "number" },
  163: { name: "Garbage Island - % Garbage", description: "Garbage Island upgrade (+% Garbage)", type: "number" },
  164: { name: "Garbage Island - % Bottles", description: "Garbage Island upgrade (+% Bottles)", type: "number" },
  166: { name: "Rando Island - % Loot", description: "Rando Island upgrade (+% Loot - all random events)", type: "number" },
  167: { name: "Rando Island - Double Boss", description: "Rando Island upgrade (+% for Double Boss)", type: "number" },
  169: { name: "Unlocked Islands", description: "Unlocked islands (all islands: 'abcde_')", type: "string", hint: "Format: 'abcde_' for all islands" },
  170: { name: "Uncollected Bottles (Docks)", description: "Uncollected bottles in the docks", type: "number" },
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
  184: { name: "Fractal Isle AFK Time", description: "Fractal isle AFK time", type: "number" },
  186: { name: "W2 Town Boss Damage", description: "Damage done to W2 town boss", type: "number" },
  187: { name: "W2 Town Boss Status", description: "W2 town boss status (5=dead, 0-4=alive)", type: "number" },
  188: { name: "Trophy Currency", description: "Trophy currency for W2 town boss", type: "number" },
  189: { name: "Max W2 Town Weekly Boss Skulls", description: "Max W2 town weekly boss skulls reached (up to 5)", type: "number" },
  190: { name: "W2 Town Boss Attempt Reset", description: "Set to 0 to make reset available", type: "number" },
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
  281: { name: "Poppy - Fish (Yellow)", description: "Poppy yellow fish amount", type: "number" },
  282: { name: "Poppy - Fish (Red)", description: "Poppy red fish amount", type: "number" },
  283: { name: "Poppy - Fish (Green)", description: "Poppy green fish amount", type: "number" },
  284: { name: "Poppy - Fish (Purple)", description: "Poppy purple fish amount", type: "number" },
  285: { name: "Poppy - Fish (Silver)", description: "Poppy silver fish amount", type: "number" },
  286: { name: "Poppy - Fish (Blue)", description: "Poppy blue fish amount", type: "number" },
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
  310: { name: "Event Points", description: "Event points (as displayed in account info)", type: "number" },
  311: { name: "Event Bonuses", description: "Tracks event bonuses", type: "string", hint: "Set to '0abc_defghijkmlopn' to apply all (up to 4th Anniversary)" },
  318: { name: "Daily Hole Resources Destroyed", description: "Daily number of resource nodes in the Hole destroyed (max 5)", type: "number" },
  319: { name: "Endless Summoning Level", description: "Current endless summoning level", type: "number", warning: "Does not provide associated win rewards" },
  320: { name: "Equinox Pengy Count", description: "Number of equinox pengy (can be increased above 5)", type: "number" },
  321: { name: "Endless Summoning High Performance", description: "Endless summoning high performance toggle", type: "number" },
  323: { name: "Supreme Wiring Bonus Days", description: "Accumulated days of Supreme Wiring Bonus (safe to max at 50)", type: "number", hint: "Safe to max at 50" },
  324: { name: "Cosmic Balls", description: "Number of Cosmic Balls", type: "number" },
  325: { name: "Event Tries Left", description: "Event (Valentines, Anniversaries...) tries left", type: "number" },
  326: { name: "Daily Event Tries Gem Purchases", description: "Cap of daily Event tries gem purchases (set to 0 to purchase again)", type: "number" },
  353: { name: "Hidden Wisdom Minigame High Score", description: "Hidden wisdom minigame high score", type: "number" },
  355: { name: "Rupie Slugs Purchased", description: "Number of rupie slugs purchased", type: "number" },
  369: { name: "Emperor Showdown Level", description: "Emperor Showdown Level (value+1 is current showdown)", type: "number" },
  370: { name: "Emperor Entries Left", description: "Entries left for Emperor (negative number, goes up to 0)", type: "number" },
  379: { name: "Armor Set Smithy Sets Unlocked", description: "Armor Set Smithy sets unlocked", type: "string" },
  380: { name: "Armor Set Smithy Unlocked", description: "Armor Set Smithy unlocked (set to 1)", type: "number" },
  382: { name: "Lifetime FOMO Tickets", description: "Lifetime tickets bought from FOMO shop", type: "number" },
  383: { name: "Prisma Bubbles", description: "Prisma bubbles amount", type: "number" },
  384: { name: "Selected Prisma Bubbles Index", description: "Index of selected prisma bubbles", type: "number" },
  388: { name: "Tachyon 1", description: "Tachyon 1 amount", type: "number" },
  389: { name: "Tachyon 2", description: "Tachyon 2 amount", type: "number" },
  390: { name: "Tachyon 3", description: "Tachyon 3 amount", type: "number" },
  391: { name: "Tachyon 4", description: "Tachyon 4 amount", type: "number" },
  392: { name: "Tachyon 5", description: "Tachyon 5 amount", type: "number" },
  393: { name: "Tachyon 6", description: "Tachyon 6 amount", type: "number" },
  394: { name: "Total Tachyon Collected", description: "Total Tachyon ever collected", type: "number" },
  418: { name: "Hoops Minigame Points", description: "Hoops minigame points", type: "number" },
  419: { name: "Hoops - Damage Bonus", description: "Hoops minigame shop damage bonus", type: "number" },
  420: { name: "Hoops - Coin Drop Bonus", description: "Hoops minigame shop coin drop bonus", type: "number" },
  421: { name: "Hoops - Class EXP Bonus", description: "Hoops minigame shop class EXP bonus", type: "number" },
  422: { name: "Hoops - Skill Efficiency Bonus", description: "Hoops minigame shop skill efficiency bonus", type: "number" },
  423: { name: "Hoops Reset Timer", description: "Time until Hoops minigame resets (negative to play)", type: "number" },
  424: { name: "Hoops Played Today", description: "Number of Hoops minigame played today", type: "number" },
  426: { name: "Coral Kid - Unlocked", description: "Coral Kid unlocked or not", type: "number" },
  427: { name: "Coral Kid - Divinity XP Bonus", description: "Coral Kid divinity XP bonus level", type: "number" },
  434: { name: "Darts Minigame Points", description: "Darts minigame points", type: "number" },
  435: { name: "Darts - Extra Damage Bonus", description: "Darts minigame shop extra damage bonus", type: "number" },
  454: { name: "Clamworks - Current Total", description: "Clamworks current total", type: "number" },
  455: { name: "Clamworks - Pearl Value", description: "Clamworks Pearl Value level", type: "number" },
  467: { name: "Killroy Gallery Bonus", description: "Killroy gallery bonus", type: "number" },
  468: { name: "Killroy Masterclass Bonus", description: "Killroy masterclass bonus", type: "number" },
  476: { name: "Friend Bonuses - Active", description: "Active friend bonuses", type: "string", hint: "Format: 'x,yyyy,name;x,yyyy,name' where x=bonus index, yyyy=account level, name=player name" },
  477: { name: "Friend Bonuses - Incoming", description: "Incoming friend bonuses", type: "string", hint: "Format: 'x,yyyy,name;x,yyyy,name' where x=bonus index, yyyy=account level, name=player name" },
  479: { name: "Yet Another Printer Multi Days", description: "Days since last sample for legend talent (Brown 4) - cap 20", type: "number", hint: "Cap at 20" }
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
