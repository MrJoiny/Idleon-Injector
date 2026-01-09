/**
 * CLI Interface Module
 * 
 * Provides the command-line interface for the Idleon Cheat Injector.
 * Handles user interaction through an autocomplete prompt system, cheat execution,
 * and special commands like Chrome DevTools integration. Supports confirmation
 * prompts for destructive operations and maintains an interactive loop.
 */

const Enquirer = require('enquirer');
const { exec } = require('child_process');

/**
 * Start the CLI interface for user interaction
 * @param {string} context - JavaScript expression for game context
 * @param {Object} client - CDP client instance
 * @param {Object} options - Configuration options
 * @param {Object} options.injectorConfig - Injector configuration
 * @param {number} options.cdpPort - CDP port number
 */
async function startCliInterface(context, client, options = {}) {
  const { injectorConfig, cdpPort } = options;
  const { Runtime } = client;

  let choicesResult = await Runtime.evaluate({
    expression: `getAutoCompleteSuggestions.call(${context})`,
    awaitPromise: true,
    returnByValue: true
  });

  if (choicesResult.exceptionDetails) {
    console.error("Error getting autocomplete suggestions:", choicesResult.exceptionDetails.text);
    return;
  }
  let choices = choicesResult.result.value || [];

  choices = choices.map(c => {
    if (!c.name) c.name = c.value;
    return c;
  });

  let cheatsNeedingConfirmationResult = await Runtime.evaluate({
    expression: `getChoicesNeedingConfirmation.call(${context})`,
    awaitPromise: true,
    returnByValue: true
  });

  if (cheatsNeedingConfirmationResult.exceptionDetails) {
    console.error("Error getting confirmation choices:", cheatsNeedingConfirmationResult.exceptionDetails.text);
    return;
  }
  let cheatsNeedingConfirmation = cheatsNeedingConfirmationResult.result.value || [];

  async function promptUser() {
    try {
      let valueChosen = false;
      let enquirer = new Enquirer;
      let { action } = await enquirer.prompt({
        name: 'action',
        message: 'Action',
        type: 'autocomplete',
        initial: 0,
        limit: 15,
        choices: choices,
        suggest: function (input, choices) {
          if (input.length == 0) return [choices[0]];
          let str = input.toLowerCase();
          let mustInclude = str.split(" ");
          return choices.filter(ch => {
            for (word of mustInclude) {
              if (!ch.message.toLowerCase().includes(word)) return false;
            }
            return true
          });
        },
        // Custom submit logic to handle confirmation for specific cheats
        onSubmit: function (name, value, prompt) {
          value = this.focused ? this.focused.value : value;
          let choiceNeedsConfirmation = false;
          cheatsNeedingConfirmation.forEach((e) => {
            if (value.indexOf(e) === 0) choiceNeedsConfirmation = true;
          });
          // If confirmation needed and not yet given, re-render with the chosen value requiring a second Enter press
          if (choiceNeedsConfirmation && !valueChosen && this.focused) {
            prompt.input = value;
            prompt.state.cursor = value.length;
            prompt.render();
            valueChosen = true;
            return new Promise(function (resolve) { });
          } else {
            this.addChoice({ name: value, value: value }, this.choices.length + 1);
            return true;
          }
        },
        onRun: async function () {
          await this.complete();
        },
        cancel: function () { },
      });

      if (action === 'chromedebug') {
        const response = await client.Target.getTargetInfo();
        const url = `http://localhost:${cdpPort}/devtools/inspector.html?experiment=true&ws=localhost:${cdpPort}/devtools/page/${response.targetInfo.targetId}`;
        const command = process.platform === 'win32'
          ? `start "" "${url}"`
          : `xdg-open "${url}"`;

        exec(command, (error) => {
          if (error) {
            console.error('Failed to open chrome debugger in default browser:', error);
          } else {
          console.log('Opened idleon chrome debugger in default browser');
        }
      });
    } else {
      const cheatResponse = await Runtime.evaluate({
        expression: `cheat.call(${context}, '${action}')`,
        awaitPromise: true,
        allowUnsafeEvalBlockedByCSP: true
      });
      if (cheatResponse.exceptionDetails) {
        console.error(`Error executing cheat '${action}':`, cheatResponse.exceptionDetails.text);
      } else {
        console.log(`${cheatResponse.result.value}`);
      }
    }
    await promptUser();
  } catch (promptError) {
    console.error("Error in promptUser:", promptError);
    await new Promise(res => setTimeout(res, 1000));
    await promptUser();
  }
}

await promptUser();
}

module.exports = {
  startCliInterface
};