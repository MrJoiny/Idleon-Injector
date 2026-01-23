import van from "../vendor/van-1.6.0.js";

const { div, span } = van.tags;

export const Loader = ({ text = "LOADING", style = {} } = {}) => {
    return div({ class: "loader-box", style }, div({ class: "spinner" }), span(text));
};
