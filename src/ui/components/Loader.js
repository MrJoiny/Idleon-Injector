import van from '../van-1.6.0.js';

const { div, span } = van.tags;

// Reusable Loader Component
// Props: text (string), style (object - optional)
export const Loader = ({ text = "LOADING...", style = {} } = {}) => {
    return div({ class: 'loader-box', style },
        div({ class: 'spinner' }),
        span(text)
    );
};