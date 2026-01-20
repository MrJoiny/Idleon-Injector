import van from "../vendor/van-1.6.0.js";

const { svg, path, circle, line, rect, polyline, polygon } = van.tags("http://www.w3.org/2000/svg");

const SvgBase = (content, props = {}) => {
    const { class: className, ...rest } = props;
    const classes = ["icon-base", className].filter(Boolean).join(" ");

    return svg(
        {
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "2",
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            width: "1em",
            height: "1em",
            class: classes,
            ...rest,
        },
        content
    );
};

export const Icons = {
    Logo: (props) =>
        SvgBase(
            path({
                d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
            }),
            { "stroke-width": "2", class: "icon-logo", ...props }
        ),

    Cheats: (props) =>
        SvgBase(
            [
                rect({ x: "2", y: "6", width: "20", height: "12", rx: "2" }),
                path({ d: "M6 12h4m-2-2v4m7-1h.01m3-2h.01" }),
            ],
            { "stroke-width": "2", "aria-hidden": "true", ...props }
        ),

    Account: (props) =>
        SvgBase(
            [
                rect({ x: "3", y: "3", width: "18", height: "18", rx: "2", ry: "2" }),
                line({ x1: "3", y1: "9", x2: "21", y2: "9" }),
                line({ x1: "9", y1: "21", x2: "9", y2: "9" }),
            ],
            { "stroke-width": "2", "aria-hidden": "true", ...props }
        ),

    Config: (props) =>
        SvgBase(
            [
                path({
                    d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",
                }),
                circle({ cx: "12", cy: "12", r: "3" }),
            ],
            { "stroke-width": "2", "aria-hidden": "true", ...props }
        ),

    DevTools: (props) =>
        SvgBase([polyline({ points: "4 17 10 11 4 5" }), line({ x1: "12", y1: "19", x2: "20", y2: "19" })], {
            "stroke-width": "2",
            "aria-hidden": "true",
            ...props,
        }),

    GitHub: (props) =>
        SvgBase(
            path({
                d: "M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z",
            }),
            { fill: "currentColor", width: "18", height: "18", stroke: "none", "aria-hidden": "true", ...props }
        ),

    Lightning: (props) => SvgBase(path({ d: "M13 2L3 14h9l-1 8 10-12h-9l1-8z" }), props),

    SearchX: (props) =>
        SvgBase(
            [
                circle({ cx: "11", cy: "11", r: "8" }),
                line({ x1: "21", y1: "21", x2: "16.65", y2: "16.65" }),
                line({ x1: "8", y1: "8", x2: "14", y2: "14" }),
                line({ x1: "14", y1: "8", x2: "8", y2: "14" }),
            ],
            props
        ),

    X: (props) =>
        SvgBase([line({ x1: "18", y1: "6", x2: "6", y2: "18" }), line({ x1: "6", y1: "6", x2: "18", y2: "18" })], {
            "stroke-width": "2",
            "aria-hidden": "true",
            ...props,
        }),

    ChevronRight: (props) =>
        SvgBase(polyline({ points: "9 18 15 12 9 6" }), { "stroke-width": "2", "aria-hidden": "true", ...props }),

    ChevronLeft: (props) =>
        SvgBase(polyline({ points: "15 18 9 12 15 6" }), { "stroke-width": "2", "aria-hidden": "true", ...props }),

    CircleSlash: (props) =>
        SvgBase([circle({ cx: "12", cy: "12", r: "10" }), line({ x1: "4.93", y1: "4.93", x2: "19.07", y2: "19.07" })], {
            "stroke-width": "2",
            "aria-hidden": "true",
            ...props,
        }),

    Star: (props) =>
        SvgBase(
            polygon({
                points: "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2",
            }),
            { fill: "currentColor", stroke: "none", "aria-hidden": "true", ...props }
        ),

    Refresh: (props) =>
        SvgBase([path({ d: "M23 4v6h-6" }), path({ d: "M20.49 15a9 9 0 1 1-2.12-9.36L23 10" })], {
            "stroke-width": "2",
            "aria-hidden": "true",
            ...props,
        }),

    HelpCircle: (props) =>
        SvgBase(
            [
                circle({ cx: "12", cy: "12", r: "10" }),
                path({ d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" }),
                line({ x1: "12", y1: "17", x2: "12.01", y2: "17" }),
            ],
            { "stroke-width": "2", "aria-hidden": "true", ...props }
        ),

    Keyboard: (props) =>
        SvgBase(
            [
                rect({ x: "2", y: "4", width: "20", height: "16", rx: "2", ry: "2" }),
                line({ x1: "6", y1: "8", x2: "6.01", y2: "8" }),
                line({ x1: "10", y1: "8", x2: "10.01", y2: "8" }),
                line({ x1: "14", y1: "8", x2: "14.01", y2: "8" }),
                line({ x1: "18", y1: "8", x2: "18.01", y2: "8" }),
                line({ x1: "6", y1: "12", x2: "6.01", y2: "12" }),
                line({ x1: "10", y1: "12", x2: "10.01", y2: "12" }),
                line({ x1: "14", y1: "12", x2: "14.01", y2: "12" }),
                line({ x1: "18", y1: "12", x2: "18.01", y2: "12" }),
                line({ x1: "7", y1: "16", x2: "17", y2: "16" }),
            ],
            { "stroke-width": "2", "aria-hidden": "true", ...props }
        ),
};
