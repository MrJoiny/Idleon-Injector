/**
 * Install the storage renderer guard as its class is defined, before the first scene loads.
 * @param {string} source - The intercepted game script.
 * @returns {string} The game script with the early renderer hook.
 */
function patchGameScript(source) {
    const storageActor = /(\b(\w+)\.__name__\s*=\s*"scripts\.ActorEvents_116";[\s\S]*?__class__:\s*\2\s*\}\);)/;
    if (!storageActor.test(source)) {
        throw new Error("Storage renderer hook did not match ActorEvents_116 prototype");
    }
    return source.replace(storageActor, "$1\nwindow.setupEvents116Proxies($2);");
}

module.exports = { patchGameScript };
