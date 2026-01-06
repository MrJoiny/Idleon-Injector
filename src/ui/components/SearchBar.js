import van from '../van-1.6.0.js';
import { debounce } from '../utils.js';
import { Icons } from '../icons.js';

const { div, input, span } = van.tags;

/**
 * Reusable search bar component
 * @param {Object} options
 * @param {string} options.placeholder - Placeholder text
 * @param {function} options.onInput - Callback when input changes (receives value)
 * @param {number} [options.debounceMs=300] - Debounce delay in ms
 * @param {any} [options.icon=Icons.ChevronRight()] - Icon to show
 */
export const SearchBar = ({ placeholder, onInput, debounceMs = 300, icon = Icons.ChevronRight() } = {}) => {
    const handleInput = debounceMs > 0
        ? debounce((e) => onInput(e.target.value.trim()), debounceMs)
        : (e) => onInput(e.target.value.trim());

    return div({ class: 'search-wrapper' },
        span({ class: 'search-icon' }, icon),
        input({
            type: 'text',
            class: 'global-search-input',
            placeholder: placeholder || 'SEARCH...',
            oninput: handleInput
        })
    );
};
