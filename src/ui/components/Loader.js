import van from "../vendor/van-1.6.0.js";

const { div, span } = van.tags;

export const Loader = ({ text = "LOADING" } = {}) => {
    return div({ class: "loader-box" }, div({ class: "spinner" }), span(text));
};
