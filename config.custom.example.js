/****************************************************************************************************
 * !!! Since the WebUI has a config generator you should just use it in the WebUI. !!!
 
 *	This file is an example of how to create a custom config file. Make a copy of this file called config.custom.js and edit it to your liking.
	It's done this way so that you can update the injector without losing your custom config.

 * 	Add any cheats you want to run on startup here. A reasonable starting point is given, but you can add/remove 
	any cheats you want each on a new line in single quotes, separated by commas. 
	For example, if you want to unlock the quickref, add the line 
	'unlock quickref', 
	to the list below.
 */

// Uncomment the lines to use the cheats, that here is just an example
exports.startupCheats = [
	// 'unlock quickref',
	// 'wide mtx',
	// 'upstones rng',
	// 'wide perfectobols',
	// 'wide autoloot',
	// 'nomore ^InvBag.*', // inventory bags
	// 'nomore ^InvStorage.*', // chests
	// 'nomore ^Obol([Bronze|Silver|Gold]).*', // bronze, silver, gold obols
];

/****************************************************************************************************
 * 	This is configuration for some of the cheats. You can change the values to suit your needs.
	Configurations that use functions (ie start with t =>) will be passed the current value of the variable, and should return the new value.
	If you change those, just make sure you leave the t => part at the start. Over time I will be trying to make most of the cheats configurable in this way where it makes sense.
	You can also change configuration on the fly, by typing the cheat name into the console, followed by the configuration you want to change eg
	Typing 'wide autoloot hidenotifications false' will disable the hidenotifications option for the wide autoloot cheat.
 */
exports.cheatConfig = {
	// wide: {
	// 	autoloot: {
	// 		hidenotifications: false,
	// 	},
	// },
	// w5: {
	// 	gaming: {
	// 		FertilizerUpgCosts: t => t * 0.8, // fertilizer upgrades reduced by 20%
	// 	},
	// },
};

/****************************************************************************************************
	Finally some injector config. The only thing you might need to change here is chromePath, which should be the path to your chrome.exe file.
*/
exports.injectorConfig = {
};