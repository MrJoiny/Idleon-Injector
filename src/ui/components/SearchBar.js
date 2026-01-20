import van from "../vendor/van-1.6.0.js";
import { debounce } from "../utils/index.js";
import { Icons } from "../assets/icons.js";

const { div, input, span } = van.tags;

/**
 * Reusable search bar component
 * @param {Object} options
 * @param {string} options.placeholder - Placeholder text
 * @param {function} options.onInput - Callback when input changes (receives value)
 * @param {number} [options.debounceMs=300] - Debounce delay in ms
 * @param {any} [options.icon=Icons.ChevronRight()] - Icon to show
 * @param {van.state} [options.value] - Optional reactive state for the input value
 */
export const SearchBar = ({ placeholder, onInput, debounceMs = 300, icon = Icons.ChevronRight(), value } = {}) => {
    const handleInput =
        debounceMs > 0
            ? debounce((e) => onInput(e.target.value.trim()), debounceMs)
            : (e) => onInput(e.target.value.trim());

    const clearInput = (target) => {
        if (value && "val" in value) {
            value.val = "";
        }
        target.value = "";
        onInput("");
    };

    return div(
        { class: "search-wrapper" },
        span({ class: "search-icon" }, icon),
        input({
            type: "text",
            class: "global-search-input",
            placeholder: placeholder || "SEARCH...",
            ...(value !== undefined ? { value } : {}),
            oninput: handleInput,
            onkeydown: (e) => {
                if (e.key !== "Escape") return;
                e.preventDefault();
                e.stopPropagation();
                clearInput(e.currentTarget);
                e.currentTarget.blur();
            },
        })
    );
};
