import van from "../vendor/van-1.6.0.js";
import store from "../state/store.js";
import { Icons } from "../assets/icons.js";

const { div, input, button, span } = van.tags;

/**
 * Individual cheat button with optional parameter input and favorite toggle.
 * @param {object} cheat - Cheat data object with value, message, needsParam, category
 * @returns {Element} Cheat item DOM element
 */
export const CheatItem = (cheat) => {
    const needsValue = cheat.needsParam === true;
    const hasConfig = store.hasConfigEntry(cheat.value);

    // Use direct DOM reference instead of van.state to save thousands of listeners
    const inputRef = needsValue
        ? input({
              type: "text",
              class: "cheat-input",
              placeholder: "Val",
          })
        : null;

    const getInputValue = () => (inputRef ? inputRef.value.trim() : "");

    const feedbackState = van.state(null);

    const handleExecute = async () => {
        let finalAction = cheat.value;
        if (needsValue) {
            const val = getInputValue();
            if (!val) {
                store.notify(`Value required for '${cheat.value}'`, "error");
                feedbackState.val = "error";
                setTimeout(() => (feedbackState.val = null), 1000);
                return;
            }
            finalAction = `${cheat.value} ${val}`;
        }

        try {
            await store.executeCheat(finalAction, cheat.message);
            feedbackState.val = "success";
        } catch {
            feedbackState.val = "error";
        }
        setTimeout(() => (feedbackState.val = null), 1000);
    };

    const handleConfigClick = (e) => {
        e.stopPropagation();
        store.navigateToCheatConfig(cheat.value);
    };

    const handleFavorite = () => {
        if (needsValue) {
            const val = getInputValue();
            if (!val) {
                store.notify(`Enter a value first to favorite '${cheat.value}'`, "error");
                return;
            }
            store.toggleFavorite(`${cheat.value} ${val}`);
        } else {
            store.toggleFavorite(cheat.value);
        }
    };

    const isFavorited = () => {
        if (needsValue) {
            const val = getInputValue();
            if (!val) return false;
            return store.isFavorite(`${cheat.value} ${val}`);
        }
        return store.isFavorite(cheat.value);
    };

    // Build button content with optional gear icon
    const buttonContent = [
        span(
            { class: "cheat-button-text" },
            cheat.message && cheat.message !== cheat.value ? `${cheat.value} - ${cheat.message}` : cheat.value
        ),
        hasConfig
            ? span(
                  {
                      class: "cheat-config-icon",
                      onclick: handleConfigClick,
                      title: "Open config for this cheat",
                  },
                  Icons.Config()
              )
            : null,
    ];

    return div(
        { class: "cheat-item-container" },
        button(
            {
                class: () =>
                    `cheat-button ${hasConfig ? "has-config" : ""} ${
                        feedbackState.val === "success" ? "feedback-success" : ""
                    } ${feedbackState.val === "error" ? "feedback-error" : ""}`,
                onclick: handleExecute,
            },
            ...buttonContent
        ),
        inputRef,
        button(
            {
                class: () => `favorite-btn ${isFavorited() ? "is-favorite" : ""}`,
                onclick: (e) => {
                    e.stopPropagation();
                    handleFavorite();
                },
            },
            Icons.Star()
        )
    );
};
