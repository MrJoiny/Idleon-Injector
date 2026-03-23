import van from "../vendor/van-1.6.0.js";

const { svg, path, circle, g, defs, mask, rect, clipPath, polygon, use, image, radialGradient, stop } =
    van.tags("http://www.w3.org/2000/svg");

const SvgBase = (content, props = {}) => {
    const { class: className, ...rest } = props;
    const classes = ["icon-base", className].filter(Boolean).join(" ");

    return svg(
        {
            viewBox: "0 0 256 256",
            width: "1em",
            height: "1em",
            class: classes,
            ...rest,
        },
        content
    );
};

export const Cogs = {
    Cog1A00: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-1a00" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "teeth-1a00" }, [
                        use({ href: "#tooth-1a00" }),
                        use({ href: "#tooth-1a00", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-1a00", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-1a00", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-1a00", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-1a00", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-1a00", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-1a00", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-1a00" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-1a00" }),
                    ]),
                    mask({ id: "hole-mask-1a00" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-1a00" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    mask({ id: "broken-mask-1a00" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        path({
                            d: "M -10,10 L 40,60 L 90,50 L 128,128 L 140,170 L 190,180 L 266,266",
                            stroke: "black",
                            "stroke-width": "8",
                            fill: "none",
                            "stroke-linejoin": "round",
                        }),
                        path({
                            d: "M 128,128 L 100,180 L 100,240",
                            stroke: "black",
                            "stroke-width": "6",
                            fill: "none",
                            "stroke-linejoin": "round",
                        }),
                    ]),
                    clipPath({ id: "left-half-1a00" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-1a00" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#broken-mask-1a00)" }, [
                    g({ mask: "url(#hole-mask-1a00)" }, [
                        circle({ cx: "128", cy: "128", r: "61", fill: "#FFE082", "clip-path": "url(#left-half-1a00)" }),
                        circle({
                            cx: "128",
                            cy: "128",
                            r: "61",
                            fill: "#FFD54F",
                            "clip-path": "url(#right-half-1a00)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-1a00)" }, [
                        use({ href: "#gear-solid-1a00", fill: "#FFECB3", "clip-path": "url(#left-half-1a00)" }),
                        use({ href: "#gear-solid-1a00", fill: "#FFE57F", "clip-path": "url(#right-half-1a00)" }),
                    ]),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog1A0: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-1a0" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "teeth-1a0" }, [
                        use({ href: "#tooth-1a0" }),
                        use({ href: "#tooth-1a0", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-1a0", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-1a0", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-1a0", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-1a0", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-1a0", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-1a0", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-1a0" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-1a0" }),
                    ]),
                    mask({ id: "hole-mask-1a0" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-1a0" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-1a0" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-1a0" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-1a0)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#FFE082", "clip-path": "url(#left-half-1a0)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#FFD54F", "clip-path": "url(#right-half-1a0)" }),
                ]),
                g({ mask: "url(#face-mask-1a0)" }, [
                    use({ href: "#gear-solid-1a0", fill: "#FFECB3", "clip-path": "url(#left-half-1a0)" }),
                    use({ href: "#gear-solid-1a0", fill: "#FFE57F", "clip-path": "url(#right-half-1a0)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog1A1: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-1a1" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "teeth-1a1" }, [
                        use({ href: "#tooth-1a1" }),
                        use({ href: "#tooth-1a1", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-1a1", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-1a1", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-1a1", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-1a1", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-1a1", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-1a1", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-1a1" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-1a1" }),
                    ]),
                    mask({ id: "hole-mask-1a1" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-1a1" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-1a1" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-1a1" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-1a1)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#FFE082", "clip-path": "url(#left-half-1a1)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#FFD54F", "clip-path": "url(#right-half-1a1)" }),
                ]),
                g({ mask: "url(#face-mask-1a1)" }, [
                    use({ href: "#gear-solid-1a1", fill: "#FFECB3", "clip-path": "url(#left-half-1a1)" }),
                    use({ href: "#gear-solid-1a1", fill: "#FFE57F", "clip-path": "url(#right-half-1a1)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog1A2: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-1a2" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "m-tooth-1a2" }, [polygon({ points: "108,36 113,6 128,28 143,6 148,36" })]),
                    g({ id: "teeth-1a2" }, [
                        use({ href: "#tooth-1a2" }),
                        use({ href: "#tooth-1a2", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-1a2", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-1a2", transform: "rotate(270 128 128)" }),
                        use({ href: "#m-tooth-1a2", transform: "rotate(45 128 128)" }),
                        use({ href: "#m-tooth-1a2", transform: "rotate(135 128 128)" }),
                        use({ href: "#m-tooth-1a2", transform: "rotate(225 128 128)" }),
                        use({ href: "#m-tooth-1a2", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-1a2" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-1a2" }),
                    ]),
                    mask({ id: "hole-mask-1a2" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-1a2" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-1a2" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-1a2" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-1a2)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#FFE082", "clip-path": "url(#left-half-1a2)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#FFD54F", "clip-path": "url(#right-half-1a2)" }),
                ]),
                g({ mask: "url(#face-mask-1a2)" }, [
                    use({ href: "#gear-solid-1a2", fill: "#FFECB3", "clip-path": "url(#left-half-1a2)" }),
                    use({ href: "#gear-solid-1a2", fill: "#FFE57F", "clip-path": "url(#right-half-1a2)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog1B0: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-1b0" }, [polygon({ points: "-20,-92 -13,-122 13,-122 20,-92" })]),
                    g({ id: "teeth-1b0" }, [
                        use({ href: "#tooth-1b0" }),
                        use({ href: "#tooth-1b0", transform: "rotate(45)" }),
                        use({ href: "#tooth-1b0", transform: "rotate(90)" }),
                        use({ href: "#tooth-1b0", transform: "rotate(135)" }),
                        use({ href: "#tooth-1b0", transform: "rotate(180)" }),
                        use({ href: "#tooth-1b0", transform: "rotate(225)" }),
                        use({ href: "#tooth-1b0", transform: "rotate(270)" }),
                        use({ href: "#tooth-1b0", transform: "rotate(315)" }),
                    ]),
                    g({ id: "gear-base-1b0" }, [circle({ cx: "0", cy: "0", r: "96" }), use({ href: "#teeth-1b0" })]),
                    mask({ id: "hole-mask-base-1b0" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-base-1b0" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-clip-base-1b0" }, [
                        rect({ x: "-150", y: "-150", width: "150", height: "300" }),
                    ]),
                    clipPath({ id: "right-clip-base-1b0" }, [rect({ x: "0", y: "-150", width: "150", height: "300" })]),
                ]),
                g({ transform: "translate(188, 67) scale(0.52)" }, [
                    g({ mask: "url(#hole-mask-base-1b0)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#FFE082", "clip-path": "url(#left-clip-base-1b0)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#FFD54F",
                            "clip-path": "url(#right-clip-base-1b0)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-1b0)" }, [
                        g({ "clip-path": "url(#left-clip-base-1b0)" }, [
                            use({ href: "#gear-base-1b0", transform: "rotate(0)", fill: "#FFECB3" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-1b0)" }, [
                            use({ href: "#gear-base-1b0", transform: "rotate(0)", fill: "#FFE57F" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(92, 163) scale(0.72)" }, [
                    g({ mask: "url(#hole-mask-base-1b0)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#FFE082", "clip-path": "url(#left-clip-base-1b0)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#FFD54F",
                            "clip-path": "url(#right-clip-base-1b0)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-1b0)" }, [
                        g({ "clip-path": "url(#left-clip-base-1b0)" }, [
                            use({ href: "#gear-base-1b0", transform: "rotate(22.5)", fill: "#FFECB3" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-1b0)" }, [
                            use({ href: "#gear-base-1b0", transform: "rotate(22.5)", fill: "#FFE57F" }),
                        ]),
                    ]),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog1B1: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-1b1" }, [polygon({ points: "-20,-92 -13,-122 13,-122 20,-92" })]),
                    g({ id: "teeth-1b1" }, [
                        use({ href: "#tooth-1b1" }),
                        use({ href: "#tooth-1b1", transform: "rotate(45)" }),
                        use({ href: "#tooth-1b1", transform: "rotate(90)" }),
                        use({ href: "#tooth-1b1", transform: "rotate(135)" }),
                        use({ href: "#tooth-1b1", transform: "rotate(180)" }),
                        use({ href: "#tooth-1b1", transform: "rotate(225)" }),
                        use({ href: "#tooth-1b1", transform: "rotate(270)" }),
                        use({ href: "#tooth-1b1", transform: "rotate(315)" }),
                    ]),
                    g({ id: "gear-base-1b1" }, [circle({ cx: "0", cy: "0", r: "96" }), use({ href: "#teeth-1b1" })]),
                    mask({ id: "hole-mask-large-1b1" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-large-1b1" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "61", fill: "black" }),
                    ]),
                    mask({ id: "hole-mask-small-1b1" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "25", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-small-1b1" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "45", fill: "black" }),
                    ]),
                    clipPath({ id: "left-clip-1b1" }, [rect({ x: "-150", y: "-150", width: "150", height: "300" })]),
                    clipPath({ id: "right-clip-1b1" }, [rect({ x: "0", y: "-150", width: "150", height: "300" })]),
                ]),
                g({ transform: "translate(75, 185) scale(0.58)" }, [
                    g({ mask: "url(#hole-mask-small-1b1)" }, [
                        circle({ cx: "0", cy: "0", r: "45", fill: "#FFE082", "clip-path": "url(#left-clip-1b1)" }),
                        circle({ cx: "0", cy: "0", r: "45", fill: "#FFD54F", "clip-path": "url(#right-clip-1b1)" }),
                    ]),
                    g({ mask: "url(#face-mask-small-1b1)" }, [
                        g({ "clip-path": "url(#left-clip-1b1)" }, [
                            use({ href: "#gear-base-1b1", transform: "rotate(-22.5)", fill: "#FFECB3" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-1b1)" }, [
                            use({ href: "#gear-base-1b1", transform: "rotate(-22.5)", fill: "#FFE57F" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(105, 85) scale(0.85)" }, [
                    g({ mask: "url(#hole-mask-large-1b1)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#FFE082", "clip-path": "url(#left-clip-1b1)" }),
                        circle({ cx: "0", cy: "0", r: "61", fill: "#FFD54F", "clip-path": "url(#right-clip-1b1)" }),
                    ]),
                    g({ mask: "url(#face-mask-large-1b1)" }, [
                        g({ "clip-path": "url(#left-clip-1b1)" }, [
                            use({ href: "#gear-base-1b1", transform: "rotate(0)", fill: "#FFECB3" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-1b1)" }, [
                            use({ href: "#gear-base-1b1", transform: "rotate(0)", fill: "#FFE57F" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(185, 150) scale(0.58)" }, [
                    g({ mask: "url(#hole-mask-small-1b1)" }, [
                        circle({ cx: "0", cy: "0", r: "45", fill: "#FFE082", "clip-path": "url(#left-clip-1b1)" }),
                        circle({ cx: "0", cy: "0", r: "45", fill: "#FFD54F", "clip-path": "url(#right-clip-1b1)" }),
                    ]),
                    g({ mask: "url(#face-mask-small-1b1)" }, [
                        g({ "clip-path": "url(#left-clip-1b1)" }, [
                            use({ href: "#gear-base-1b1", transform: "rotate(22.5)", fill: "#FFECB3" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-1b1)" }, [
                            use({ href: "#gear-base-1b1", transform: "rotate(22.5)", fill: "#FFE57F" }),
                        ]),
                    ]),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog1B2: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-1b2" }, [polygon({ points: "-20,-92 -13,-122 13,-122 20,-92" })]),
                    g({ id: "teeth-1b2" }, [
                        use({ href: "#tooth-1b2" }),
                        use({ href: "#tooth-1b2", transform: "rotate(45)" }),
                        use({ href: "#tooth-1b2", transform: "rotate(90)" }),
                        use({ href: "#tooth-1b2", transform: "rotate(135)" }),
                        use({ href: "#tooth-1b2", transform: "rotate(180)" }),
                        use({ href: "#tooth-1b2", transform: "rotate(225)" }),
                        use({ href: "#tooth-1b2", transform: "rotate(270)" }),
                        use({ href: "#tooth-1b2", transform: "rotate(315)" }),
                    ]),
                    g({ id: "gear-base-1b2" }, [circle({ cx: "0", cy: "0", r: "96" }), use({ href: "#teeth-1b2" })]),
                    mask({ id: "hole-mask-base-1b2" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-base-1b2" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-clip-base-1b2" }, [
                        rect({ x: "-150", y: "-150", width: "150", height: "300" }),
                    ]),
                    clipPath({ id: "right-clip-base-1b2" }, [rect({ x: "0", y: "-150", width: "150", height: "300" })]),
                ]),
                g({ transform: "translate(80, 100) scale(0.65)" }, [
                    g({ mask: "url(#hole-mask-base-1b2)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#FFE082", "clip-path": "url(#left-clip-base-1b2)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#FFD54F",
                            "clip-path": "url(#right-clip-base-1b2)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-1b2)" }, [
                        g({ "clip-path": "url(#left-clip-base-1b2)" }, [
                            use({ href: "#gear-base-1b2", transform: "rotate(0)", fill: "#FFECB3" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-1b2)" }, [
                            use({ href: "#gear-base-1b2", transform: "rotate(0)", fill: "#FFE57F" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(165, 65) scale(0.45)" }, [
                    g({ mask: "url(#hole-mask-base-1b2)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#FFE082", "clip-path": "url(#left-clip-base-1b2)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#FFD54F",
                            "clip-path": "url(#right-clip-base-1b2)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-1b2)" }, [
                        g({ "clip-path": "url(#left-clip-base-1b2)" }, [
                            use({ href: "#gear-base-1b2", transform: "rotate(22.5)", fill: "#FFECB3" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-1b2)" }, [
                            use({ href: "#gear-base-1b2", transform: "rotate(22.5)", fill: "#FFE57F" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(170, 175) scale(0.65)" }, [
                    g({ mask: "url(#hole-mask-base-1b2)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#FFE082", "clip-path": "url(#left-clip-base-1b2)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#FFD54F",
                            "clip-path": "url(#right-clip-base-1b2)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-1b2)" }, [
                        g({ "clip-path": "url(#left-clip-base-1b2)" }, [
                            use({ href: "#gear-base-1b2", transform: "rotate(0)", fill: "#FFECB3" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-1b2)" }, [
                            use({ href: "#gear-base-1b2", transform: "rotate(0)", fill: "#FFE57F" }),
                        ]),
                    ]),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog0A00: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-0a00" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "teeth-0a00" }, [
                        use({ href: "#tooth-0a00" }),
                        use({ href: "#tooth-0a00", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-0a00", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-0a00", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-0a00", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-0a00", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-0a00", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-0a00", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-0a00" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-0a00" }),
                    ]),
                    mask({ id: "hole-mask-0a00" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-0a00" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    mask({ id: "broken-mask-0a00" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        path({
                            d: "M -10,10 L 40,60 L 90,50 L 128,128 L 140,170 L 190,180 L 266,266",
                            stroke: "black",
                            "stroke-width": "8",
                            fill: "none",
                            "stroke-linejoin": "round",
                        }),
                        path({
                            d: "M 128,128 L 100,180 L 100,240",
                            stroke: "black",
                            "stroke-width": "6",
                            fill: "none",
                            "stroke-linejoin": "round",
                        }),
                    ]),
                    clipPath({ id: "left-half-0a00" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-0a00" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#broken-mask-0a00)" }, [
                    g({ mask: "url(#hole-mask-0a00)" }, [
                        circle({ cx: "128", cy: "128", r: "61", fill: "#787878", "clip-path": "url(#left-half-0a00)" }),
                        circle({
                            cx: "128",
                            cy: "128",
                            r: "61",
                            fill: "#5F5F5F",
                            "clip-path": "url(#right-half-0a00)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-0a00)" }, [
                        use({ href: "#gear-solid-0a00", fill: "#C1C1C1", "clip-path": "url(#left-half-0a00)" }),
                        use({ href: "#gear-solid-0a00", fill: "#8F8F8F", "clip-path": "url(#right-half-0a00)" }),
                    ]),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog0A0: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-0a0" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "teeth-0a0" }, [
                        use({ href: "#tooth-0a0" }),
                        use({ href: "#tooth-0a0", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-0a0", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-0a0", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-0a0", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-0a0", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-0a0", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-0a0", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-0a0" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-0a0" }),
                    ]),
                    mask({ id: "hole-mask-0a0" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-0a0" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-0a0" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-0a0" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-0a0)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#6E6E6E", "clip-path": "url(#left-half-0a0)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#5A5A5A", "clip-path": "url(#right-half-0a0)" }),
                ]),
                g({ mask: "url(#face-mask-0a0)" }, [
                    use({ href: "#gear-solid-0a0", fill: "#BBBBBB", "clip-path": "url(#left-half-0a0)" }),
                    use({ href: "#gear-solid-0a0", fill: "#898989", "clip-path": "url(#right-half-0a0)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog0A1: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-0a1" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "teeth-0a1" }, [
                        use({ href: "#tooth-0a1" }),
                        use({ href: "#tooth-0a1", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-0a1", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-0a1", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-0a1", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-0a1", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-0a1", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-0a1", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-0a1" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-0a1" }),
                    ]),
                    mask({ id: "hole-mask-0a1" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-0a1" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-0a1" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-0a1" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-0a1)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#787878", "clip-path": "url(#left-half-0a1)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#5F5F5F", "clip-path": "url(#right-half-0a1)" }),
                ]),
                g({ mask: "url(#face-mask-0a1)" }, [
                    use({ href: "#gear-solid-0a1", fill: "#C1C1C1", "clip-path": "url(#left-half-0a1)" }),
                    use({ href: "#gear-solid-0a1", fill: "#8F8F8F", "clip-path": "url(#right-half-0a1)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog0B0: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-0b0" }, [polygon({ points: "-20,-92 -13,-122 13,-122 20,-92" })]),
                    g({ id: "teeth-0b0" }, [
                        use({ href: "#tooth-0b0" }),
                        use({ href: "#tooth-0b0", transform: "rotate(45)" }),
                        use({ href: "#tooth-0b0", transform: "rotate(90)" }),
                        use({ href: "#tooth-0b0", transform: "rotate(135)" }),
                        use({ href: "#tooth-0b0", transform: "rotate(180)" }),
                        use({ href: "#tooth-0b0", transform: "rotate(225)" }),
                        use({ href: "#tooth-0b0", transform: "rotate(270)" }),
                        use({ href: "#tooth-0b0", transform: "rotate(315)" }),
                    ]),
                    g({ id: "gear-base-0b0" }, [circle({ cx: "0", cy: "0", r: "96" }), use({ href: "#teeth-0b0" })]),
                    mask({ id: "hole-mask-base-0b0" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-base-0b0" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-clip-base-0b0" }, [
                        rect({ x: "-150", y: "-150", width: "150", height: "300" }),
                    ]),
                    clipPath({ id: "right-clip-base-0b0" }, [rect({ x: "0", y: "-150", width: "150", height: "300" })]),
                ]),
                g({ transform: "translate(188, 67) scale(0.52)" }, [
                    g({ mask: "url(#hole-mask-base-0b0)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#787878", "clip-path": "url(#left-clip-base-0b0)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#5F5F5F",
                            "clip-path": "url(#right-clip-base-0b0)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-0b0)" }, [
                        g({ "clip-path": "url(#left-clip-base-0b0)" }, [
                            use({ href: "#gear-base-0b0", transform: "rotate(0)", fill: "#C1C1C1" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-0b0)" }, [
                            use({ href: "#gear-base-0b0", transform: "rotate(0)", fill: "#8F8F8F" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(92, 163) scale(0.72)" }, [
                    g({ mask: "url(#hole-mask-base-0b0)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#787878", "clip-path": "url(#left-clip-base-0b0)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#5F5F5F",
                            "clip-path": "url(#right-clip-base-0b0)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-0b0)" }, [
                        g({ "clip-path": "url(#left-clip-base-0b0)" }, [
                            use({ href: "#gear-base-0b0", transform: "rotate(22.5)", fill: "#C1C1C1" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-0b0)" }, [
                            use({ href: "#gear-base-0b0", transform: "rotate(22.5)", fill: "#8F8F8F" }),
                        ]),
                    ]),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog0B1: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-0b1" }, [polygon({ points: "-20,-92 -13,-122 13,-122 20,-92" })]),
                    g({ id: "teeth-0b1" }, [
                        use({ href: "#tooth-0b1" }),
                        use({ href: "#tooth-0b1", transform: "rotate(45)" }),
                        use({ href: "#tooth-0b1", transform: "rotate(90)" }),
                        use({ href: "#tooth-0b1", transform: "rotate(135)" }),
                        use({ href: "#tooth-0b1", transform: "rotate(180)" }),
                        use({ href: "#tooth-0b1", transform: "rotate(225)" }),
                        use({ href: "#tooth-0b1", transform: "rotate(270)" }),
                        use({ href: "#tooth-0b1", transform: "rotate(315)" }),
                    ]),
                    g({ id: "gear-base-0b1" }, [circle({ cx: "0", cy: "0", r: "96" }), use({ href: "#teeth-0b1" })]),
                    mask({ id: "hole-mask-large-0b1" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-large-0b1" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "61", fill: "black" }),
                    ]),
                    mask({ id: "hole-mask-small-0b1" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "25", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-small-0b1" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "45", fill: "black" }),
                    ]),
                    clipPath({ id: "left-clip-0b1" }, [rect({ x: "-150", y: "-150", width: "150", height: "300" })]),
                    clipPath({ id: "right-clip-0b1" }, [rect({ x: "0", y: "-150", width: "150", height: "300" })]),
                ]),
                g({ transform: "translate(75, 185) scale(0.58)" }, [
                    g({ mask: "url(#hole-mask-small-0b1)" }, [
                        circle({ cx: "0", cy: "0", r: "45", fill: "#787878", "clip-path": "url(#left-clip-0b1)" }),
                        circle({ cx: "0", cy: "0", r: "45", fill: "#5F5F5F", "clip-path": "url(#right-clip-0b1)" }),
                    ]),
                    g({ mask: "url(#face-mask-small-0b1)" }, [
                        g({ "clip-path": "url(#left-clip-0b1)" }, [
                            use({ href: "#gear-base-0b1", transform: "rotate(-22.5)", fill: "#C1C1C1" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-0b1)" }, [
                            use({ href: "#gear-base-0b1", transform: "rotate(-22.5)", fill: "#8F8F8F" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(105, 85) scale(0.85)" }, [
                    g({ mask: "url(#hole-mask-large-0b1)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#787878", "clip-path": "url(#left-clip-0b1)" }),
                        circle({ cx: "0", cy: "0", r: "61", fill: "#5F5F5F", "clip-path": "url(#right-clip-0b1)" }),
                    ]),
                    g({ mask: "url(#face-mask-large-0b1)" }, [
                        g({ "clip-path": "url(#left-clip-0b1)" }, [
                            use({ href: "#gear-base-0b1", transform: "rotate(0)", fill: "#C1C1C1" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-0b1)" }, [
                            use({ href: "#gear-base-0b1", transform: "rotate(0)", fill: "#8F8F8F" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(185, 150) scale(0.58)" }, [
                    g({ mask: "url(#hole-mask-small-0b1)" }, [
                        circle({ cx: "0", cy: "0", r: "45", fill: "#787878", "clip-path": "url(#left-clip-0b1)" }),
                        circle({ cx: "0", cy: "0", r: "45", fill: "#5F5F5F", "clip-path": "url(#right-clip-0b1)" }),
                    ]),
                    g({ mask: "url(#face-mask-small-0b1)" }, [
                        g({ "clip-path": "url(#left-clip-0b1)" }, [
                            use({ href: "#gear-base-0b1", transform: "rotate(22.5)", fill: "#C1C1C1" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-0b1)" }, [
                            use({ href: "#gear-base-0b1", transform: "rotate(22.5)", fill: "#8F8F8F" }),
                        ]),
                    ]),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),
    Cog2A00: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-2a00" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "teeth-2a00" }, [
                        use({ href: "#tooth-2a00" }),
                        use({ href: "#tooth-2a00", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-2a00", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-2a00", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-2a00", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-2a00", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-2a00", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-2a00", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-2a00" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-2a00" }),
                    ]),
                    mask({ id: "hole-mask-2a00" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-2a00" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    mask({ id: "broken-mask-2a00" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        path({
                            d: "M -10,10 L 40,60 L 90,50 L 128,128 L 140,170 L 190,180 L 266,266",
                            stroke: "black",
                            "stroke-width": "8",
                            fill: "none",
                            "stroke-linejoin": "round",
                        }),
                        path({
                            d: "M 128,128 L 100,180 L 100,240",
                            stroke: "black",
                            "stroke-width": "6",
                            fill: "none",
                            "stroke-linejoin": "round",
                        }),
                    ]),
                    clipPath({ id: "left-half-2a00" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-2a00" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#broken-mask-2a00)" }, [
                    g({ mask: "url(#hole-mask-2a00)" }, [
                        circle({ cx: "128", cy: "128", r: "61", fill: "#C57482", "clip-path": "url(#left-half-2a00)" }),
                        circle({
                            cx: "128",
                            cy: "128",
                            r: "61",
                            fill: "#A35A68",
                            "clip-path": "url(#right-half-2a00)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-2a00)" }, [
                        use({ href: "#gear-solid-2a00", fill: "#E59DAA", "clip-path": "url(#left-half-2a00)" }),
                        use({ href: "#gear-solid-2a00", fill: "#CD8695", "clip-path": "url(#right-half-2a00)" }),
                    ]),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog2A0: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-2a0" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "teeth-2a0" }, [
                        use({ href: "#tooth-2a0" }),
                        use({ href: "#tooth-2a0", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-2a0", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-2a0", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-2a0", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-2a0", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-2a0", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-2a0", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-2a0" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-2a0" }),
                    ]),
                    mask({ id: "hole-mask-2a0" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-2a0" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-2a0" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-2a0" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-2a0)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#C57482", "clip-path": "url(#left-half-2a0)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#A35A68", "clip-path": "url(#right-half-2a0)" }),
                ]),
                g({ mask: "url(#face-mask-2a0)" }, [
                    use({ href: "#gear-solid-2a0", fill: "#E59DAA", "clip-path": "url(#left-half-2a0)" }),
                    use({ href: "#gear-solid-2a0", fill: "#CD8695", "clip-path": "url(#right-half-2a0)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog2A1: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-2a1" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "teeth-2a1" }, [
                        use({ href: "#tooth-2a1" }),
                        use({ href: "#tooth-2a1", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-2a1", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-2a1", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-2a1", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-2a1", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-2a1", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-2a1", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-2a1" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-2a1" }),
                    ]),
                    mask({ id: "hole-mask-2a1" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-2a1" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-2a1" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-2a1" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-2a1)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#C57482", "clip-path": "url(#left-half-2a1)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#A35A68", "clip-path": "url(#right-half-2a1)" }),
                ]),
                g({ mask: "url(#face-mask-2a1)" }, [
                    use({ href: "#gear-solid-2a1", fill: "#E59DAA", "clip-path": "url(#left-half-2a1)" }),
                    use({ href: "#gear-solid-2a1", fill: "#CD8695", "clip-path": "url(#right-half-2a1)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog2A2: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-2a2" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "m-tooth-2a2" }, [polygon({ points: "108,36 113,6 128,28 143,6 148,36" })]),
                    g({ id: "teeth-2a2" }, [
                        use({ href: "#tooth-2a2" }),
                        use({ href: "#tooth-2a2", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-2a2", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-2a2", transform: "rotate(270 128 128)" }),
                        use({ href: "#m-tooth-2a2", transform: "rotate(45 128 128)" }),
                        use({ href: "#m-tooth-2a2", transform: "rotate(135 128 128)" }),
                        use({ href: "#m-tooth-2a2", transform: "rotate(225 128 128)" }),
                        use({ href: "#m-tooth-2a2", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-2a2" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-2a2" }),
                    ]),
                    mask({ id: "hole-mask-2a2" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-2a2" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-2a2" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-2a2" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-2a2)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#C57482", "clip-path": "url(#left-half-2a2)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#A35A68", "clip-path": "url(#right-half-2a2)" }),
                ]),
                g({ mask: "url(#face-mask-2a2)" }, [
                    use({ href: "#gear-solid-2a2", fill: "#E59DAA", "clip-path": "url(#left-half-2a2)" }),
                    use({ href: "#gear-solid-2a2", fill: "#CD8695", "clip-path": "url(#right-half-2a2)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog2A3: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "bottom-tooth-2a3" }, [polygon({ points: "80,70 106,15 150,15 176,70" })]),
                    g({ id: "bottom-teeth-2a3" }, [
                        use({ href: "#bottom-tooth-2a3" }),
                        use({ href: "#bottom-tooth-2a3", transform: "rotate(45 128 128)" }),
                        use({ href: "#bottom-tooth-2a3", transform: "rotate(90 128 128)" }),
                        use({ href: "#bottom-tooth-2a3", transform: "rotate(135 128 128)" }),
                        use({ href: "#bottom-tooth-2a3", transform: "rotate(180 128 128)" }),
                        use({ href: "#bottom-tooth-2a3", transform: "rotate(225 128 128)" }),
                        use({ href: "#bottom-tooth-2a3", transform: "rotate(270 128 128)" }),
                        use({ href: "#bottom-tooth-2a3", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "bottom-gear-2a3" }, [
                        circle({ cx: "128", cy: "128", r: "80" }),
                        use({ href: "#bottom-teeth-2a3" }),
                    ]),
                    g({ id: "top-tooth-2a3" }, [polygon({ points: "95,85 114,40 142,40 161,85" })]),
                    g({ id: "top-teeth-2a3" }, [
                        use({ href: "#top-tooth-2a3" }),
                        use({ href: "#top-tooth-2a3", transform: "rotate(45 128 128)" }),
                        use({ href: "#top-tooth-2a3", transform: "rotate(90 128 128)" }),
                        use({ href: "#top-tooth-2a3", transform: "rotate(135 128 128)" }),
                        use({ href: "#top-tooth-2a3", transform: "rotate(180 128 128)" }),
                        use({ href: "#top-tooth-2a3", transform: "rotate(225 128 128)" }),
                        use({ href: "#top-tooth-2a3", transform: "rotate(270 128 128)" }),
                        use({ href: "#top-tooth-2a3", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "top-gear-2a3" }, [
                        circle({ cx: "128", cy: "128", r: "55" }),
                        use({ href: "#top-teeth-2a3", transform: "rotate(22.5 128 128)" }),
                    ]),
                    mask({ id: "hole-mask-2a3" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "22", fill: "black" }),
                    ]),
                    mask({ id: "recess-mask-2a3" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "35", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-2a3" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-2a3" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-2a3)" }, [
                    use({ href: "#bottom-gear-2a3", fill: "#C57482", "clip-path": "url(#left-half-2a3)" }),
                    use({ href: "#bottom-gear-2a3", fill: "#A35A68", "clip-path": "url(#right-half-2a3)" }),
                    g({ mask: "url(#recess-mask-2a3)" }, [
                        use({ href: "#top-gear-2a3", fill: "#E59DAA", "clip-path": "url(#left-half-2a3)" }),
                        use({ href: "#top-gear-2a3", fill: "#CD8695", "clip-path": "url(#right-half-2a3)" }),
                    ]),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog2B0: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-2b0" }, [polygon({ points: "-20,-92 -13,-122 13,-122 20,-92" })]),
                    g({ id: "teeth-2b0" }, [
                        use({ href: "#tooth-2b0" }),
                        use({ href: "#tooth-2b0", transform: "rotate(45)" }),
                        use({ href: "#tooth-2b0", transform: "rotate(90)" }),
                        use({ href: "#tooth-2b0", transform: "rotate(135)" }),
                        use({ href: "#tooth-2b0", transform: "rotate(180)" }),
                        use({ href: "#tooth-2b0", transform: "rotate(225)" }),
                        use({ href: "#tooth-2b0", transform: "rotate(270)" }),
                        use({ href: "#tooth-2b0", transform: "rotate(315)" }),
                    ]),
                    g({ id: "gear-base-2b0" }, [circle({ cx: "0", cy: "0", r: "96" }), use({ href: "#teeth-2b0" })]),
                    mask({ id: "hole-mask-base-2b0" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-base-2b0" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-clip-base-2b0" }, [
                        rect({ x: "-150", y: "-150", width: "150", height: "300" }),
                    ]),
                    clipPath({ id: "right-clip-base-2b0" }, [rect({ x: "0", y: "-150", width: "150", height: "300" })]),
                ]),
                g({ transform: "translate(188, 67) scale(0.52)" }, [
                    g({ mask: "url(#hole-mask-base-2b0)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#C57482", "clip-path": "url(#left-clip-base-2b0)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#A35A68",
                            "clip-path": "url(#right-clip-base-2b0)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-2b0)" }, [
                        g({ "clip-path": "url(#left-clip-base-2b0)" }, [
                            use({ href: "#gear-base-2b0", transform: "rotate(0)", fill: "#E59DAA" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-2b0)" }, [
                            use({ href: "#gear-base-2b0", transform: "rotate(0)", fill: "#CD8695" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(92, 163) scale(0.72)" }, [
                    g({ mask: "url(#hole-mask-base-2b0)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#C57482", "clip-path": "url(#left-clip-base-2b0)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#A35A68",
                            "clip-path": "url(#right-clip-base-2b0)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-2b0)" }, [
                        g({ "clip-path": "url(#left-clip-base-2b0)" }, [
                            use({ href: "#gear-base-2b0", transform: "rotate(22.5)", fill: "#E59DAA" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-2b0)" }, [
                            use({ href: "#gear-base-2b0", transform: "rotate(22.5)", fill: "#CD8695" }),
                        ]),
                    ]),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog2B1: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-2b1" }, [polygon({ points: "-20,-92 -13,-122 13,-122 20,-92" })]),
                    g({ id: "teeth-2b1" }, [
                        use({ href: "#tooth-2b1" }),
                        use({ href: "#tooth-2b1", transform: "rotate(45)" }),
                        use({ href: "#tooth-2b1", transform: "rotate(90)" }),
                        use({ href: "#tooth-2b1", transform: "rotate(135)" }),
                        use({ href: "#tooth-2b1", transform: "rotate(180)" }),
                        use({ href: "#tooth-2b1", transform: "rotate(225)" }),
                        use({ href: "#tooth-2b1", transform: "rotate(270)" }),
                        use({ href: "#tooth-2b1", transform: "rotate(315)" }),
                    ]),
                    g({ id: "gear-base-2b1" }, [circle({ cx: "0", cy: "0", r: "96" }), use({ href: "#teeth-2b1" })]),
                    mask({ id: "hole-mask-large-2b1" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-large-2b1" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "61", fill: "black" }),
                    ]),
                    mask({ id: "hole-mask-small-2b1" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "25", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-small-2b1" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "45", fill: "black" }),
                    ]),
                    clipPath({ id: "left-clip-2b1" }, [rect({ x: "-150", y: "-150", width: "150", height: "300" })]),
                    clipPath({ id: "right-clip-2b1" }, [rect({ x: "0", y: "-150", width: "150", height: "300" })]),
                ]),
                g({ transform: "translate(75, 185) scale(0.58)" }, [
                    g({ mask: "url(#hole-mask-small-2b1)" }, [
                        circle({ cx: "0", cy: "0", r: "45", fill: "#C57482", "clip-path": "url(#left-clip-2b1)" }),
                        circle({ cx: "0", cy: "0", r: "45", fill: "#A35A68", "clip-path": "url(#right-clip-2b1)" }),
                    ]),
                    g({ mask: "url(#face-mask-small-2b1)" }, [
                        g({ "clip-path": "url(#left-clip-2b1)" }, [
                            use({ href: "#gear-base-2b1", transform: "rotate(-22.5)", fill: "#E59DAA" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-2b1)" }, [
                            use({ href: "#gear-base-2b1", transform: "rotate(-22.5)", fill: "#CD8695" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(105, 85) scale(0.85)" }, [
                    g({ mask: "url(#hole-mask-large-2b1)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#C57482", "clip-path": "url(#left-clip-2b1)" }),
                        circle({ cx: "0", cy: "0", r: "61", fill: "#A35A68", "clip-path": "url(#right-clip-2b1)" }),
                    ]),
                    g({ mask: "url(#face-mask-large-2b1)" }, [
                        g({ "clip-path": "url(#left-clip-2b1)" }, [
                            use({ href: "#gear-base-2b1", transform: "rotate(0)", fill: "#E59DAA" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-2b1)" }, [
                            use({ href: "#gear-base-2b1", transform: "rotate(0)", fill: "#CD8695" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(185, 150) scale(0.58)" }, [
                    g({ mask: "url(#hole-mask-small-2b1)" }, [
                        circle({ cx: "0", cy: "0", r: "45", fill: "#C57482", "clip-path": "url(#left-clip-2b1)" }),
                        circle({ cx: "0", cy: "0", r: "45", fill: "#A35A68", "clip-path": "url(#right-clip-2b1)" }),
                    ]),
                    g({ mask: "url(#face-mask-small-2b1)" }, [
                        g({ "clip-path": "url(#left-clip-2b1)" }, [
                            use({ href: "#gear-base-2b1", transform: "rotate(22.5)", fill: "#E59DAA" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-2b1)" }, [
                            use({ href: "#gear-base-2b1", transform: "rotate(22.5)", fill: "#CD8695" }),
                        ]),
                    ]),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog2B2: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-2b2" }, [polygon({ points: "-20,-92 -13,-122 13,-122 20,-92" })]),
                    g({ id: "teeth-2b2" }, [
                        use({ href: "#tooth-2b2" }),
                        use({ href: "#tooth-2b2", transform: "rotate(45)" }),
                        use({ href: "#tooth-2b2", transform: "rotate(90)" }),
                        use({ href: "#tooth-2b2", transform: "rotate(135)" }),
                        use({ href: "#tooth-2b2", transform: "rotate(180)" }),
                        use({ href: "#tooth-2b2", transform: "rotate(225)" }),
                        use({ href: "#tooth-2b2", transform: "rotate(270)" }),
                        use({ href: "#tooth-2b2", transform: "rotate(315)" }),
                    ]),
                    g({ id: "gear-base-2b2" }, [circle({ cx: "0", cy: "0", r: "96" }), use({ href: "#teeth-2b2" })]),
                    mask({ id: "hole-mask-base-2b2" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-base-2b2" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-clip-base-2b2" }, [
                        rect({ x: "-150", y: "-150", width: "150", height: "300" }),
                    ]),
                    clipPath({ id: "right-clip-base-2b2" }, [rect({ x: "0", y: "-150", width: "150", height: "300" })]),
                ]),
                g({ transform: "translate(80, 100) scale(0.65)" }, [
                    g({ mask: "url(#hole-mask-base-2b2)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#C57482", "clip-path": "url(#left-clip-base-2b2)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#A35A68",
                            "clip-path": "url(#right-clip-base-2b2)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-2b2)" }, [
                        g({ "clip-path": "url(#left-clip-base-2b2)" }, [
                            use({ href: "#gear-base-2b2", transform: "rotate(0)", fill: "#E59DAA" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-2b2)" }, [
                            use({ href: "#gear-base-2b2", transform: "rotate(0)", fill: "#CD8695" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(165, 65) scale(0.45)" }, [
                    g({ mask: "url(#hole-mask-base-2b2)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#C57482", "clip-path": "url(#left-clip-base-2b2)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#A35A68",
                            "clip-path": "url(#right-clip-base-2b2)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-2b2)" }, [
                        g({ "clip-path": "url(#left-clip-base-2b2)" }, [
                            use({ href: "#gear-base-2b2", transform: "rotate(22.5)", fill: "#E59DAA" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-2b2)" }, [
                            use({ href: "#gear-base-2b2", transform: "rotate(22.5)", fill: "#CD8695" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(170, 175) scale(0.65)" }, [
                    g({ mask: "url(#hole-mask-base-2b2)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#C57482", "clip-path": "url(#left-clip-base-2b2)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#A35A68",
                            "clip-path": "url(#right-clip-base-2b2)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-2b2)" }, [
                        g({ "clip-path": "url(#left-clip-base-2b2)" }, [
                            use({ href: "#gear-base-2b2", transform: "rotate(0)", fill: "#E59DAA" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-2b2)" }, [
                            use({ href: "#gear-base-2b2", transform: "rotate(0)", fill: "#CD8695" }),
                        ]),
                    ]),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog2B3: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-2b3" }, [polygon({ points: "-20,-92 -13,-122 13,-122 20,-92" })]),
                    g({ id: "teeth-2b3" }, [
                        use({ href: "#tooth-2b3" }),
                        use({ href: "#tooth-2b3", transform: "rotate(45)" }),
                        use({ href: "#tooth-2b3", transform: "rotate(90)" }),
                        use({ href: "#tooth-2b3", transform: "rotate(135)" }),
                        use({ href: "#tooth-2b3", transform: "rotate(180)" }),
                        use({ href: "#tooth-2b3", transform: "rotate(225)" }),
                        use({ href: "#tooth-2b3", transform: "rotate(270)" }),
                        use({ href: "#tooth-2b3", transform: "rotate(315)" }),
                    ]),
                    g({ id: "gear-base-2b3" }, [circle({ cx: "0", cy: "0", r: "96" }), use({ href: "#teeth-2b3" })]),
                    mask({ id: "hole-mask-base-2b3" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-base-2b3" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-clip-base-2b3" }, [
                        rect({ x: "-150", y: "-150", width: "150", height: "300" }),
                    ]),
                    clipPath({ id: "right-clip-base-2b3" }, [rect({ x: "0", y: "-150", width: "150", height: "300" })]),
                ]),
                g({ transform: "translate(85, 185) scale(0.45)" }, [
                    g({ mask: "url(#hole-mask-base-2b3)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#C57482", "clip-path": "url(#left-clip-base-2b3)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#A35A68",
                            "clip-path": "url(#right-clip-base-2b3)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-2b3)" }, [
                        g({ "clip-path": "url(#left-clip-base-2b3)" }, [
                            use({ href: "#gear-base-2b3", transform: "rotate(22.5)", fill: "#E59DAA" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-2b3)" }, [
                            use({ href: "#gear-base-2b3", transform: "rotate(22.5)", fill: "#CD8695" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(170, 65) scale(0.45)" }, [
                    g({ mask: "url(#hole-mask-base-2b3)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#C57482", "clip-path": "url(#left-clip-base-2b3)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#A35A68",
                            "clip-path": "url(#right-clip-base-2b3)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-2b3)" }, [
                        g({ "clip-path": "url(#left-clip-base-2b3)" }, [
                            use({ href: "#gear-base-2b3", transform: "rotate(22.5)", fill: "#E59DAA" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-2b3)" }, [
                            use({ href: "#gear-base-2b3", transform: "rotate(22.5)", fill: "#CD8695" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(90, 95) scale(0.65)" }, [
                    g({ mask: "url(#hole-mask-base-2b3)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#C57482", "clip-path": "url(#left-clip-base-2b3)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#A35A68",
                            "clip-path": "url(#right-clip-base-2b3)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-2b3)" }, [
                        g({ "clip-path": "url(#left-clip-base-2b3)" }, [
                            use({ href: "#gear-base-2b3", transform: "rotate(0)", fill: "#E59DAA" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-2b3)" }, [
                            use({ href: "#gear-base-2b3", transform: "rotate(0)", fill: "#CD8695" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(165, 170) scale(0.65)" }, [
                    g({ mask: "url(#hole-mask-base-2b3)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#C57482", "clip-path": "url(#left-clip-base-2b3)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#A35A68",
                            "clip-path": "url(#right-clip-base-2b3)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-2b3)" }, [
                        g({ "clip-path": "url(#left-clip-base-2b3)" }, [
                            use({ href: "#gear-base-2b3", transform: "rotate(0)", fill: "#E59DAA" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-2b3)" }, [
                            use({ href: "#gear-base-2b3", transform: "rotate(0)", fill: "#CD8695" }),
                        ]),
                    ]),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog3A00: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-3a00" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "teeth-3a00" }, [
                        use({ href: "#tooth-3a00" }),
                        use({ href: "#tooth-3a00", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-3a00", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-3a00", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-3a00", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-3a00", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-3a00", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-3a00", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-3a00" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-3a00" }),
                    ]),
                    mask({ id: "hole-mask-3a00" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-3a00" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    mask({ id: "broken-mask-3a00" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        path({
                            d: "M -10,10 L 40,60 L 90,50 L 128,128 L 140,170 L 190,180 L 266,266",
                            stroke: "black",
                            "stroke-width": "8",
                            fill: "none",
                            "stroke-linejoin": "round",
                        }),
                        path({
                            d: "M 128,128 L 100,180 L 100,240",
                            stroke: "black",
                            "stroke-width": "6",
                            fill: "none",
                            "stroke-linejoin": "round",
                        }),
                    ]),
                    clipPath({ id: "left-half-3a00" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-3a00" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#broken-mask-3a00)" }, [
                    g({ mask: "url(#hole-mask-3a00)" }, [
                        circle({ cx: "128", cy: "128", r: "61", fill: "#8E44AD", "clip-path": "url(#left-half-3a00)" }),
                        circle({
                            cx: "128",
                            cy: "128",
                            r: "61",
                            fill: "#662D91",
                            "clip-path": "url(#right-half-3a00)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-3a00)" }, [
                        use({ href: "#gear-solid-3a00", fill: "#CF92F0", "clip-path": "url(#left-half-3a00)" }),
                        use({ href: "#gear-solid-3a00", fill: "#9B59C6", "clip-path": "url(#right-half-3a00)" }),
                    ]),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog3A0: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-3a0" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "teeth-3a0" }, [
                        use({ href: "#tooth-3a0" }),
                        use({ href: "#tooth-3a0", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-3a0", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-3a0", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-3a0", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-3a0", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-3a0", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-3a0", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-3a0" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-3a0" }),
                    ]),
                    mask({ id: "hole-mask-3a0" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-3a0" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-3a0" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-3a0" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-3a0)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#903BA1", "clip-path": "url(#left-half-3a0)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#6A2A8A", "clip-path": "url(#right-half-3a0)" }),
                ]),
                g({ mask: "url(#face-mask-3a0)" }, [
                    use({ href: "#gear-solid-3a0", fill: "#CF8BEC", "clip-path": "url(#left-half-3a0)" }),
                    use({ href: "#gear-solid-3a0", fill: "#9D52C1", "clip-path": "url(#right-half-3a0)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog3A1: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-3a1" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "teeth-3a1" }, [
                        use({ href: "#tooth-3a1" }),
                        use({ href: "#tooth-3a1", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-3a1", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-3a1", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-3a1", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-3a1", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-3a1", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-3a1", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-3a1" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-3a1" }),
                    ]),
                    mask({ id: "hole-mask-3a1" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-3a1" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-3a1" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-3a1" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-3a1)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#8E44AD", "clip-path": "url(#left-half-3a1)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#662D91", "clip-path": "url(#right-half-3a1)" }),
                ]),
                g({ mask: "url(#face-mask-3a1)" }, [
                    use({ href: "#gear-solid-3a1", fill: "#CF92F0", "clip-path": "url(#left-half-3a1)" }),
                    use({ href: "#gear-solid-3a1", fill: "#9B59C6", "clip-path": "url(#right-half-3a1)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog3A2: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-3a2" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "m-tooth-3a2" }, [polygon({ points: "108,36 113,6 128,28 143,6 148,36" })]),
                    g({ id: "teeth-3a2" }, [
                        use({ href: "#tooth-3a2" }),
                        use({ href: "#tooth-3a2", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-3a2", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-3a2", transform: "rotate(270 128 128)" }),
                        use({ href: "#m-tooth-3a2", transform: "rotate(45 128 128)" }),
                        use({ href: "#m-tooth-3a2", transform: "rotate(135 128 128)" }),
                        use({ href: "#m-tooth-3a2", transform: "rotate(225 128 128)" }),
                        use({ href: "#m-tooth-3a2", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-3a2" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-3a2" }),
                    ]),
                    mask({ id: "hole-mask-3a2" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-3a2" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-3a2" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-3a2" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-3a2)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#8E44AD", "clip-path": "url(#left-half-3a2)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#662D91", "clip-path": "url(#right-half-3a2)" }),
                ]),
                g({ mask: "url(#face-mask-3a2)" }, [
                    use({ href: "#gear-solid-3a2", fill: "#CF92F0", "clip-path": "url(#left-half-3a2)" }),
                    use({ href: "#gear-solid-3a2", fill: "#9B59C6", "clip-path": "url(#right-half-3a2)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog3A3: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "bottom-tooth-3a3" }, [polygon({ points: "80,70 106,15 150,15 176,70" })]),
                    g({ id: "bottom-teeth-3a3" }, [
                        use({ href: "#bottom-tooth-3a3" }),
                        use({ href: "#bottom-tooth-3a3", transform: "rotate(45 128 128)" }),
                        use({ href: "#bottom-tooth-3a3", transform: "rotate(90 128 128)" }),
                        use({ href: "#bottom-tooth-3a3", transform: "rotate(135 128 128)" }),
                        use({ href: "#bottom-tooth-3a3", transform: "rotate(180 128 128)" }),
                        use({ href: "#bottom-tooth-3a3", transform: "rotate(225 128 128)" }),
                        use({ href: "#bottom-tooth-3a3", transform: "rotate(270 128 128)" }),
                        use({ href: "#bottom-tooth-3a3", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "bottom-gear-3a3" }, [
                        circle({ cx: "128", cy: "128", r: "80" }),
                        use({ href: "#bottom-teeth-3a3" }),
                    ]),
                    g({ id: "top-tooth-3a3" }, [polygon({ points: "95,85 114,40 142,40 161,85" })]),
                    g({ id: "top-teeth-3a3" }, [
                        use({ href: "#top-tooth-3a3" }),
                        use({ href: "#top-tooth-3a3", transform: "rotate(45 128 128)" }),
                        use({ href: "#top-tooth-3a3", transform: "rotate(90 128 128)" }),
                        use({ href: "#top-tooth-3a3", transform: "rotate(135 128 128)" }),
                        use({ href: "#top-tooth-3a3", transform: "rotate(180 128 128)" }),
                        use({ href: "#top-tooth-3a3", transform: "rotate(225 128 128)" }),
                        use({ href: "#top-tooth-3a3", transform: "rotate(270 128 128)" }),
                        use({ href: "#top-tooth-3a3", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "top-gear-3a3" }, [
                        circle({ cx: "128", cy: "128", r: "55" }),
                        use({ href: "#top-teeth-3a3", transform: "rotate(22.5 128 128)" }),
                    ]),
                    mask({ id: "hole-mask-3a3" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "22", fill: "black" }),
                    ]),
                    mask({ id: "recess-mask-3a3" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "35", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-3a3" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-3a3" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-3a3)" }, [
                    use({ href: "#bottom-gear-3a3", fill: "#8E44AD", "clip-path": "url(#left-half-3a3)" }),
                    use({ href: "#bottom-gear-3a3", fill: "#662D91", "clip-path": "url(#right-half-3a3)" }),
                    g({ mask: "url(#recess-mask-3a3)" }, [
                        use({ href: "#top-gear-3a3", fill: "#CF92F0", "clip-path": "url(#left-half-3a3)" }),
                        use({ href: "#top-gear-3a3", fill: "#9B59C6", "clip-path": "url(#right-half-3a3)" }),
                    ]),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog3A4: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "bottom-tooth-3a4" }, [polygon({ points: "90,65 106,10 150,10 166,65" })]),
                    g({ id: "bottom-teeth-3a4" }, [
                        use({ href: "#bottom-tooth-3a4" }),
                        use({ href: "#bottom-tooth-3a4", transform: "rotate(45 128 128)" }),
                        use({ href: "#bottom-tooth-3a4", transform: "rotate(90 128 128)" }),
                        use({ href: "#bottom-tooth-3a4", transform: "rotate(135 128 128)" }),
                        use({ href: "#bottom-tooth-3a4", transform: "rotate(180 128 128)" }),
                        use({ href: "#bottom-tooth-3a4", transform: "rotate(225 128 128)" }),
                        use({ href: "#bottom-tooth-3a4", transform: "rotate(270 128 128)" }),
                        use({ href: "#bottom-tooth-3a4", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "bottom-gear-3a4" }, [
                        circle({ cx: "128", cy: "128", r: "86" }),
                        use({ href: "#bottom-teeth-3a4" }),
                    ]),
                    g({ id: "middle-tooth-3a4" }, [polygon({ points: "98,80 112,35 144,35 158,80" })]),
                    g({ id: "middle-teeth-3a4" }, [
                        use({ href: "#middle-tooth-3a4" }),
                        use({ href: "#middle-tooth-3a4", transform: "rotate(45 128 128)" }),
                        use({ href: "#middle-tooth-3a4", transform: "rotate(90 128 128)" }),
                        use({ href: "#middle-tooth-3a4", transform: "rotate(135 128 128)" }),
                        use({ href: "#middle-tooth-3a4", transform: "rotate(180 128 128)" }),
                        use({ href: "#middle-tooth-3a4", transform: "rotate(225 128 128)" }),
                        use({ href: "#middle-tooth-3a4", transform: "rotate(270 128 128)" }),
                        use({ href: "#middle-tooth-3a4", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "middle-gear-3a4" }, [
                        circle({ cx: "128", cy: "128", r: "64" }),
                        use({ href: "#middle-teeth-3a4", transform: "rotate(22.5 128 128)" }),
                    ]),
                    g({ id: "top-tooth-3a4" }, [polygon({ points: "108,95 118,58 138,58 148,95" })]),
                    g({ id: "top-teeth-3a4" }, [
                        use({ href: "#top-tooth-3a4" }),
                        use({ href: "#top-tooth-3a4", transform: "rotate(45 128 128)" }),
                        use({ href: "#top-tooth-3a4", transform: "rotate(90 128 128)" }),
                        use({ href: "#top-tooth-3a4", transform: "rotate(135 128 128)" }),
                        use({ href: "#top-tooth-3a4", transform: "rotate(180 128 128)" }),
                        use({ href: "#top-tooth-3a4", transform: "rotate(225 128 128)" }),
                        use({ href: "#top-tooth-3a4", transform: "rotate(270 128 128)" }),
                        use({ href: "#top-tooth-3a4", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "top-gear-3a4" }, [
                        circle({ cx: "128", cy: "128", r: "42" }),
                        use({ href: "#top-teeth-3a4" }),
                    ]),
                    mask({ id: "hole-mask-3a4" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "14", fill: "black" }),
                    ]),
                    mask({ id: "recess-mask-3a4" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "26", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-3a4" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-3a4" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-3a4)" }, [
                    use({ href: "#bottom-gear-3a4", fill: "#7A329F", "clip-path": "url(#left-half-3a4)" }),
                    use({ href: "#bottom-gear-3a4", fill: "#581C7A", "clip-path": "url(#right-half-3a4)" }),
                    use({ href: "#middle-gear-3a4", fill: "#A453D6", "clip-path": "url(#left-half-3a4)" }),
                    use({ href: "#middle-gear-3a4", fill: "#7B39A3", "clip-path": "url(#right-half-3a4)" }),
                    g({ mask: "url(#recess-mask-3a4)" }, [
                        use({ href: "#top-gear-3a4", fill: "#CF92F0", "clip-path": "url(#left-half-3a4)" }),
                        use({ href: "#top-gear-3a4", fill: "#9B59C6", "clip-path": "url(#right-half-3a4)" }),
                    ]),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog3B0: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-3b0" }, [polygon({ points: "-20,-92 -13,-122 13,-122 20,-92" })]),
                    g({ id: "teeth-3b0" }, [
                        use({ href: "#tooth-3b0" }),
                        use({ href: "#tooth-3b0", transform: "rotate(45)" }),
                        use({ href: "#tooth-3b0", transform: "rotate(90)" }),
                        use({ href: "#tooth-3b0", transform: "rotate(135)" }),
                        use({ href: "#tooth-3b0", transform: "rotate(180)" }),
                        use({ href: "#tooth-3b0", transform: "rotate(225)" }),
                        use({ href: "#tooth-3b0", transform: "rotate(270)" }),
                        use({ href: "#tooth-3b0", transform: "rotate(315)" }),
                    ]),
                    g({ id: "gear-base-3b0" }, [circle({ cx: "0", cy: "0", r: "96" }), use({ href: "#teeth-3b0" })]),
                    mask({ id: "hole-mask-base-3b0" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-base-3b0" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-clip-base-3b0" }, [
                        rect({ x: "-150", y: "-150", width: "150", height: "300" }),
                    ]),
                    clipPath({ id: "right-clip-base-3b0" }, [rect({ x: "0", y: "-150", width: "150", height: "300" })]),
                ]),
                g({ transform: "translate(188, 67) scale(0.52)" }, [
                    g({ mask: "url(#hole-mask-base-3b0)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#8E44AD", "clip-path": "url(#left-clip-base-3b0)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#662D91",
                            "clip-path": "url(#right-clip-base-3b0)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-3b0)" }, [
                        g({ "clip-path": "url(#left-clip-base-3b0)" }, [
                            use({ href: "#gear-base-3b0", transform: "rotate(0)", fill: "#CF92F0" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-3b0)" }, [
                            use({ href: "#gear-base-3b0", transform: "rotate(0)", fill: "#9B59C6" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(92, 163) scale(0.72)" }, [
                    g({ mask: "url(#hole-mask-base-3b0)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#8E44AD", "clip-path": "url(#left-clip-base-3b0)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#662D91",
                            "clip-path": "url(#right-clip-base-3b0)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-3b0)" }, [
                        g({ "clip-path": "url(#left-clip-base-3b0)" }, [
                            use({ href: "#gear-base-3b0", transform: "rotate(22.5)", fill: "#CF92F0" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-3b0)" }, [
                            use({ href: "#gear-base-3b0", transform: "rotate(22.5)", fill: "#9B59C6" }),
                        ]),
                    ]),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog3B1: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-3b1" }, [polygon({ points: "-20,-92 -13,-122 13,-122 20,-92" })]),
                    g({ id: "teeth-3b1" }, [
                        use({ href: "#tooth-3b1" }),
                        use({ href: "#tooth-3b1", transform: "rotate(45)" }),
                        use({ href: "#tooth-3b1", transform: "rotate(90)" }),
                        use({ href: "#tooth-3b1", transform: "rotate(135)" }),
                        use({ href: "#tooth-3b1", transform: "rotate(180)" }),
                        use({ href: "#tooth-3b1", transform: "rotate(225)" }),
                        use({ href: "#tooth-3b1", transform: "rotate(270)" }),
                        use({ href: "#tooth-3b1", transform: "rotate(315)" }),
                    ]),
                    g({ id: "gear-base-3b1" }, [circle({ cx: "0", cy: "0", r: "96" }), use({ href: "#teeth-3b1" })]),
                    mask({ id: "hole-mask-large-3b1" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-large-3b1" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "61", fill: "black" }),
                    ]),
                    mask({ id: "hole-mask-small-3b1" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "25", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-small-3b1" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "45", fill: "black" }),
                    ]),
                    clipPath({ id: "left-clip-3b1" }, [rect({ x: "-150", y: "-150", width: "150", height: "300" })]),
                    clipPath({ id: "right-clip-3b1" }, [rect({ x: "0", y: "-150", width: "150", height: "300" })]),
                ]),
                g({ transform: "translate(75, 185) scale(0.58)" }, [
                    g({ mask: "url(#hole-mask-small-3b1)" }, [
                        circle({ cx: "0", cy: "0", r: "45", fill: "#8E44AD", "clip-path": "url(#left-clip-3b1)" }),
                        circle({ cx: "0", cy: "0", r: "45", fill: "#662D91", "clip-path": "url(#right-clip-3b1)" }),
                    ]),
                    g({ mask: "url(#face-mask-small-3b1)" }, [
                        g({ "clip-path": "url(#left-clip-3b1)" }, [
                            use({ href: "#gear-base-3b1", transform: "rotate(-22.5)", fill: "#CF92F0" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-3b1)" }, [
                            use({ href: "#gear-base-3b1", transform: "rotate(-22.5)", fill: "#9B59C6" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(105, 85) scale(0.85)" }, [
                    g({ mask: "url(#hole-mask-large-3b1)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#8E44AD", "clip-path": "url(#left-clip-3b1)" }),
                        circle({ cx: "0", cy: "0", r: "61", fill: "#662D91", "clip-path": "url(#right-clip-3b1)" }),
                    ]),
                    g({ mask: "url(#face-mask-large-3b1)" }, [
                        g({ "clip-path": "url(#left-clip-3b1)" }, [
                            use({ href: "#gear-base-3b1", transform: "rotate(0)", fill: "#CF92F0" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-3b1)" }, [
                            use({ href: "#gear-base-3b1", transform: "rotate(0)", fill: "#9B59C6" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(185, 150) scale(0.58)" }, [
                    g({ mask: "url(#hole-mask-small-3b1)" }, [
                        circle({ cx: "0", cy: "0", r: "45", fill: "#8E44AD", "clip-path": "url(#left-clip-3b1)" }),
                        circle({ cx: "0", cy: "0", r: "45", fill: "#662D91", "clip-path": "url(#right-clip-3b1)" }),
                    ]),
                    g({ mask: "url(#face-mask-small-3b1)" }, [
                        g({ "clip-path": "url(#left-clip-3b1)" }, [
                            use({ href: "#gear-base-3b1", transform: "rotate(22.5)", fill: "#CF92F0" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-3b1)" }, [
                            use({ href: "#gear-base-3b1", transform: "rotate(22.5)", fill: "#9B59C6" }),
                        ]),
                    ]),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog3B2: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-3b2" }, [polygon({ points: "-20,-92 -13,-122 13,-122 20,-92" })]),
                    g({ id: "teeth-3b2" }, [
                        use({ href: "#tooth-3b2" }),
                        use({ href: "#tooth-3b2", transform: "rotate(45)" }),
                        use({ href: "#tooth-3b2", transform: "rotate(90)" }),
                        use({ href: "#tooth-3b2", transform: "rotate(135)" }),
                        use({ href: "#tooth-3b2", transform: "rotate(180)" }),
                        use({ href: "#tooth-3b2", transform: "rotate(225)" }),
                        use({ href: "#tooth-3b2", transform: "rotate(270)" }),
                        use({ href: "#tooth-3b2", transform: "rotate(315)" }),
                    ]),
                    g({ id: "gear-base-3b2" }, [circle({ cx: "0", cy: "0", r: "96" }), use({ href: "#teeth-3b2" })]),
                    mask({ id: "hole-mask-base-3b2" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-base-3b2" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-clip-base-3b2" }, [
                        rect({ x: "-150", y: "-150", width: "150", height: "300" }),
                    ]),
                    clipPath({ id: "right-clip-base-3b2" }, [rect({ x: "0", y: "-150", width: "150", height: "300" })]),
                ]),
                g({ transform: "translate(80, 100) scale(0.65)" }, [
                    g({ mask: "url(#hole-mask-base-3b2)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#8E44AD", "clip-path": "url(#left-clip-base-3b2)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#662D91",
                            "clip-path": "url(#right-clip-base-3b2)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-3b2)" }, [
                        g({ "clip-path": "url(#left-clip-base-3b2)" }, [
                            use({ href: "#gear-base-3b2", transform: "rotate(0)", fill: "#CF92F0" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-3b2)" }, [
                            use({ href: "#gear-base-3b2", transform: "rotate(0)", fill: "#9B59C6" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(165, 65) scale(0.45)" }, [
                    g({ mask: "url(#hole-mask-base-3b2)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#8E44AD", "clip-path": "url(#left-clip-base-3b2)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#662D91",
                            "clip-path": "url(#right-clip-base-3b2)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-3b2)" }, [
                        g({ "clip-path": "url(#left-clip-base-3b2)" }, [
                            use({ href: "#gear-base-3b2", transform: "rotate(22.5)", fill: "#CF92F0" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-3b2)" }, [
                            use({ href: "#gear-base-3b2", transform: "rotate(22.5)", fill: "#9B59C6" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(170, 175) scale(0.65)" }, [
                    g({ mask: "url(#hole-mask-base-3b2)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#8E44AD", "clip-path": "url(#left-clip-base-3b2)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#662D91",
                            "clip-path": "url(#right-clip-base-3b2)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-3b2)" }, [
                        g({ "clip-path": "url(#left-clip-base-3b2)" }, [
                            use({ href: "#gear-base-3b2", transform: "rotate(0)", fill: "#CF92F0" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-3b2)" }, [
                            use({ href: "#gear-base-3b2", transform: "rotate(0)", fill: "#9B59C6" }),
                        ]),
                    ]),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog3B3: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-3b3" }, [polygon({ points: "-20,-92 -13,-122 13,-122 20,-92" })]),
                    g({ id: "teeth-3b3" }, [
                        use({ href: "#tooth-3b3" }),
                        use({ href: "#tooth-3b3", transform: "rotate(45)" }),
                        use({ href: "#tooth-3b3", transform: "rotate(90)" }),
                        use({ href: "#tooth-3b3", transform: "rotate(135)" }),
                        use({ href: "#tooth-3b3", transform: "rotate(180)" }),
                        use({ href: "#tooth-3b3", transform: "rotate(225)" }),
                        use({ href: "#tooth-3b3", transform: "rotate(270)" }),
                        use({ href: "#tooth-3b3", transform: "rotate(315)" }),
                    ]),
                    g({ id: "gear-base-3b3" }, [circle({ cx: "0", cy: "0", r: "96" }), use({ href: "#teeth-3b3" })]),
                    mask({ id: "hole-mask-base-3b3" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-base-3b3" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-clip-base-3b3" }, [
                        rect({ x: "-150", y: "-150", width: "150", height: "300" }),
                    ]),
                    clipPath({ id: "right-clip-base-3b3" }, [rect({ x: "0", y: "-150", width: "150", height: "300" })]),
                ]),
                g({ transform: "translate(85, 185) scale(0.45)" }, [
                    g({ mask: "url(#hole-mask-base-3b3)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#8E44AD", "clip-path": "url(#left-clip-base-3b3)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#662D91",
                            "clip-path": "url(#right-clip-base-3b3)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-3b3)" }, [
                        g({ "clip-path": "url(#left-clip-base-3b3)" }, [
                            use({ href: "#gear-base-3b3", transform: "rotate(22.5)", fill: "#CF92F0" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-3b3)" }, [
                            use({ href: "#gear-base-3b3", transform: "rotate(22.5)", fill: "#9B59C6" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(170, 65) scale(0.45)" }, [
                    g({ mask: "url(#hole-mask-base-3b3)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#8E44AD", "clip-path": "url(#left-clip-base-3b3)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#662D91",
                            "clip-path": "url(#right-clip-base-3b3)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-3b3)" }, [
                        g({ "clip-path": "url(#left-clip-base-3b3)" }, [
                            use({ href: "#gear-base-3b3", transform: "rotate(22.5)", fill: "#CF92F0" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-3b3)" }, [
                            use({ href: "#gear-base-3b3", transform: "rotate(22.5)", fill: "#9B59C6" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(90, 95) scale(0.65)" }, [
                    g({ mask: "url(#hole-mask-base-3b3)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#8E44AD", "clip-path": "url(#left-clip-base-3b3)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#662D91",
                            "clip-path": "url(#right-clip-base-3b3)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-3b3)" }, [
                        g({ "clip-path": "url(#left-clip-base-3b3)" }, [
                            use({ href: "#gear-base-3b3", transform: "rotate(0)", fill: "#CF92F0" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-3b3)" }, [
                            use({ href: "#gear-base-3b3", transform: "rotate(0)", fill: "#9B59C6" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(165, 170) scale(0.65)" }, [
                    g({ mask: "url(#hole-mask-base-3b3)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#8E44AD", "clip-path": "url(#left-clip-base-3b3)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#662D91",
                            "clip-path": "url(#right-clip-base-3b3)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-3b3)" }, [
                        g({ "clip-path": "url(#left-clip-base-3b3)" }, [
                            use({ href: "#gear-base-3b3", transform: "rotate(0)", fill: "#CF92F0" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-3b3)" }, [
                            use({ href: "#gear-base-3b3", transform: "rotate(0)", fill: "#9B59C6" }),
                        ]),
                    ]),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog3B4: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-3b4" }, [polygon({ points: "-20,-92 -13,-122 13,-122 20,-92" })]),
                    g({ id: "teeth-3b4" }, [
                        use({ href: "#tooth-3b4" }),
                        use({ href: "#tooth-3b4", transform: "rotate(45)" }),
                        use({ href: "#tooth-3b4", transform: "rotate(90)" }),
                        use({ href: "#tooth-3b4", transform: "rotate(135)" }),
                        use({ href: "#tooth-3b4", transform: "rotate(180)" }),
                        use({ href: "#tooth-3b4", transform: "rotate(225)" }),
                        use({ href: "#tooth-3b4", transform: "rotate(270)" }),
                        use({ href: "#tooth-3b4", transform: "rotate(315)" }),
                    ]),
                    g({ id: "gear-base-3b4" }, [circle({ cx: "0", cy: "0", r: "96" }), use({ href: "#teeth-3b4" })]),
                    mask({ id: "hole-mask-base-3b4" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-base-3b4" }, [
                        rect({ x: "-150", y: "-150", width: "300", height: "300", fill: "white" }),
                        circle({ cx: "0", cy: "0", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-clip-base-3b4" }, [
                        rect({ x: "-150", y: "-150", width: "150", height: "300" }),
                    ]),
                    clipPath({ id: "right-clip-base-3b4" }, [rect({ x: "0", y: "-150", width: "150", height: "300" })]),
                ]),
                g({ transform: "translate(176, 80) scale(0.65)" }, [
                    g({ mask: "url(#hole-mask-base-3b4)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#8E44AD", "clip-path": "url(#left-clip-base-3b4)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#662D91",
                            "clip-path": "url(#right-clip-base-3b4)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-3b4)" }, [
                        g({ "clip-path": "url(#left-clip-base-3b4)" }, [
                            use({ href: "#gear-base-3b4", transform: "rotate(0)", fill: "#CF92F0" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-3b4)" }, [
                            use({ href: "#gear-base-3b4", transform: "rotate(0)", fill: "#9B59C6" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(76, 76) scale(0.45)" }, [
                    g({ mask: "url(#hole-mask-base-3b4)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#8E44AD", "clip-path": "url(#left-clip-base-3b4)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#662D91",
                            "clip-path": "url(#right-clip-base-3b4)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-3b4)" }, [
                        g({ "clip-path": "url(#left-clip-base-3b4)" }, [
                            use({ href: "#gear-base-3b4", transform: "rotate(0)", fill: "#CF92F0" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-3b4)" }, [
                            use({ href: "#gear-base-3b4", transform: "rotate(0)", fill: "#9B59C6" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(180, 180) scale(0.45)" }, [
                    g({ mask: "url(#hole-mask-base-3b4)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#8E44AD", "clip-path": "url(#left-clip-base-3b4)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#662D91",
                            "clip-path": "url(#right-clip-base-3b4)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-3b4)" }, [
                        g({ "clip-path": "url(#left-clip-base-3b4)" }, [
                            use({ href: "#gear-base-3b4", transform: "rotate(0)", fill: "#CF92F0" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-3b4)" }, [
                            use({ href: "#gear-base-3b4", transform: "rotate(0)", fill: "#9B59C6" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(80, 176) scale(0.65)" }, [
                    g({ mask: "url(#hole-mask-base-3b4)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#8E44AD", "clip-path": "url(#left-clip-base-3b4)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#662D91",
                            "clip-path": "url(#right-clip-base-3b4)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-3b4)" }, [
                        g({ "clip-path": "url(#left-clip-base-3b4)" }, [
                            use({ href: "#gear-base-3b4", transform: "rotate(0)", fill: "#CF92F0" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-3b4)" }, [
                            use({ href: "#gear-base-3b4", transform: "rotate(0)", fill: "#9B59C6" }),
                        ]),
                    ]),
                ]),
                g({ transform: "translate(128, 128) scale(0.45)" }, [
                    g({ mask: "url(#hole-mask-base-3b4)" }, [
                        circle({ cx: "0", cy: "0", r: "61", fill: "#8E44AD", "clip-path": "url(#left-clip-base-3b4)" }),
                        circle({
                            cx: "0",
                            cy: "0",
                            r: "61",
                            fill: "#662D91",
                            "clip-path": "url(#right-clip-base-3b4)",
                        }),
                    ]),
                    g({ mask: "url(#face-mask-base-3b4)" }, [
                        g({ "clip-path": "url(#left-clip-base-3b4)" }, [
                            use({ href: "#gear-base-3b4", transform: "rotate(0)", fill: "#CF92F0" }),
                        ]),
                        g({ "clip-path": "url(#right-clip-base-3b4)" }, [
                            use({ href: "#gear-base-3b4", transform: "rotate(0)", fill: "#9B59C6" }),
                        ]),
                    ]),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog1up: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-1up" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "arrow-tooth-1up" }, [
                        polygon({ points: "108,36 112,22 92,22 128,2 164,22 144,22 148,36" }),
                    ]),
                    g({ id: "teeth-1up" }, [
                        use({ href: "#arrow-tooth-1up" }),
                        use({ href: "#tooth-1up", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-1up", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-1up", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-1up", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-1up", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-1up", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-1up", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-1up" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-1up" }),
                    ]),
                    mask({ id: "hole-mask-1up" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-1up" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-1up" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-1up" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-1up)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#FFE082", "clip-path": "url(#left-half-1up)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#FFD54F", "clip-path": "url(#right-half-1up)" }),
                ]),
                g({ mask: "url(#face-mask-1up)" }, [
                    use({ href: "#gear-solid-1up", fill: "#FFECB3", "clip-path": "url(#left-half-1up)" }),
                    use({ href: "#gear-solid-1up", fill: "#FFE57F", "clip-path": "url(#right-half-1up)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog0ad: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-0ad" }, [polygon({ points: "98,60 104,16 152,16 158,60" })]),
                    g({ id: "teeth-0ad" }, [
                        use({ href: "#tooth-0ad" }),
                        use({ href: "#tooth-0ad", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-0ad", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-0ad", transform: "rotate(270 128 128)" }),
                    ]),
                    g({ id: "gear-solid-0ad" }, [
                        circle({ cx: "128", cy: "128", r: "80" }),
                        use({ href: "#teeth-0ad" }),
                    ]),
                    mask({ id: "hole-mask-0ad" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "28", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-0ad" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "52", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-0ad" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-0ad" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-0ad)" }, [
                    circle({ cx: "128", cy: "128", r: "52", fill: "#787878", "clip-path": "url(#left-half-0ad)" }),
                    circle({ cx: "128", cy: "128", r: "52", fill: "#5F5F5F", "clip-path": "url(#right-half-0ad)" }),
                ]),
                g({ mask: "url(#face-mask-0ad)" }, [
                    use({ href: "#gear-solid-0ad", fill: "#C1C1C1", "clip-path": "url(#left-half-0ad)" }),
                    use({ href: "#gear-solid-0ad", fill: "#8F8F8F", "clip-path": "url(#right-half-0ad)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog0di: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-0di" }, [polygon({ points: "98,60 104,16 152,16 158,60" })]),
                    g({ id: "teeth-0di" }, [
                        use({ href: "#tooth-0di", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-0di", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-0di", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-0di", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-0di" }, [
                        circle({ cx: "128", cy: "128", r: "80" }),
                        use({ href: "#teeth-0di" }),
                    ]),
                    mask({ id: "hole-mask-0di" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "28", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-0di" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "52", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-0di" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-0di" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-0di)" }, [
                    circle({ cx: "128", cy: "128", r: "52", fill: "#787878", "clip-path": "url(#left-half-0di)" }),
                    circle({ cx: "128", cy: "128", r: "52", fill: "#5F5F5F", "clip-path": "url(#right-half-0di)" }),
                ]),
                g({ mask: "url(#face-mask-0di)" }, [
                    use({ href: "#gear-solid-0di", fill: "#C1C1C1", "clip-path": "url(#left-half-0di)" }),
                    use({ href: "#gear-solid-0di", fill: "#8F8F8F", "clip-path": "url(#right-half-0di)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog1ad: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-1ad" }, [polygon({ points: "98,60 104,16 152,16 158,60" })]),
                    g({ id: "teeth-1ad" }, [
                        use({ href: "#tooth-1ad" }),
                        use({ href: "#tooth-1ad", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-1ad", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-1ad", transform: "rotate(270 128 128)" }),
                    ]),
                    g({ id: "gear-solid-1ad" }, [
                        circle({ cx: "128", cy: "128", r: "80" }),
                        use({ href: "#teeth-1ad" }),
                    ]),
                    mask({ id: "hole-mask-1ad" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "28", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-1ad" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "52", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-1ad" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-1ad" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-1ad)" }, [
                    circle({ cx: "128", cy: "128", r: "52", fill: "#FFE082", "clip-path": "url(#left-half-1ad)" }),
                    circle({ cx: "128", cy: "128", r: "52", fill: "#FFD54F", "clip-path": "url(#right-half-1ad)" }),
                ]),
                g({ mask: "url(#face-mask-1ad)" }, [
                    use({ href: "#gear-solid-1ad", fill: "#FFECB3", "clip-path": "url(#left-half-1ad)" }),
                    use({ href: "#gear-solid-1ad", fill: "#FFE57F", "clip-path": "url(#right-half-1ad)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog1di: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-1di" }, [polygon({ points: "98,60 104,16 152,16 158,60" })]),
                    g({ id: "teeth-1di" }, [
                        use({ href: "#tooth-1di", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-1di", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-1di", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-1di", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-1di" }, [
                        circle({ cx: "128", cy: "128", r: "80" }),
                        use({ href: "#teeth-1di" }),
                    ]),
                    mask({ id: "hole-mask-1di" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "28", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-1di" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "52", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-1di" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-1di" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-1di)" }, [
                    circle({ cx: "128", cy: "128", r: "52", fill: "#FFE082", "clip-path": "url(#left-half-1di)" }),
                    circle({ cx: "128", cy: "128", r: "52", fill: "#FFD54F", "clip-path": "url(#right-half-1di)" }),
                ]),
                g({ mask: "url(#face-mask-1di)" }, [
                    use({ href: "#gear-solid-1di", fill: "#FFECB3", "clip-path": "url(#left-half-1di)" }),
                    use({ href: "#gear-solid-1di", fill: "#FFE57F", "clip-path": "url(#right-half-1di)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog2ad: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-2ad" }, [polygon({ points: "98,60 104,16 152,16 158,60" })]),
                    g({ id: "teeth-2ad" }, [
                        use({ href: "#tooth-2ad" }),
                        use({ href: "#tooth-2ad", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-2ad", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-2ad", transform: "rotate(270 128 128)" }),
                    ]),
                    g({ id: "gear-solid-2ad" }, [
                        circle({ cx: "128", cy: "128", r: "80" }),
                        use({ href: "#teeth-2ad" }),
                    ]),
                    mask({ id: "hole-mask-2ad" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "28", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-2ad" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "52", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-2ad" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-2ad" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-2ad)" }, [
                    circle({ cx: "128", cy: "128", r: "52", fill: "#C57482", "clip-path": "url(#left-half-2ad)" }),
                    circle({ cx: "128", cy: "128", r: "52", fill: "#A35A68", "clip-path": "url(#right-half-2ad)" }),
                ]),
                g({ mask: "url(#face-mask-2ad)" }, [
                    use({ href: "#gear-solid-2ad", fill: "#E59DAA", "clip-path": "url(#left-half-2ad)" }),
                    use({ href: "#gear-solid-2ad", fill: "#CD8695", "clip-path": "url(#right-half-2ad)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog2di: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-2di" }, [polygon({ points: "98,60 104,16 152,16 158,60" })]),
                    g({ id: "teeth-2di" }, [
                        use({ href: "#tooth-2di", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-2di", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-2di", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-2di", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-2di" }, [
                        circle({ cx: "128", cy: "128", r: "80" }),
                        use({ href: "#teeth-2di" }),
                    ]),
                    mask({ id: "hole-mask-2di" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "28", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-2di" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "52", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-2di" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-2di" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-2di)" }, [
                    circle({ cx: "128", cy: "128", r: "52", fill: "#C57482", "clip-path": "url(#left-half-2di)" }),
                    circle({ cx: "128", cy: "128", r: "52", fill: "#A35A68", "clip-path": "url(#right-half-2di)" }),
                ]),
                g({ mask: "url(#face-mask-2di)" }, [
                    use({ href: "#gear-solid-2di", fill: "#E59DAA", "clip-path": "url(#left-half-2di)" }),
                    use({ href: "#gear-solid-2di", fill: "#CD8695", "clip-path": "url(#right-half-2di)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogCry0: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-cry0" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "teeth-cry0" }, [
                        use({ href: "#tooth-cry0" }),
                        use({ href: "#tooth-cry0", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-cry0", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-cry0", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-cry0", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-cry0", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-cry0", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-cry0", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-cry0" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-cry0" }),
                    ]),
                    mask({ id: "hole-mask-outline-cry0" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "41", fill: "black" }),
                    ]),
                    mask({ id: "hole-mask-color-cry0" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    clipPath({ id: "stripe1-cry0" }, [
                        rect({ x: "-100", y: "-50", width: "456", height: "90", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe2-cry0" }, [
                        rect({ x: "-100", y: "40", width: "456", height: "35", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe3-cry0" }, [
                        rect({ x: "-100", y: "75", width: "456", height: "25", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe4-cry0" }, [
                        rect({ x: "-100", y: "100", width: "456", height: "40", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe5-cry0" }, [
                        rect({ x: "-100", y: "140", width: "456", height: "50", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe6-cry0" }, [
                        rect({ x: "-100", y: "190", width: "456", height: "30", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe7-cry0" }, [
                        rect({ x: "-100", y: "220", width: "456", height: "130", transform: "rotate(135 128 128)" }),
                    ]),
                ]),
                g({ mask: "url(#hole-mask-outline-cry0)" }, [
                    use({
                        href: "#gear-solid-cry0",
                        fill: "#2A1E00",
                        stroke: "#2A1E00",
                        "stroke-width": "8",
                        "stroke-linejoin": "round",
                    }),
                ]),
                g({ mask: "url(#hole-mask-color-cry0)" }, [
                    use({ href: "#gear-solid-cry0", fill: "#FFDE70", "clip-path": "url(#stripe1-cry0)" }),
                    use({ href: "#gear-solid-cry0", fill: "#E9A31E", "clip-path": "url(#stripe2-cry0)" }),
                    use({ href: "#gear-solid-cry0", fill: "#FFF2C2", "clip-path": "url(#stripe3-cry0)" }),
                    use({ href: "#gear-solid-cry0", fill: "#E9A31E", "clip-path": "url(#stripe4-cry0)" }),
                    use({ href: "#gear-solid-cry0", fill: "#9A6A11", "clip-path": "url(#stripe5-cry0)" }),
                    use({ href: "#gear-solid-cry0", fill: "#E9A31E", "clip-path": "url(#stripe6-cry0)" }),
                    use({ href: "#gear-solid-cry0", fill: "#7A5200", "clip-path": "url(#stripe7-cry0)" }),
                ]),
                circle({ cx: "103", cy: "43", r: "7", fill: "#FFF2C2" }),
                circle({ cx: "49", cy: "93", r: "7", fill: "#FFF2C2" }),
                circle({ cx: "100", cy: "220", r: "7", fill: "#FFDE70" }),
                circle({ cx: "213", cy: "170", r: "7", fill: "#FFF2C2" }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogCry1: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-cry1" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "teeth-cry1" }, [
                        use({ href: "#tooth-cry1" }),
                        use({ href: "#tooth-cry1", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-cry1", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-cry1", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-cry1", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-cry1", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-cry1", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-cry1", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-cry1" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-cry1" }),
                    ]),
                    mask({ id: "hole-mask-outline-cry1" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "41", fill: "black" }),
                    ]),
                    mask({ id: "hole-mask-color-cry1" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    clipPath({ id: "stripe1-cry1" }, [
                        rect({ x: "-100", y: "-50", width: "456", height: "90", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe2-cry1" }, [
                        rect({ x: "-100", y: "40", width: "456", height: "35", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe3-cry1" }, [
                        rect({ x: "-100", y: "75", width: "456", height: "25", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe4-cry1" }, [
                        rect({ x: "-100", y: "100", width: "456", height: "40", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe5-cry1" }, [
                        rect({ x: "-100", y: "140", width: "456", height: "50", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe6-cry1" }, [
                        rect({ x: "-100", y: "190", width: "456", height: "30", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe7-cry1" }, [
                        rect({ x: "-100", y: "220", width: "456", height: "130", transform: "rotate(135 128 128)" }),
                    ]),
                ]),
                g({ mask: "url(#hole-mask-outline-cry1)" }, [
                    use({
                        href: "#gear-solid-cry1",
                        fill: "#2A0404",
                        stroke: "#2A0404",
                        "stroke-width": "8",
                        "stroke-linejoin": "round",
                    }),
                ]),
                g({ mask: "url(#hole-mask-color-cry1)" }, [
                    use({ href: "#gear-solid-cry1", fill: "#FF8282", "clip-path": "url(#stripe1-cry1)" }),
                    use({ href: "#gear-solid-cry1", fill: "#E92626", "clip-path": "url(#stripe2-cry1)" }),
                    use({ href: "#gear-solid-cry1", fill: "#FFC2C2", "clip-path": "url(#stripe3-cry1)" }),
                    use({ href: "#gear-solid-cry1", fill: "#E92626", "clip-path": "url(#stripe4-cry1)" }),
                    use({ href: "#gear-solid-cry1", fill: "#9A1212", "clip-path": "url(#stripe5-cry1)" }),
                    use({ href: "#gear-solid-cry1", fill: "#E92626", "clip-path": "url(#stripe6-cry1)" }),
                    use({ href: "#gear-solid-cry1", fill: "#7A0B0B", "clip-path": "url(#stripe7-cry1)" }),
                ]),
                circle({ cx: "103", cy: "43", r: "7", fill: "#FFC2C2" }),
                circle({ cx: "49", cy: "93", r: "7", fill: "#FFC2C2" }),
                circle({ cx: "100", cy: "220", r: "7", fill: "#FF8282" }),
                circle({ cx: "213", cy: "170", r: "7", fill: "#FFC2C2" }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogCry2: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-cry2" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "teeth-cry2" }, [
                        use({ href: "#tooth-cry2" }),
                        use({ href: "#tooth-cry2", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-cry2", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-cry2", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-cry2", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-cry2", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-cry2", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-cry2", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-cry2" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-cry2" }),
                    ]),
                    mask({ id: "hole-mask-outline-cry2" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "41", fill: "black" }),
                    ]),
                    mask({ id: "hole-mask-color-cry2" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    clipPath({ id: "stripe1-cry2" }, [
                        rect({ x: "-100", y: "-50", width: "456", height: "90", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe2-cry2" }, [
                        rect({ x: "-100", y: "40", width: "456", height: "35", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe3-cry2" }, [
                        rect({ x: "-100", y: "75", width: "456", height: "25", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe4-cry2" }, [
                        rect({ x: "-100", y: "100", width: "456", height: "40", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe5-cry2" }, [
                        rect({ x: "-100", y: "140", width: "456", height: "50", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe6-cry2" }, [
                        rect({ x: "-100", y: "190", width: "456", height: "30", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe7-cry2" }, [
                        rect({ x: "-100", y: "220", width: "456", height: "130", transform: "rotate(135 128 128)" }),
                    ]),
                ]),
                g({ mask: "url(#hole-mask-outline-cry2)" }, [
                    use({
                        href: "#gear-solid-cry2",
                        fill: "#2A0421",
                        stroke: "#2A0421",
                        "stroke-width": "8",
                        "stroke-linejoin": "round",
                    }),
                ]),
                g({ mask: "url(#hole-mask-color-cry2)" }, [
                    use({ href: "#gear-solid-cry2", fill: "#FFAEE5", "clip-path": "url(#stripe1-cry2)" }),
                    use({ href: "#gear-solid-cry2", fill: "#E95AC3", "clip-path": "url(#stripe2-cry2)" }),
                    use({ href: "#gear-solid-cry2", fill: "#FFE4F2", "clip-path": "url(#stripe3-cry2)" }),
                    use({ href: "#gear-solid-cry2", fill: "#E95AC3", "clip-path": "url(#stripe4-cry2)" }),
                    use({ href: "#gear-solid-cry2", fill: "#9A1E86", "clip-path": "url(#stripe5-cry2)" }),
                    use({ href: "#gear-solid-cry2", fill: "#E95AC3", "clip-path": "url(#stripe6-cry2)" }),
                    use({ href: "#gear-solid-cry2", fill: "#7A1A68", "clip-path": "url(#stripe7-cry2)" }),
                ]),
                circle({ cx: "103", cy: "43", r: "7", fill: "#FFE4F2" }),
                circle({ cx: "49", cy: "93", r: "7", fill: "#FFE4F2" }),
                circle({ cx: "100", cy: "220", r: "7", fill: "#FFAEE5" }),
                circle({ cx: "213", cy: "170", r: "7", fill: "#FFE4F2" }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogCry3: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-cry3" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "teeth-cry3" }, [
                        use({ href: "#tooth-cry3" }),
                        use({ href: "#tooth-cry3", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-cry3", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-cry3", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-cry3", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-cry3", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-cry3", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-cry3", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-cry3" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-cry3" }),
                    ]),
                    mask({ id: "hole-mask-outline-cry3" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "41", fill: "black" }),
                    ]),
                    mask({ id: "hole-mask-color-cry3" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    clipPath({ id: "stripe1-cry3" }, [
                        rect({ x: "-100", y: "-50", width: "456", height: "90", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe2-cry3" }, [
                        rect({ x: "-100", y: "40", width: "456", height: "35", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe3-cry3" }, [
                        rect({ x: "-100", y: "75", width: "456", height: "25", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe4-cry3" }, [
                        rect({ x: "-100", y: "100", width: "456", height: "40", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe5-cry3" }, [
                        rect({ x: "-100", y: "140", width: "456", height: "50", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe6-cry3" }, [
                        rect({ x: "-100", y: "190", width: "456", height: "30", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe7-cry3" }, [
                        rect({ x: "-100", y: "220", width: "456", height: "130", transform: "rotate(135 128 128)" }),
                    ]),
                ]),
                g({ mask: "url(#hole-mask-outline-cry3)" }, [
                    use({
                        href: "#gear-solid-cry3",
                        fill: "#3D1C00",
                        stroke: "#3D1C00",
                        "stroke-width": "8",
                        "stroke-linejoin": "round",
                    }),
                ]),
                g({ mask: "url(#hole-mask-color-cry3)" }, [
                    use({ href: "#gear-solid-cry3", fill: "#FFAA4D", "clip-path": "url(#stripe1-cry3)" }),
                    use({ href: "#gear-solid-cry3", fill: "#F27D0C", "clip-path": "url(#stripe2-cry3)" }),
                    use({ href: "#gear-solid-cry3", fill: "#FFD0A1", "clip-path": "url(#stripe3-cry3)" }),
                    use({ href: "#gear-solid-cry3", fill: "#F27D0C", "clip-path": "url(#stripe4-cry3)" }),
                    use({ href: "#gear-solid-cry3", fill: "#B35500", "clip-path": "url(#stripe5-cry3)" }),
                    use({ href: "#gear-solid-cry3", fill: "#F27D0C", "clip-path": "url(#stripe6-cry3)" }),
                    use({ href: "#gear-solid-cry3", fill: "#803C00", "clip-path": "url(#stripe7-cry3)" }),
                ]),
                circle({ cx: "103", cy: "43", r: "7", fill: "#FFD0A1" }),
                circle({ cx: "49", cy: "93", r: "7", fill: "#FFD0A1" }),
                circle({ cx: "100", cy: "220", r: "7", fill: "#FFAA4D" }),
                circle({ cx: "213", cy: "170", r: "7", fill: "#FFD0A1" }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogCry4: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-cry4" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "teeth-cry4" }, [
                        use({ href: "#tooth-cry4" }),
                        use({ href: "#tooth-cry4", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-cry4", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-cry4", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-cry4", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-cry4", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-cry4", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-cry4", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-cry4" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-cry4" }),
                    ]),
                    mask({ id: "hole-mask-outline-cry4" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "41", fill: "black" }),
                    ]),
                    mask({ id: "hole-mask-color-cry4" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    clipPath({ id: "stripe1-cry4" }, [
                        rect({ x: "-100", y: "-50", width: "456", height: "90", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe2-cry4" }, [
                        rect({ x: "-100", y: "40", width: "456", height: "35", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe3-cry4" }, [
                        rect({ x: "-100", y: "75", width: "456", height: "25", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe4-cry4" }, [
                        rect({ x: "-100", y: "100", width: "456", height: "40", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe5-cry4" }, [
                        rect({ x: "-100", y: "140", width: "456", height: "50", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe6-cry4" }, [
                        rect({ x: "-100", y: "190", width: "456", height: "30", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe7-cry4" }, [
                        rect({ x: "-100", y: "220", width: "456", height: "130", transform: "rotate(135 128 128)" }),
                    ]),
                ]),
                g({ mask: "url(#hole-mask-outline-cry4)" }, [
                    use({
                        href: "#gear-solid-cry4",
                        fill: "#042A12",
                        stroke: "#042A12",
                        "stroke-width": "8",
                        "stroke-linejoin": "round",
                    }),
                ]),
                g({ mask: "url(#hole-mask-color-cry4)" }, [
                    use({ href: "#gear-solid-cry4", fill: "#7AE99D", "clip-path": "url(#stripe1-cry4)" }),
                    use({ href: "#gear-solid-cry4", fill: "#26BD55", "clip-path": "url(#stripe2-cry4)" }),
                    use({ href: "#gear-solid-cry4", fill: "#C2F2D4", "clip-path": "url(#stripe3-cry4)" }),
                    use({ href: "#gear-solid-cry4", fill: "#26BD55", "clip-path": "url(#stripe4-cry4)" }),
                    use({ href: "#gear-solid-cry4", fill: "#148238", "clip-path": "url(#stripe5-cry4)" }),
                    use({ href: "#gear-solid-cry4", fill: "#26BD55", "clip-path": "url(#stripe6-cry4)" }),
                    use({ href: "#gear-solid-cry4", fill: "#0F6129", "clip-path": "url(#stripe7-cry4)" }),
                ]),
                circle({ cx: "103", cy: "43", r: "7", fill: "#C2F2D4" }),
                circle({ cx: "49", cy: "93", r: "7", fill: "#C2F2D4" }),
                circle({ cx: "100", cy: "220", r: "7", fill: "#7AE99D" }),
                circle({ cx: "213", cy: "170", r: "7", fill: "#C2F2D4" }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogCry5: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-cry5" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "teeth-cry5" }, [
                        use({ href: "#tooth-cry5" }),
                        use({ href: "#tooth-cry5", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-cry5", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-cry5", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-cry5", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-cry5", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-cry5", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-cry5", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-cry5" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-cry5" }),
                    ]),
                    mask({ id: "hole-mask-outline-cry5" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "41", fill: "black" }),
                    ]),
                    mask({ id: "hole-mask-color-cry5" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    clipPath({ id: "stripe1-cry5" }, [
                        rect({ x: "-100", y: "-50", width: "456", height: "90", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe2-cry5" }, [
                        rect({ x: "-100", y: "40", width: "456", height: "35", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe3-cry5" }, [
                        rect({ x: "-100", y: "75", width: "456", height: "25", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe4-cry5" }, [
                        rect({ x: "-100", y: "100", width: "456", height: "40", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe5-cry5" }, [
                        rect({ x: "-100", y: "140", width: "456", height: "50", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe6-cry5" }, [
                        rect({ x: "-100", y: "190", width: "456", height: "30", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe7-cry5" }, [
                        rect({ x: "-100", y: "220", width: "456", height: "130", transform: "rotate(135 128 128)" }),
                    ]),
                ]),
                g({ mask: "url(#hole-mask-outline-cry5)" }, [
                    use({
                        href: "#gear-solid-cry5",
                        fill: "#0B1B2A",
                        stroke: "#0B1B2A",
                        "stroke-width": "8",
                        "stroke-linejoin": "round",
                    }),
                ]),
                g({ mask: "url(#hole-mask-color-cry5)" }, [
                    use({ href: "#gear-solid-cry5", fill: "#A5D6FF", "clip-path": "url(#stripe1-cry5)" }),
                    use({ href: "#gear-solid-cry5", fill: "#5CABF2", "clip-path": "url(#stripe2-cry5)" }),
                    use({ href: "#gear-solid-cry5", fill: "#E6F4FF", "clip-path": "url(#stripe3-cry5)" }),
                    use({ href: "#gear-solid-cry5", fill: "#5CABF2", "clip-path": "url(#stripe4-cry5)" }),
                    use({ href: "#gear-solid-cry5", fill: "#3075B3", "clip-path": "url(#stripe5-cry5)" }),
                    use({ href: "#gear-solid-cry5", fill: "#5CABF2", "clip-path": "url(#stripe6-cry5)" }),
                    use({ href: "#gear-solid-cry5", fill: "#1F5282", "clip-path": "url(#stripe7-cry5)" }),
                ]),
                circle({ cx: "103", cy: "43", r: "7", fill: "#E6F4FF" }),
                circle({ cx: "49", cy: "93", r: "7", fill: "#E6F4FF" }),
                circle({ cx: "100", cy: "220", r: "7", fill: "#A5D6FF" }),
                circle({ cx: "213", cy: "170", r: "7", fill: "#E6F4FF" }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog1do: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-1do" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "arrow-tooth-1do" }, [
                        polygon({ points: "108,36 112,22 92,22 128,2 164,22 144,22 148,36" }),
                    ]),
                    g({ id: "teeth-1do" }, [
                        use({ href: "#tooth-1do" }),
                        use({ href: "#tooth-1do", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-1do", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-1do", transform: "rotate(135 128 128)" }),
                        use({ href: "#arrow-tooth-1do", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-1do", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-1do", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-1do", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-1do" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-1do" }),
                    ]),
                    mask({ id: "hole-mask-1do" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-1do" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-1do" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-1do" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-1do)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#FFE082", "clip-path": "url(#left-half-1do)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#FFD54F", "clip-path": "url(#right-half-1do)" }),
                ]),
                g({ mask: "url(#face-mask-1do)" }, [
                    use({ href: "#gear-solid-1do", fill: "#FFECB3", "clip-path": "url(#left-half-1do)" }),
                    use({ href: "#gear-solid-1do", fill: "#FFE57F", "clip-path": "url(#right-half-1do)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog1le: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-1le" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "arrow-tooth-1le" }, [
                        polygon({ points: "108,36 112,22 92,22 128,2 164,22 144,22 148,36" }),
                    ]),
                    g({ id: "teeth-1le" }, [
                        use({ href: "#tooth-1le" }),
                        use({ href: "#tooth-1le", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-1le", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-1le", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-1le", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-1le", transform: "rotate(225 128 128)" }),
                        use({ href: "#arrow-tooth-1le", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-1le", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-1le" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-1le" }),
                    ]),
                    mask({ id: "hole-mask-1le" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-1le" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-1le" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-1le" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-1le)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#FFE082", "clip-path": "url(#left-half-1le)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#FFD54F", "clip-path": "url(#right-half-1le)" }),
                ]),
                g({ mask: "url(#face-mask-1le)" }, [
                    use({ href: "#gear-solid-1le", fill: "#FFECB3", "clip-path": "url(#left-half-1le)" }),
                    use({ href: "#gear-solid-1le", fill: "#FFE57F", "clip-path": "url(#right-half-1le)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog1ri: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-1ri" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "arrow-tooth-1ri" }, [
                        polygon({ points: "108,36 112,22 92,22 128,2 164,22 144,22 148,36" }),
                    ]),
                    g({ id: "teeth-1ri" }, [
                        use({ href: "#tooth-1ri" }),
                        use({ href: "#tooth-1ri", transform: "rotate(45 128 128)" }),
                        use({ href: "#arrow-tooth-1ri", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-1ri", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-1ri", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-1ri", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-1ri", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-1ri", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-1ri" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-1ri" }),
                    ]),
                    mask({ id: "hole-mask-1ri" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-1ri" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-1ri" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-1ri" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-1ri)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#FFE082", "clip-path": "url(#left-half-1ri)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#FFD54F", "clip-path": "url(#right-half-1ri)" }),
                ]),
                g({ mask: "url(#face-mask-1ri)" }, [
                    use({ href: "#gear-solid-1ri", fill: "#FFECB3", "clip-path": "url(#left-half-1ri)" }),
                    use({ href: "#gear-solid-1ri", fill: "#FFE57F", "clip-path": "url(#right-half-1ri)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog2up: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-2up" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "arrow-tooth-2up" }, [
                        polygon({ points: "108,36 112,22 92,22 128,2 164,22 144,22 148,36" }),
                    ]),
                    g({ id: "teeth-2up" }, [
                        use({ href: "#arrow-tooth-2up" }),
                        use({ href: "#tooth-2up", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-2up", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-2up", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-2up", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-2up", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-2up", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-2up", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-2up" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-2up" }),
                    ]),
                    mask({ id: "hole-mask-2up" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-2up" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-2up" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-2up" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-2up)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#C57482", "clip-path": "url(#left-half-2up)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#A35A68", "clip-path": "url(#right-half-2up)" }),
                ]),
                g({ mask: "url(#face-mask-2up)" }, [
                    use({ href: "#gear-solid-2up", fill: "#E59DAA", "clip-path": "url(#left-half-2up)" }),
                    use({ href: "#gear-solid-2up", fill: "#CD8695", "clip-path": "url(#right-half-2up)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog2do: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-2do" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "arrow-tooth-2do" }, [
                        polygon({ points: "108,36 112,22 92,22 128,2 164,22 144,22 148,36" }),
                    ]),
                    g({ id: "teeth-2do" }, [
                        use({ href: "#tooth-2do" }),
                        use({ href: "#tooth-2do", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-2do", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-2do", transform: "rotate(135 128 128)" }),
                        use({ href: "#arrow-tooth-2do", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-2do", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-2do", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-2do", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-2do" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-2do" }),
                    ]),
                    mask({ id: "hole-mask-2do" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-2do" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-2do" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-2do" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-2do)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#C57482", "clip-path": "url(#left-half-2do)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#A35A68", "clip-path": "url(#right-half-2do)" }),
                ]),
                g({ mask: "url(#face-mask-2do)" }, [
                    use({ href: "#gear-solid-2do", fill: "#E59DAA", "clip-path": "url(#left-half-2do)" }),
                    use({ href: "#gear-solid-2do", fill: "#CD8695", "clip-path": "url(#right-half-2do)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog2le: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-2le" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "arrow-tooth-2le" }, [
                        polygon({ points: "108,36 112,22 92,22 128,2 164,22 144,22 148,36" }),
                    ]),
                    g({ id: "teeth-2le" }, [
                        use({ href: "#tooth-2le" }),
                        use({ href: "#tooth-2le", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-2le", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-2le", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-2le", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-2le", transform: "rotate(225 128 128)" }),
                        use({ href: "#arrow-tooth-2le", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-2le", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-2le" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-2le" }),
                    ]),
                    mask({ id: "hole-mask-2le" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-2le" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-2le" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-2le" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-2le)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#C57482", "clip-path": "url(#left-half-2le)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#A35A68", "clip-path": "url(#right-half-2le)" }),
                ]),
                g({ mask: "url(#face-mask-2le)" }, [
                    use({ href: "#gear-solid-2le", fill: "#E59DAA", "clip-path": "url(#left-half-2le)" }),
                    use({ href: "#gear-solid-2le", fill: "#CD8695", "clip-path": "url(#right-half-2le)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog2ri: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-2ri" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "arrow-tooth-2ri" }, [
                        polygon({ points: "108,36 112,22 92,22 128,2 164,22 144,22 148,36" }),
                    ]),
                    g({ id: "teeth-2ri" }, [
                        use({ href: "#tooth-2ri" }),
                        use({ href: "#tooth-2ri", transform: "rotate(45 128 128)" }),
                        use({ href: "#arrow-tooth-2ri", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-2ri", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-2ri", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-2ri", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-2ri", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-2ri", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-2ri" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-2ri" }),
                    ]),
                    mask({ id: "hole-mask-2ri" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-2ri" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-2ri" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-2ri" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-2ri)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#C57482", "clip-path": "url(#left-half-2ri)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#A35A68", "clip-path": "url(#right-half-2ri)" }),
                ]),
                g({ mask: "url(#face-mask-2ri)" }, [
                    use({ href: "#gear-solid-2ri", fill: "#E59DAA", "clip-path": "url(#left-half-2ri)" }),
                    use({ href: "#gear-solid-2ri", fill: "#CD8695", "clip-path": "url(#right-half-2ri)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog3up: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-3up" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "arrow-tooth-3up" }, [
                        polygon({ points: "108,36 112,22 92,22 128,2 164,22 144,22 148,36" }),
                    ]),
                    g({ id: "teeth-3up" }, [
                        use({ href: "#arrow-tooth-3up" }),
                        use({ href: "#tooth-3up", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-3up", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-3up", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-3up", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-3up", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-3up", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-3up", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-3up" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-3up" }),
                    ]),
                    mask({ id: "hole-mask-3up" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-3up" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-3up" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-3up" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-3up)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#8E44AD", "clip-path": "url(#left-half-3up)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#662D91", "clip-path": "url(#right-half-3up)" }),
                ]),
                g({ mask: "url(#face-mask-3up)" }, [
                    use({ href: "#gear-solid-3up", fill: "#CF92F0", "clip-path": "url(#left-half-3up)" }),
                    use({ href: "#gear-solid-3up", fill: "#9B59C6", "clip-path": "url(#right-half-3up)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog3do: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-3do" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "arrow-tooth-3do" }, [
                        polygon({ points: "108,36 112,22 92,22 128,2 164,22 144,22 148,36" }),
                    ]),
                    g({ id: "teeth-3do" }, [
                        use({ href: "#tooth-3do" }),
                        use({ href: "#tooth-3do", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-3do", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-3do", transform: "rotate(135 128 128)" }),
                        use({ href: "#arrow-tooth-3do", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-3do", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-3do", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-3do", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-3do" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-3do" }),
                    ]),
                    mask({ id: "hole-mask-3do" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-3do" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-3do" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-3do" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-3do)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#8E44AD", "clip-path": "url(#left-half-3do)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#662D91", "clip-path": "url(#right-half-3do)" }),
                ]),
                g({ mask: "url(#face-mask-3do)" }, [
                    use({ href: "#gear-solid-3do", fill: "#CF92F0", "clip-path": "url(#left-half-3do)" }),
                    use({ href: "#gear-solid-3do", fill: "#9B59C6", "clip-path": "url(#right-half-3do)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog3le: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-3le" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "arrow-tooth-3le" }, [
                        polygon({ points: "108,36 112,22 92,22 128,2 164,22 144,22 148,36" }),
                    ]),
                    g({ id: "teeth-3le" }, [
                        use({ href: "#tooth-3le" }),
                        use({ href: "#tooth-3le", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-3le", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-3le", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-3le", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-3le", transform: "rotate(225 128 128)" }),
                        use({ href: "#arrow-tooth-3le", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-3le", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-3le" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-3le" }),
                    ]),
                    mask({ id: "hole-mask-3le" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-3le" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-3le" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-3le" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-3le)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#8E44AD", "clip-path": "url(#left-half-3le)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#662D91", "clip-path": "url(#right-half-3le)" }),
                ]),
                g({ mask: "url(#face-mask-3le)" }, [
                    use({ href: "#gear-solid-3le", fill: "#CF92F0", "clip-path": "url(#left-half-3le)" }),
                    use({ href: "#gear-solid-3le", fill: "#9B59C6", "clip-path": "url(#right-half-3le)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog3ri: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-3ri" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "arrow-tooth-3ri" }, [
                        polygon({ points: "108,36 112,22 92,22 128,2 164,22 144,22 148,36" }),
                    ]),
                    g({ id: "teeth-3ri" }, [
                        use({ href: "#tooth-3ri" }),
                        use({ href: "#tooth-3ri", transform: "rotate(45 128 128)" }),
                        use({ href: "#arrow-tooth-3ri", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-3ri", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-3ri", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-3ri", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-3ri", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-3ri", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-3ri" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-3ri" }),
                    ]),
                    mask({ id: "hole-mask-3ri" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-3ri" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-3ri" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-3ri" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-3ri)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#8E44AD", "clip-path": "url(#left-half-3ri)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#662D91", "clip-path": "url(#right-half-3ri)" }),
                ]),
                g({ mask: "url(#face-mask-3ri)" }, [
                    use({ href: "#gear-solid-3ri", fill: "#CF92F0", "clip-path": "url(#left-half-3ri)" }),
                    use({ href: "#gear-solid-3ri", fill: "#9B59C6", "clip-path": "url(#right-half-3ri)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog2co: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-2co" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "arrow-tooth-2co" }, [
                        polygon({ points: "108,36 112,22 92,22 128,2 164,22 144,22 148,36" }),
                    ]),
                    g({ id: "teeth-2co" }, [
                        use({ href: "#tooth-2co" }),
                        use({ href: "#tooth-2co", transform: "rotate(45 128 128)" }),
                        use({ href: "#arrow-tooth-2co", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-2co", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-2co", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-2co", transform: "rotate(225 128 128)" }),
                        use({ href: "#arrow-tooth-2co", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-2co", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-2co" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-2co" }),
                    ]),
                    mask({ id: "hole-mask-2co" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-2co" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                        rect({ x: "60", y: "112", width: "136", height: "32", fill: "white" }),
                    ]),
                    clipPath({ id: "left-half-2co" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-2co" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-2co)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#C57482", "clip-path": "url(#left-half-2co)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#A35A68", "clip-path": "url(#right-half-2co)" }),
                ]),
                g({ mask: "url(#face-mask-2co)" }, [
                    use({ href: "#gear-solid-2co", fill: "#E59DAA", "clip-path": "url(#left-half-2co)" }),
                    use({ href: "#gear-solid-2co", fill: "#CD8695", "clip-path": "url(#right-half-2co)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog2ro: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-2ro" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "arrow-tooth-2ro" }, [
                        polygon({ points: "108,36 112,22 92,22 128,2 164,22 144,22 148,36" }),
                    ]),
                    g({ id: "teeth-2ro" }, [
                        use({ href: "#arrow-tooth-2ro" }),
                        use({ href: "#tooth-2ro", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-2ro", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-2ro", transform: "rotate(135 128 128)" }),
                        use({ href: "#arrow-tooth-2ro", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-2ro", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-2ro", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-2ro", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-2ro" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-2ro" }),
                    ]),
                    mask({ id: "hole-mask-2ro" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-2ro" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                        rect({ x: "112", y: "60", width: "32", height: "136", fill: "white" }),
                    ]),
                    clipPath({ id: "left-half-2ro" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-2ro" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-2ro)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#C57482", "clip-path": "url(#left-half-2ro)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#A35A68", "clip-path": "url(#right-half-2ro)" }),
                ]),
                g({ mask: "url(#face-mask-2ro)" }, [
                    use({ href: "#gear-solid-2ro", fill: "#E59DAA", "clip-path": "url(#left-half-2ro)" }),
                    use({ href: "#gear-solid-2ro", fill: "#CD8695", "clip-path": "url(#right-half-2ro)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog3co: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-3co" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "arrow-tooth-3co" }, [
                        polygon({ points: "108,36 112,22 92,22 128,2 164,22 144,22 148,36" }),
                    ]),
                    g({ id: "teeth-3co" }, [
                        use({ href: "#tooth-3co" }),
                        use({ href: "#tooth-3co", transform: "rotate(45 128 128)" }),
                        use({ href: "#arrow-tooth-3co", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-3co", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-3co", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-3co", transform: "rotate(225 128 128)" }),
                        use({ href: "#arrow-tooth-3co", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-3co", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-3co" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-3co" }),
                    ]),
                    mask({ id: "hole-mask-3co" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-3co" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                        rect({ x: "60", y: "112", width: "136", height: "32", fill: "white" }),
                    ]),
                    clipPath({ id: "left-half-3co" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-3co" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-3co)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#8E44AD", "clip-path": "url(#left-half-3co)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#662D91", "clip-path": "url(#right-half-3co)" }),
                ]),
                g({ mask: "url(#face-mask-3co)" }, [
                    use({ href: "#gear-solid-3co", fill: "#CF92F0", "clip-path": "url(#left-half-3co)" }),
                    use({ href: "#gear-solid-3co", fill: "#9B59C6", "clip-path": "url(#right-half-3co)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog3ro: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-3ro" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "arrow-tooth-3ro" }, [
                        polygon({ points: "108,36 112,22 92,22 128,2 164,22 144,22 148,36" }),
                    ]),
                    g({ id: "teeth-3ro" }, [
                        use({ href: "#arrow-tooth-3ro" }),
                        use({ href: "#tooth-3ro", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-3ro", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-3ro", transform: "rotate(135 128 128)" }),
                        use({ href: "#arrow-tooth-3ro", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-3ro", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-3ro", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-3ro", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-3ro" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-3ro" }),
                    ]),
                    mask({ id: "hole-mask-3ro" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-3ro" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                        rect({ x: "112", y: "60", width: "32", height: "136", fill: "white" }),
                    ]),
                    clipPath({ id: "left-half-3ro" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-3ro" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-3ro)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#8E44AD", "clip-path": "url(#left-half-3ro)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#662D91", "clip-path": "url(#right-half-3ro)" }),
                ]),
                g({ mask: "url(#face-mask-3ro)" }, [
                    use({ href: "#gear-solid-3ro", fill: "#CF92F0", "clip-path": "url(#left-half-3ro)" }),
                    use({ href: "#gear-solid-3ro", fill: "#9B59C6", "clip-path": "url(#right-half-3ro)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    Cog3cr: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-3cr" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "arrow-tooth-3cr" }, [
                        polygon({ points: "108,36 112,22 92,22 128,2 164,22 144,22 148,36" }),
                    ]),
                    g({ id: "teeth-3cr" }, [
                        use({ href: "#tooth-3cr" }),
                        use({ href: "#arrow-tooth-3cr", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-3cr", transform: "rotate(90 128 128)" }),
                        use({ href: "#arrow-tooth-3cr", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-3cr", transform: "rotate(180 128 128)" }),
                        use({ href: "#arrow-tooth-3cr", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-3cr", transform: "rotate(270 128 128)" }),
                        use({ href: "#arrow-tooth-3cr", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-3cr" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-3cr" }),
                    ]),
                    mask({ id: "hole-mask-3cr" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    mask({ id: "face-mask-3cr" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "61", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-3cr" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-3cr" }, [rect({ x: "128", y: "0", width: "256", height: "256" })]),
                ]),
                g({ mask: "url(#hole-mask-3cr)" }, [
                    circle({ cx: "128", cy: "128", r: "61", fill: "#8E44AD", "clip-path": "url(#left-half-3cr)" }),
                    circle({ cx: "128", cy: "128", r: "61", fill: "#662D91", "clip-path": "url(#right-half-3cr)" }),
                ]),
                g({ mask: "url(#face-mask-3cr)" }, [
                    use({ href: "#gear-solid-3cr", fill: "#CF92F0", "clip-path": "url(#left-half-3cr)" }),
                    use({ href: "#gear-solid-3cr", fill: "#9B59C6", "clip-path": "url(#right-half-3cr)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSm_0: (props) =>
        SvgBase(
            [
                defs([
                    mask({ id: "ring-mask-sm0" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "70", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-sm0" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-sm0" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-sm0)" }, [
                    circle({ cx: "128", cy: "128", r: "96", fill: "#E67E22", "clip-path": "url(#left-half-sm0)" }),
                    circle({ cx: "128", cy: "128", r: "96", fill: "#D35400", "clip-path": "url(#right-half-sm0)" }),
                ]),
                circle({ cx: "128", cy: "128", r: "70", stroke: "#F39C12", "stroke-width": "4", fill: "none" }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSm_1: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "ring-with-ears-sm1" }, [
                        circle({ cx: "128", cy: "128", r: "90" }),
                        circle({ cx: "70", cy: "70", r: "28" }),
                        circle({ cx: "186", cy: "70", r: "28" }),
                    ]),
                    mask({ id: "ring-mask-sm1" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "64", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-sm1" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-sm1" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-sm1)" }, [
                    use({ href: "#ring-with-ears-sm1", fill: "#E67E22", "clip-path": "url(#left-half-sm1)" }),
                    use({ href: "#ring-with-ears-sm1", fill: "#D35400", "clip-path": "url(#right-half-sm1)" }),
                ]),
                circle({
                    cx: "128",
                    cy: "128",
                    r: "64",
                    stroke: "#F39C12",
                    "stroke-width": "3",
                    fill: "none",
                    opacity: "0.6",
                }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSm_2: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "ring-with-ears-sm2" }, [
                        circle({ cx: "128", cy: "128", r: "90" }),
                        circle({ cx: "70", cy: "70", r: "28" }),
                        circle({ cx: "186", cy: "70", r: "28" }),
                        circle({ cx: "70", cy: "186", r: "28" }),
                        circle({ cx: "186", cy: "186", r: "28" }),
                    ]),
                    mask({ id: "ring-mask-sm2" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "64", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-sm2" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-sm2" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-sm2)" }, [
                    use({ href: "#ring-with-ears-sm2", fill: "#E67E22", "clip-path": "url(#left-half-sm2)" }),
                    use({ href: "#ring-with-ears-sm2", fill: "#D35400", "clip-path": "url(#right-half-sm2)" }),
                ]),
                circle({
                    cx: "128",
                    cy: "128",
                    r: "64",
                    stroke: "#F39C12",
                    "stroke-width": "3",
                    fill: "none",
                    opacity: "0.6",
                }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSm_3: (props) =>
        SvgBase(
            [
                defs([
                    circle({ id: "inner-ear-l-sm3", cx: "63", cy: "128", r: "20" }),
                    circle({ id: "inner-ear-r-sm3", cx: "193", cy: "128", r: "20" }),
                    g({ id: "ring-with-ears-sm3" }, [
                        circle({ cx: "128", cy: "128", r: "90" }),
                        circle({ cx: "70", cy: "70", r: "28" }),
                        circle({ cx: "186", cy: "70", r: "28" }),
                        circle({ cx: "70", cy: "186", r: "28" }),
                        circle({ cx: "186", cy: "186", r: "28" }),
                        use({ href: "#inner-ear-l-sm3" }),
                        use({ href: "#inner-ear-r-sm3" }),
                    ]),
                    mask({ id: "ring-mask-sm3" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "64", fill: "black" }),
                        use({ href: "#inner-ear-l-sm3", fill: "white" }),
                        use({ href: "#inner-ear-r-sm3", fill: "white" }),
                    ]),
                    clipPath({ id: "left-half-sm3" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-sm3" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-sm3)" }, [
                    use({ href: "#ring-with-ears-sm3", fill: "#E67E22", "clip-path": "url(#left-half-sm3)" }),
                    use({ href: "#ring-with-ears-sm3", fill: "#D35400", "clip-path": "url(#right-half-sm3)" }),
                ]),
                circle({
                    cx: "128",
                    cy: "128",
                    r: "64",
                    stroke: "#F39C12",
                    "stroke-width": "2",
                    fill: "none",
                    opacity: "0.4",
                    mask: "url(#ring-mask-sm3)",
                }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSm_4: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "bridge-segments-sm4" }, [
                        rect({ x: "60", y: "110", width: "55", height: "36", rx: "10" }),
                        rect({ x: "141", y: "110", width: "55", height: "36", rx: "10" }),
                    ]),
                    g({ id: "ring-with-ears-sm4" }, [
                        circle({ cx: "128", cy: "128", r: "90" }),
                        circle({ cx: "70", cy: "70", r: "28" }),
                        circle({ cx: "186", cy: "70", r: "28" }),
                        circle({ cx: "70", cy: "186", r: "28" }),
                        circle({ cx: "186", cy: "186", r: "28" }),
                        use({ href: "#bridge-segments-sm4" }),
                    ]),
                    mask({ id: "ring-mask-sm4" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "64", fill: "black" }),
                        use({ href: "#bridge-segments-sm4", fill: "white" }),
                    ]),
                    clipPath({ id: "left-half-sm4" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-sm4" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-sm4)" }, [
                    use({ href: "#ring-with-ears-sm4", fill: "#E67E22", "clip-path": "url(#left-half-sm4)" }),
                    use({ href: "#ring-with-ears-sm4", fill: "#D35400", "clip-path": "url(#right-half-sm4)" }),
                ]),
                circle({
                    cx: "128",
                    cy: "128",
                    r: "64",
                    stroke: "#F39C12",
                    "stroke-width": "2",
                    fill: "none",
                    opacity: "0.4",
                    mask: "url(#ring-mask-sm4)",
                }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSm_5: (props) =>
        SvgBase(
            [
                defs([
                    rect({ id: "full-bridge-sm5", x: "60", y: "110", width: "136", height: "36", rx: "10" }),
                    g({ id: "ring-with-ears-sm5" }, [
                        circle({ cx: "128", cy: "128", r: "90" }),
                        circle({ cx: "70", cy: "70", r: "28" }),
                        circle({ cx: "186", cy: "70", r: "28" }),
                        circle({ cx: "70", cy: "186", r: "28" }),
                        circle({ cx: "186", cy: "186", r: "28" }),
                        use({ href: "#full-bridge-sm5" }),
                    ]),
                    mask({ id: "ring-mask-sm5" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "64", fill: "black" }),
                        use({ href: "#full-bridge-sm5", fill: "white" }),
                    ]),
                    clipPath({ id: "left-half-sm5" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-sm5" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-sm5)" }, [
                    use({ href: "#ring-with-ears-sm5", fill: "#E67E22", "clip-path": "url(#left-half-sm5)" }),
                    use({ href: "#ring-with-ears-sm5", fill: "#D35400", "clip-path": "url(#right-half-sm5)" }),
                ]),
                circle({
                    cx: "128",
                    cy: "128",
                    r: "64",
                    stroke: "#F39C12",
                    "stroke-width": "2",
                    fill: "none",
                    opacity: "0.4",
                    mask: "url(#ring-mask-sm5)",
                }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSm_6: (props) =>
        SvgBase(
            [
                defs([
                    rect({ id: "bridge-h-sm6", x: "60", y: "110", width: "136", height: "36", rx: "10" }),
                    rect({ id: "bridge-v-sm6", x: "110", y: "60", width: "36", height: "136", rx: "10" }),
                    g({ id: "ring-with-ears-sm6" }, [
                        circle({ cx: "128", cy: "128", r: "90" }),
                        circle({ cx: "70", cy: "70", r: "28" }),
                        circle({ cx: "186", cy: "70", r: "28" }),
                        circle({ cx: "70", cy: "186", r: "28" }),
                        circle({ cx: "186", cy: "186", r: "28" }),
                        use({ href: "#bridge-h-sm6" }),
                        use({ href: "#bridge-v-sm6" }),
                    ]),
                    mask({ id: "ring-mask-sm6" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "64", fill: "black" }),
                        use({ href: "#bridge-h-sm6", fill: "white" }),
                        use({ href: "#bridge-v-sm6", fill: "white" }),
                    ]),
                    clipPath({ id: "left-half-sm6" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-sm6" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-sm6)" }, [
                    use({ href: "#ring-with-ears-sm6", fill: "#E67E22", "clip-path": "url(#left-half-sm6)" }),
                    use({ href: "#ring-with-ears-sm6", fill: "#D35400", "clip-path": "url(#right-half-sm6)" }),
                ]),
                circle({
                    cx: "128",
                    cy: "128",
                    r: "64",
                    stroke: "#F39C12",
                    "stroke-width": "2",
                    fill: "none",
                    opacity: "0.4",
                    mask: "url(#ring-mask-sm6)",
                }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSm_7: (props) =>
        SvgBase(
            [
                defs([
                    rect({ id: "bridge-bar-sm7", x: "60", y: "110", width: "136", height: "36", rx: "10" }),
                    g({ id: "all-bridges-sm7" }, [
                        use({ href: "#bridge-bar-sm7" }),
                        use({ href: "#bridge-bar-sm7", transform: "rotate(90 128 128)" }),
                        use({ href: "#bridge-bar-sm7", transform: "rotate(135 128 128)" }),
                    ]),
                    g({ id: "ring-with-ears-sm7" }, [
                        circle({ cx: "128", cy: "128", r: "90" }),
                        circle({ cx: "70", cy: "70", r: "28" }),
                        circle({ cx: "186", cy: "70", r: "28" }),
                        circle({ cx: "70", cy: "186", r: "28" }),
                        circle({ cx: "186", cy: "186", r: "28" }),
                        use({ href: "#all-bridges-sm7" }),
                    ]),
                    mask({ id: "ring-mask-sm7" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "64", fill: "black" }),
                        use({ href: "#all-bridges-sm7", fill: "white" }),
                    ]),
                    clipPath({ id: "left-half-sm7" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-sm7" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-sm7)" }, [
                    use({ href: "#ring-with-ears-sm7", fill: "#E67E22", "clip-path": "url(#left-half-sm7)" }),
                    use({ href: "#ring-with-ears-sm7", fill: "#D35400", "clip-path": "url(#right-half-sm7)" }),
                ]),
                circle({
                    cx: "128",
                    cy: "128",
                    r: "64",
                    stroke: "#F39C12",
                    "stroke-width": "2",
                    fill: "none",
                    opacity: "0.4",
                    mask: "url(#ring-mask-sm7)",
                }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSm_8: (props) =>
        SvgBase(
            [
                defs([
                    rect({ id: "bridge-bar-sm8", x: "60", y: "110", width: "136", height: "36", rx: "10" }),
                    g({ id: "all-bridges-sm8" }, [
                        use({ href: "#bridge-bar-sm8" }),
                        use({ href: "#bridge-bar-sm8", transform: "rotate(90 128 128)" }),
                        use({ href: "#bridge-bar-sm8", transform: "rotate(45 128 128)" }),
                        use({ href: "#bridge-bar-sm8", transform: "rotate(135 128 128)" }),
                    ]),
                    g({ id: "ring-with-ears-sm8" }, [
                        circle({ cx: "128", cy: "128", r: "90" }),
                        circle({ cx: "70", cy: "70", r: "28" }),
                        circle({ cx: "186", cy: "70", r: "28" }),
                        circle({ cx: "70", cy: "186", r: "28" }),
                        circle({ cx: "186", cy: "186", r: "28" }),
                        use({ href: "#all-bridges-sm8" }),
                    ]),
                    mask({ id: "ring-mask-sm8" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "64", fill: "black" }),
                        use({ href: "#all-bridges-sm8", fill: "white" }),
                    ]),
                    clipPath({ id: "left-half-sm8" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-sm8" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-sm8)" }, [
                    use({ href: "#ring-with-ears-sm8", fill: "#E67E22", "clip-path": "url(#left-half-sm8)" }),
                    use({ href: "#ring-with-ears-sm8", fill: "#D35400", "clip-path": "url(#right-half-sm8)" }),
                ]),
                circle({
                    cx: "128",
                    cy: "128",
                    r: "64",
                    stroke: "#F39C12",
                    "stroke-width": "2",
                    fill: "none",
                    opacity: "0.4",
                    mask: "url(#ring-mask-sm8)",
                }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSm_9: (props) =>
        SvgBase(
            [
                defs([
                    rect({ id: "bridge-bar-sm9", x: "60", y: "110", width: "136", height: "36", rx: "10" }),
                    g({ id: "all-bridges-sm9" }, [
                        use({ href: "#bridge-bar-sm9" }),
                        use({ href: "#bridge-bar-sm9", transform: "rotate(90 128 128)" }),
                        use({ href: "#bridge-bar-sm9", transform: "rotate(45 128 128)" }),
                        use({ href: "#bridge-bar-sm9", transform: "rotate(135 128 128)" }),
                    ]),
                    rect({
                        id: "diamond-cutout-small-sm9",
                        x: "108",
                        y: "108",
                        width: "40",
                        height: "40",
                        transform: "rotate(45 128 128)",
                    }),
                    g({ id: "ring-with-ears-sm9" }, [
                        circle({ cx: "128", cy: "128", r: "90" }),
                        circle({ cx: "70", cy: "70", r: "28" }),
                        circle({ cx: "186", cy: "70", r: "28" }),
                        circle({ cx: "70", cy: "186", r: "28" }),
                        circle({ cx: "186", cy: "186", r: "28" }),
                        use({ href: "#all-bridges-sm9" }),
                    ]),
                    mask({ id: "ring-mask-sm9" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "64", fill: "black" }),
                        use({ href: "#all-bridges-sm9", fill: "white" }),
                        use({ href: "#diamond-cutout-small-sm9", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-sm9" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-sm9" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-sm9)" }, [
                    use({ href: "#ring-with-ears-sm9", fill: "#E67E22", "clip-path": "url(#left-half-sm9)" }),
                    use({ href: "#ring-with-ears-sm9", fill: "#D35400", "clip-path": "url(#right-half-sm9)" }),
                ]),
                circle({
                    cx: "128",
                    cy: "128",
                    r: "64",
                    stroke: "#F39C12",
                    "stroke-width": "2",
                    fill: "none",
                    opacity: "0.4",
                    mask: "url(#ring-mask-sm9)",
                }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSma0: (props) =>
        SvgBase(
            [
                defs([
                    mask({ id: "ring-mask-sma0" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "70", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-sma0" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-sma0" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-sma0)" }, [
                    circle({ cx: "128", cy: "128", r: "96", fill: "#BBBBBB", "clip-path": "url(#left-half-sma0)" }),
                    circle({ cx: "128", cy: "128", r: "96", fill: "#898989", "clip-path": "url(#right-half-sma0)" }),
                ]),
                circle({ cx: "128", cy: "128", r: "70", stroke: "#D3D3D3", "stroke-width": "4", fill: "none" }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSma1: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "ring-with-ears-sma1" }, [
                        circle({ cx: "128", cy: "128", r: "90" }),
                        circle({ cx: "70", cy: "70", r: "28" }),
                        circle({ cx: "186", cy: "70", r: "28" }),
                    ]),
                    mask({ id: "ring-mask-sma1" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "64", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-sma1" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-sma1" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-sma1)" }, [
                    use({ href: "#ring-with-ears-sma1", fill: "#BBBBBB", "clip-path": "url(#left-half-sma1)" }),
                    use({ href: "#ring-with-ears-sma1", fill: "#898989", "clip-path": "url(#right-half-sma1)" }),
                ]),
                circle({
                    cx: "128",
                    cy: "128",
                    r: "64",
                    stroke: "#D3D3D3",
                    "stroke-width": "3",
                    fill: "none",
                    opacity: "0.6",
                }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSma2: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "ring-with-ears-sma2" }, [
                        circle({ cx: "128", cy: "128", r: "90" }),
                        circle({ cx: "70", cy: "70", r: "28" }),
                        circle({ cx: "186", cy: "70", r: "28" }),
                        circle({ cx: "70", cy: "186", r: "28" }),
                        circle({ cx: "186", cy: "186", r: "28" }),
                    ]),
                    mask({ id: "ring-mask-sma2" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "64", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-sma2" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-sma2" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-sma2)" }, [
                    use({ href: "#ring-with-ears-sma2", fill: "#BBBBBB", "clip-path": "url(#left-half-sma2)" }),
                    use({ href: "#ring-with-ears-sma2", fill: "#898989", "clip-path": "url(#right-half-sma2)" }),
                ]),
                circle({
                    cx: "128",
                    cy: "128",
                    r: "64",
                    stroke: "#D3D3D3",
                    "stroke-width": "3",
                    fill: "none",
                    opacity: "0.6",
                }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSma3: (props) =>
        SvgBase(
            [
                defs([
                    circle({ id: "inner-ear-l-sma3", cx: "63", cy: "128", r: "20" }),
                    circle({ id: "inner-ear-r-sma3", cx: "193", cy: "128", r: "20" }),
                    g({ id: "ring-with-ears-sma3" }, [
                        circle({ cx: "128", cy: "128", r: "90" }),
                        circle({ cx: "70", cy: "70", r: "28" }),
                        circle({ cx: "186", cy: "70", r: "28" }),
                        circle({ cx: "70", cy: "186", r: "28" }),
                        circle({ cx: "186", cy: "186", r: "28" }),
                        use({ href: "#inner-ear-l-sma3" }),
                        use({ href: "#inner-ear-r-sma3" }),
                    ]),
                    mask({ id: "ring-mask-sma3" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "64", fill: "black" }),
                        use({ href: "#inner-ear-l-sma3", fill: "white" }),
                        use({ href: "#inner-ear-r-sma3", fill: "white" }),
                    ]),
                    clipPath({ id: "left-half-sma3" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-sma3" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-sma3)" }, [
                    use({ href: "#ring-with-ears-sma3", fill: "#BBBBBB", "clip-path": "url(#left-half-sma3)" }),
                    use({ href: "#ring-with-ears-sma3", fill: "#898989", "clip-path": "url(#right-half-sma3)" }),
                ]),
                circle({
                    cx: "128",
                    cy: "128",
                    r: "64",
                    stroke: "#D3D3D3",
                    "stroke-width": "2",
                    fill: "none",
                    opacity: "0.4",
                    mask: "url(#ring-mask-sma3)",
                }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSma4: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "bridge-segments-sma4" }, [
                        rect({ x: "60", y: "110", width: "55", height: "36", rx: "10" }),
                        rect({ x: "141", y: "110", width: "55", height: "36", rx: "10" }),
                    ]),
                    g({ id: "ring-with-ears-sma4" }, [
                        circle({ cx: "128", cy: "128", r: "90" }),
                        circle({ cx: "70", cy: "70", r: "28" }),
                        circle({ cx: "186", cy: "70", r: "28" }),
                        circle({ cx: "70", cy: "186", r: "28" }),
                        circle({ cx: "186", cy: "186", r: "28" }),
                        use({ href: "#bridge-segments-sma4" }),
                    ]),
                    mask({ id: "ring-mask-sma4" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "64", fill: "black" }),
                        use({ href: "#bridge-segments-sma4", fill: "white" }),
                    ]),
                    clipPath({ id: "left-half-sma4" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-sma4" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-sma4)" }, [
                    use({ href: "#ring-with-ears-sma4", fill: "#BBBBBB", "clip-path": "url(#left-half-sma4)" }),
                    use({ href: "#ring-with-ears-sma4", fill: "#898989", "clip-path": "url(#right-half-sma4)" }),
                ]),
                circle({
                    cx: "128",
                    cy: "128",
                    r: "64",
                    stroke: "#D3D3D3",
                    "stroke-width": "2",
                    fill: "none",
                    opacity: "0.4",
                    mask: "url(#ring-mask-sma4)",
                }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSma5: (props) =>
        SvgBase(
            [
                defs([
                    rect({ id: "full-bridge-sma5", x: "60", y: "110", width: "136", height: "36", rx: "10" }),
                    g({ id: "ring-with-ears-sma5" }, [
                        circle({ cx: "128", cy: "128", r: "90" }),
                        circle({ cx: "70", cy: "70", r: "28" }),
                        circle({ cx: "186", cy: "70", r: "28" }),
                        circle({ cx: "70", cy: "186", r: "28" }),
                        circle({ cx: "186", cy: "186", r: "28" }),
                        use({ href: "#full-bridge-sma5" }),
                    ]),
                    mask({ id: "ring-mask-sma5" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "64", fill: "black" }),
                        use({ href: "#full-bridge-sma5", fill: "white" }),
                    ]),
                    clipPath({ id: "left-half-sma5" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-sma5" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-sma5)" }, [
                    use({ href: "#ring-with-ears-sma5", fill: "#BBBBBB", "clip-path": "url(#left-half-sma5)" }),
                    use({ href: "#ring-with-ears-sma5", fill: "#898989", "clip-path": "url(#right-half-sma5)" }),
                ]),
                circle({
                    cx: "128",
                    cy: "128",
                    r: "64",
                    stroke: "#D3D3D3",
                    "stroke-width": "2",
                    fill: "none",
                    opacity: "0.4",
                    mask: "url(#ring-mask-sma5)",
                }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSma6: (props) =>
        SvgBase(
            [
                defs([
                    rect({ id: "bridge-h-sma6", x: "60", y: "110", width: "136", height: "36", rx: "10" }),
                    rect({ id: "bridge-v-sma6", x: "110", y: "60", width: "36", height: "136", rx: "10" }),
                    g({ id: "ring-with-ears-sma6" }, [
                        circle({ cx: "128", cy: "128", r: "90" }),
                        circle({ cx: "70", cy: "70", r: "28" }),
                        circle({ cx: "186", cy: "70", r: "28" }),
                        circle({ cx: "70", cy: "186", r: "28" }),
                        circle({ cx: "186", cy: "186", r: "28" }),
                        use({ href: "#bridge-h-sma6" }),
                        use({ href: "#bridge-v-sma6" }),
                    ]),
                    mask({ id: "ring-mask-sma6" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "64", fill: "black" }),
                        use({ href: "#bridge-h-sma6", fill: "white" }),
                        use({ href: "#bridge-v-sma6", fill: "white" }),
                    ]),
                    clipPath({ id: "left-half-sma6" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-sma6" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-sma6)" }, [
                    use({ href: "#ring-with-ears-sma6", fill: "#BBBBBB", "clip-path": "url(#left-half-sma6)" }),
                    use({ href: "#ring-with-ears-sma6", fill: "#898989", "clip-path": "url(#right-half-sma6)" }),
                ]),
                circle({
                    cx: "128",
                    cy: "128",
                    r: "64",
                    stroke: "#D3D3D3",
                    "stroke-width": "2",
                    fill: "none",
                    opacity: "0.4",
                    mask: "url(#ring-mask-sma6)",
                }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSma7: (props) =>
        SvgBase(
            [
                defs([
                    rect({ id: "bridge-bar-sma7", x: "60", y: "110", width: "136", height: "36", rx: "10" }),
                    g({ id: "all-bridges-sma7" }, [
                        use({ href: "#bridge-bar-sma7" }),
                        use({ href: "#bridge-bar-sma7", transform: "rotate(90 128 128)" }),
                        use({ href: "#bridge-bar-sma7", transform: "rotate(135 128 128)" }),
                    ]),
                    g({ id: "ring-with-ears-sma7" }, [
                        circle({ cx: "128", cy: "128", r: "90" }),
                        circle({ cx: "70", cy: "70", r: "28" }),
                        circle({ cx: "186", cy: "70", r: "28" }),
                        circle({ cx: "70", cy: "186", r: "28" }),
                        circle({ cx: "186", cy: "186", r: "28" }),
                        use({ href: "#all-bridges-sma7" }),
                    ]),
                    mask({ id: "ring-mask-sma7" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "64", fill: "black" }),
                        use({ href: "#all-bridges-sma7", fill: "white" }),
                    ]),
                    clipPath({ id: "left-half-sma7" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-sma7" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-sma7)" }, [
                    use({ href: "#ring-with-ears-sma7", fill: "#BBBBBB", "clip-path": "url(#left-half-sma7)" }),
                    use({ href: "#ring-with-ears-sma7", fill: "#898989", "clip-path": "url(#right-half-sma7)" }),
                ]),
                circle({
                    cx: "128",
                    cy: "128",
                    r: "64",
                    stroke: "#D3D3D3",
                    "stroke-width": "2",
                    fill: "none",
                    opacity: "0.4",
                    mask: "url(#ring-mask-sma7)",
                }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSma8: (props) =>
        SvgBase(
            [
                defs([
                    rect({ id: "bridge-bar-sma8", x: "60", y: "110", width: "136", height: "36", rx: "10" }),
                    g({ id: "all-bridges-sma8" }, [
                        use({ href: "#bridge-bar-sma8" }),
                        use({ href: "#bridge-bar-sma8", transform: "rotate(90 128 128)" }),
                        use({ href: "#bridge-bar-sma8", transform: "rotate(45 128 128)" }),
                        use({ href: "#bridge-bar-sma8", transform: "rotate(135 128 128)" }),
                    ]),
                    g({ id: "ring-with-ears-sma8" }, [
                        circle({ cx: "128", cy: "128", r: "90" }),
                        circle({ cx: "70", cy: "70", r: "28" }),
                        circle({ cx: "186", cy: "70", r: "28" }),
                        circle({ cx: "70", cy: "186", r: "28" }),
                        circle({ cx: "186", cy: "186", r: "28" }),
                        use({ href: "#all-bridges-sma8" }),
                    ]),
                    mask({ id: "ring-mask-sma8" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "64", fill: "black" }),
                        use({ href: "#all-bridges-sma8", fill: "white" }),
                    ]),
                    clipPath({ id: "left-half-sma8" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-sma8" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-sma8)" }, [
                    use({ href: "#ring-with-ears-sma8", fill: "#BBBBBB", "clip-path": "url(#left-half-sma8)" }),
                    use({ href: "#ring-with-ears-sma8", fill: "#898989", "clip-path": "url(#right-half-sma8)" }),
                ]),
                circle({
                    cx: "128",
                    cy: "128",
                    r: "64",
                    stroke: "#D3D3D3",
                    "stroke-width": "2",
                    fill: "none",
                    opacity: "0.4",
                    mask: "url(#ring-mask-sma8)",
                }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSma9: (props) =>
        SvgBase(
            [
                defs([
                    rect({ id: "bridge-bar-sma9", x: "60", y: "110", width: "136", height: "36", rx: "10" }),
                    g({ id: "all-bridges-sma9" }, [
                        use({ href: "#bridge-bar-sma9" }),
                        use({ href: "#bridge-bar-sma9", transform: "rotate(90 128 128)" }),
                        use({ href: "#bridge-bar-sma9", transform: "rotate(45 128 128)" }),
                        use({ href: "#bridge-bar-sma9", transform: "rotate(135 128 128)" }),
                    ]),
                    rect({
                        id: "diamond-cutout-small-sma9",
                        x: "108",
                        y: "108",
                        width: "40",
                        height: "40",
                        transform: "rotate(45 128 128)",
                    }),
                    g({ id: "ring-with-ears-sma9" }, [
                        circle({ cx: "128", cy: "128", r: "90" }),
                        circle({ cx: "70", cy: "70", r: "28" }),
                        circle({ cx: "186", cy: "70", r: "28" }),
                        circle({ cx: "70", cy: "186", r: "28" }),
                        circle({ cx: "186", cy: "186", r: "28" }),
                        use({ href: "#all-bridges-sma9" }),
                    ]),
                    mask({ id: "ring-mask-sma9" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "64", fill: "black" }),
                        use({ href: "#all-bridges-sma9", fill: "white" }),
                        use({ href: "#diamond-cutout-small-sma9", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-sma9" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-sma9" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-sma9)" }, [
                    use({ href: "#ring-with-ears-sma9", fill: "#BBBBBB", "clip-path": "url(#left-half-sma9)" }),
                    use({ href: "#ring-with-ears-sma9", fill: "#898989", "clip-path": "url(#right-half-sma9)" }),
                ]),
                circle({
                    cx: "128",
                    cy: "128",
                    r: "64",
                    stroke: "#D3D3D3",
                    "stroke-width": "2",
                    fill: "none",
                    opacity: "0.4",
                    mask: "url(#ring-mask-sma9)",
                }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSmb0: (props) =>
        SvgBase(
            [
                defs([
                    mask({ id: "ring-mask-smb0" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "70", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-smb0" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-smb0" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-smb0)" }, [
                    circle({ cx: "128", cy: "128", r: "96", fill: "#FFE082", "clip-path": "url(#left-half-smb0)" }),
                    circle({ cx: "128", cy: "128", r: "96", fill: "#FFD54F", "clip-path": "url(#right-half-smb0)" }),
                ]),
                circle({ cx: "128", cy: "128", r: "70", stroke: "#FFECB3", "stroke-width": "4", fill: "none" }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSmb1: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "ring-with-ears-smb1" }, [
                        circle({ cx: "128", cy: "128", r: "90" }),
                        circle({ cx: "70", cy: "70", r: "28" }),
                        circle({ cx: "186", cy: "70", r: "28" }),
                    ]),
                    mask({ id: "ring-mask-smb1" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "64", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-smb1" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-smb1" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-smb1)" }, [
                    use({ href: "#ring-with-ears-smb1", fill: "#FFE082", "clip-path": "url(#left-half-smb1)" }),
                    use({ href: "#ring-with-ears-smb1", fill: "#FFD54F", "clip-path": "url(#right-half-smb1)" }),
                ]),
                circle({
                    cx: "128",
                    cy: "128",
                    r: "64",
                    stroke: "#FFECB3",
                    "stroke-width": "3",
                    fill: "none",
                    opacity: "0.6",
                }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSmb2: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "ring-with-ears-smb2" }, [
                        circle({ cx: "128", cy: "128", r: "90" }),
                        circle({ cx: "70", cy: "70", r: "28" }),
                        circle({ cx: "186", cy: "70", r: "28" }),
                        circle({ cx: "70", cy: "186", r: "28" }),
                        circle({ cx: "186", cy: "186", r: "28" }),
                    ]),
                    mask({ id: "ring-mask-smb2" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "64", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-smb2" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-smb2" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-smb2)" }, [
                    use({ href: "#ring-with-ears-smb2", fill: "#FFE082", "clip-path": "url(#left-half-smb2)" }),
                    use({ href: "#ring-with-ears-smb2", fill: "#FFD54F", "clip-path": "url(#right-half-smb2)" }),
                ]),
                circle({
                    cx: "128",
                    cy: "128",
                    r: "64",
                    stroke: "#FFECB3",
                    "stroke-width": "3",
                    fill: "none",
                    opacity: "0.6",
                }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSmb3: (props) =>
        SvgBase(
            [
                defs([
                    circle({ id: "inner-ear-l-smb3", cx: "63", cy: "128", r: "20" }),
                    circle({ id: "inner-ear-r-smb3", cx: "193", cy: "128", r: "20" }),
                    g({ id: "ring-with-ears-smb3" }, [
                        circle({ cx: "128", cy: "128", r: "90" }),
                        circle({ cx: "70", cy: "70", r: "28" }),
                        circle({ cx: "186", cy: "70", r: "28" }),
                        circle({ cx: "70", cy: "186", r: "28" }),
                        circle({ cx: "186", cy: "186", r: "28" }),
                        use({ href: "#inner-ear-l-smb3" }),
                        use({ href: "#inner-ear-r-smb3" }),
                    ]),
                    mask({ id: "ring-mask-smb3" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "64", fill: "black" }),
                        use({ href: "#inner-ear-l-smb3", fill: "white" }),
                        use({ href: "#inner-ear-r-smb3", fill: "white" }),
                    ]),
                    clipPath({ id: "left-half-smb3" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-smb3" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-smb3)" }, [
                    use({ href: "#ring-with-ears-smb3", fill: "#FFE082", "clip-path": "url(#left-half-smb3)" }),
                    use({ href: "#ring-with-ears-smb3", fill: "#FFD54F", "clip-path": "url(#right-half-smb3)" }),
                ]),
                circle({
                    cx: "128",
                    cy: "128",
                    r: "64",
                    stroke: "#FFECB3",
                    "stroke-width": "2",
                    fill: "none",
                    opacity: "0.4",
                    mask: "url(#ring-mask-smb3)",
                }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSmb4: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "bridge-segments-smb4" }, [
                        rect({ x: "60", y: "110", width: "55", height: "36", rx: "10" }),
                        rect({ x: "141", y: "110", width: "55", height: "36", rx: "10" }),
                    ]),
                    g({ id: "ring-with-ears-smb4" }, [
                        circle({ cx: "128", cy: "128", r: "90" }),
                        circle({ cx: "70", cy: "70", r: "28" }),
                        circle({ cx: "186", cy: "70", r: "28" }),
                        circle({ cx: "70", cy: "186", r: "28" }),
                        circle({ cx: "186", cy: "186", r: "28" }),
                        use({ href: "#bridge-segments-smb4" }),
                    ]),
                    mask({ id: "ring-mask-smb4" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "64", fill: "black" }),
                        use({ href: "#bridge-segments-smb4", fill: "white" }),
                    ]),
                    clipPath({ id: "left-half-smb4" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-smb4" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-smb4)" }, [
                    use({ href: "#ring-with-ears-smb4", fill: "#FFE082", "clip-path": "url(#left-half-smb4)" }),
                    use({ href: "#ring-with-ears-smb4", fill: "#FFD54F", "clip-path": "url(#right-half-smb4)" }),
                ]),
                circle({
                    cx: "128",
                    cy: "128",
                    r: "64",
                    stroke: "#FFECB3",
                    "stroke-width": "2",
                    fill: "none",
                    opacity: "0.4",
                    mask: "url(#ring-mask-smb4)",
                }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSmb5: (props) =>
        SvgBase(
            [
                defs([
                    rect({ id: "full-bridge-smb5", x: "60", y: "110", width: "136", height: "36", rx: "10" }),
                    g({ id: "ring-with-ears-smb5" }, [
                        circle({ cx: "128", cy: "128", r: "90" }),
                        circle({ cx: "70", cy: "70", r: "28" }),
                        circle({ cx: "186", cy: "70", r: "28" }),
                        circle({ cx: "70", cy: "186", r: "28" }),
                        circle({ cx: "186", cy: "186", r: "28" }),
                        use({ href: "#full-bridge-smb5" }),
                    ]),
                    mask({ id: "ring-mask-smb5" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "64", fill: "black" }),
                        use({ href: "#full-bridge-smb5", fill: "white" }),
                    ]),
                    clipPath({ id: "left-half-smb5" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-smb5" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-smb5)" }, [
                    use({ href: "#ring-with-ears-smb5", fill: "#FFE082", "clip-path": "url(#left-half-smb5)" }),
                    use({ href: "#ring-with-ears-smb5", fill: "#FFD54F", "clip-path": "url(#right-half-smb5)" }),
                ]),
                circle({
                    cx: "128",
                    cy: "128",
                    r: "64",
                    stroke: "#FFECB3",
                    "stroke-width": "2",
                    fill: "none",
                    opacity: "0.4",
                    mask: "url(#ring-mask-smb5)",
                }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSmb6: (props) =>
        SvgBase(
            [
                defs([
                    rect({ id: "bridge-h-smb6", x: "60", y: "110", width: "136", height: "36", rx: "10" }),
                    rect({ id: "bridge-v-smb6", x: "110", y: "60", width: "36", height: "136", rx: "10" }),
                    g({ id: "ring-with-ears-smb6" }, [
                        circle({ cx: "128", cy: "128", r: "90" }),
                        circle({ cx: "70", cy: "70", r: "28" }),
                        circle({ cx: "186", cy: "70", r: "28" }),
                        circle({ cx: "70", cy: "186", r: "28" }),
                        circle({ cx: "186", cy: "186", r: "28" }),
                        use({ href: "#bridge-h-smb6" }),
                        use({ href: "#bridge-v-smb6" }),
                    ]),
                    mask({ id: "ring-mask-smb6" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "64", fill: "black" }),
                        use({ href: "#bridge-h-smb6", fill: "white" }),
                        use({ href: "#bridge-v-smb6", fill: "white" }),
                    ]),
                    clipPath({ id: "left-half-smb6" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-smb6" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-smb6)" }, [
                    use({ href: "#ring-with-ears-smb6", fill: "#FFE082", "clip-path": "url(#left-half-smb6)" }),
                    use({ href: "#ring-with-ears-smb6", fill: "#FFD54F", "clip-path": "url(#right-half-smb6)" }),
                ]),
                circle({
                    cx: "128",
                    cy: "128",
                    r: "64",
                    stroke: "#FFECB3",
                    "stroke-width": "2",
                    fill: "none",
                    opacity: "0.4",
                    mask: "url(#ring-mask-smb6)",
                }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSmb7: (props) =>
        SvgBase(
            [
                defs([
                    rect({ id: "bridge-bar-smb7", x: "60", y: "110", width: "136", height: "36", rx: "10" }),
                    g({ id: "all-bridges-smb7" }, [
                        use({ href: "#bridge-bar-smb7" }),
                        use({ href: "#bridge-bar-smb7", transform: "rotate(90 128 128)" }),
                        use({ href: "#bridge-bar-smb7", transform: "rotate(135 128 128)" }),
                    ]),
                    g({ id: "ring-with-ears-smb7" }, [
                        circle({ cx: "128", cy: "128", r: "90" }),
                        circle({ cx: "70", cy: "70", r: "28" }),
                        circle({ cx: "186", cy: "70", r: "28" }),
                        circle({ cx: "70", cy: "186", r: "28" }),
                        circle({ cx: "186", cy: "186", r: "28" }),
                        use({ href: "#all-bridges-smb7" }),
                    ]),
                    mask({ id: "ring-mask-smb7" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "64", fill: "black" }),
                        use({ href: "#all-bridges-smb7", fill: "white" }),
                    ]),
                    clipPath({ id: "left-half-smb7" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-smb7" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-smb7)" }, [
                    use({ href: "#ring-with-ears-smb7", fill: "#FFE082", "clip-path": "url(#left-half-smb7)" }),
                    use({ href: "#ring-with-ears-smb7", fill: "#FFD54F", "clip-path": "url(#right-half-smb7)" }),
                ]),
                circle({
                    cx: "128",
                    cy: "128",
                    r: "64",
                    stroke: "#FFECB3",
                    "stroke-width": "2",
                    fill: "none",
                    opacity: "0.4",
                    mask: "url(#ring-mask-smb7)",
                }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSmb8: (props) =>
        SvgBase(
            [
                defs([
                    rect({ id: "bridge-bar-smb8", x: "60", y: "110", width: "136", height: "36", rx: "10" }),
                    g({ id: "all-bridges-smb8" }, [
                        use({ href: "#bridge-bar-smb8" }),
                        use({ href: "#bridge-bar-smb8", transform: "rotate(90 128 128)" }),
                        use({ href: "#bridge-bar-smb8", transform: "rotate(45 128 128)" }),
                        use({ href: "#bridge-bar-smb8", transform: "rotate(135 128 128)" }),
                    ]),
                    g({ id: "ring-with-ears-smb8" }, [
                        circle({ cx: "128", cy: "128", r: "90" }),
                        circle({ cx: "70", cy: "70", r: "28" }),
                        circle({ cx: "186", cy: "70", r: "28" }),
                        circle({ cx: "70", cy: "186", r: "28" }),
                        circle({ cx: "186", cy: "186", r: "28" }),
                        use({ href: "#all-bridges-smb8" }),
                    ]),
                    mask({ id: "ring-mask-smb8" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "64", fill: "black" }),
                        use({ href: "#all-bridges-smb8", fill: "white" }),
                    ]),
                    clipPath({ id: "left-half-smb8" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-smb8" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-smb8)" }, [
                    use({ href: "#ring-with-ears-smb8", fill: "#FFE082", "clip-path": "url(#left-half-smb8)" }),
                    use({ href: "#ring-with-ears-smb8", fill: "#FFD54F", "clip-path": "url(#right-half-smb8)" }),
                ]),
                circle({
                    cx: "128",
                    cy: "128",
                    r: "64",
                    stroke: "#FFECB3",
                    "stroke-width": "2",
                    fill: "none",
                    opacity: "0.4",
                    mask: "url(#ring-mask-smb8)",
                }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogSmb9: (props) =>
        SvgBase(
            [
                defs([
                    rect({ id: "bridge-bar-smb9", x: "60", y: "110", width: "136", height: "36", rx: "10" }),
                    g({ id: "all-bridges-smb9" }, [
                        use({ href: "#bridge-bar-smb9" }),
                        use({ href: "#bridge-bar-smb9", transform: "rotate(90 128 128)" }),
                        use({ href: "#bridge-bar-smb9", transform: "rotate(45 128 128)" }),
                        use({ href: "#bridge-bar-smb9", transform: "rotate(135 128 128)" }),
                    ]),
                    rect({
                        id: "diamond-cutout-small-smb9",
                        x: "108",
                        y: "108",
                        width: "40",
                        height: "40",
                        transform: "rotate(45 128 128)",
                    }),
                    g({ id: "ring-with-ears-smb9" }, [
                        circle({ cx: "128", cy: "128", r: "90" }),
                        circle({ cx: "70", cy: "70", r: "28" }),
                        circle({ cx: "186", cy: "70", r: "28" }),
                        circle({ cx: "70", cy: "186", r: "28" }),
                        circle({ cx: "186", cy: "186", r: "28" }),
                        use({ href: "#all-bridges-smb9" }),
                    ]),
                    mask({ id: "ring-mask-smb9" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "64", fill: "black" }),
                        use({ href: "#all-bridges-smb9", fill: "white" }),
                        use({ href: "#diamond-cutout-small-smb9", fill: "black" }),
                    ]),
                    clipPath({ id: "left-half-smb9" }, [rect({ x: "0", y: "0", width: "128", height: "256" })]),
                    clipPath({ id: "right-half-smb9" }, [rect({ x: "128", y: "0", width: "128", height: "256" })]),
                ]),
                g({ mask: "url(#ring-mask-smb9)" }, [
                    use({ href: "#ring-with-ears-smb9", fill: "#FFE082", "clip-path": "url(#left-half-smb9)" }),
                    use({ href: "#ring-with-ears-smb9", fill: "#FFD54F", "clip-path": "url(#right-half-smb9)" }),
                ]),
                circle({
                    cx: "128",
                    cy: "128",
                    r: "64",
                    stroke: "#FFECB3",
                    "stroke-width": "2",
                    fill: "none",
                    opacity: "0.4",
                    mask: "url(#ring-mask-smb9)",
                }),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogY: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-cogy" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "teeth-cogy" }, [
                        use({ href: "#tooth-cogy" }),
                        use({ href: "#tooth-cogy", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-cogy", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-cogy", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-cogy", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-cogy", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-cogy", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-cogy", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-cogy" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-cogy" }),
                    ]),
                    mask({ id: "hole-mask-outline-cogy" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "41", fill: "black" }),
                    ]),
                    mask({ id: "hole-mask-color-cogy" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    clipPath({ id: "stripe1-cogy" }, [
                        rect({ x: "-100", y: "-50", width: "456", height: "90", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe2-cogy" }, [
                        rect({ x: "-100", y: "40", width: "456", height: "35", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe3-cogy" }, [
                        rect({ x: "-100", y: "75", width: "456", height: "25", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe4-cogy" }, [
                        rect({ x: "-100", y: "100", width: "456", height: "40", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe5-cogy" }, [
                        rect({ x: "-100", y: "140", width: "456", height: "50", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe6-cogy" }, [
                        rect({ x: "-100", y: "190", width: "456", height: "30", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe7-cogy" }, [
                        rect({ x: "-100", y: "220", width: "456", height: "130", transform: "rotate(135 128 128)" }),
                    ]),
                ]),
                g({ mask: "url(#hole-mask-outline-cogy)" }, [
                    use({
                        href: "#gear-solid-cogy",
                        fill: "#2A2A2A",
                        stroke: "#2A2A2A",
                        "stroke-width": "8",
                        "stroke-linejoin": "round",
                    }),
                ]),
                g({ mask: "url(#hole-mask-color-cogy)" }, [
                    use({ href: "#gear-solid-cogy", fill: "#C1C1C1", "clip-path": "url(#stripe1-cogy)" }),
                    use({ href: "#gear-solid-cogy", fill: "#898989", "clip-path": "url(#stripe2-cogy)" }),
                    use({ href: "#gear-solid-cogy", fill: "#E0E0E0", "clip-path": "url(#stripe3-cogy)" }),
                    use({ href: "#gear-solid-cogy", fill: "#898989", "clip-path": "url(#stripe4-cogy)" }),
                    use({ href: "#gear-solid-cogy", fill: "#5A5A5A", "clip-path": "url(#stripe5-cogy)" }),
                    use({ href: "#gear-solid-cogy", fill: "#898989", "clip-path": "url(#stripe6-cogy)" }),
                    use({ href: "#gear-solid-cogy", fill: "#3A3A3A", "clip-path": "url(#stripe7-cogy)" }),
                ]),
            ],
            { "aria-hidden": "true", ...props }
        ),

    CogZA00: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-za00" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "teeth-za00" }, [
                        use({ href: "#tooth-za00" }),
                        use({ href: "#tooth-za00", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-za00", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-za00", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-za00", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-za00", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-za00", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-za00", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-za00" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-za00" }),
                    ]),
                    mask({ id: "hole-mask-outline-za00" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "41", fill: "black" }),
                    ]),
                    mask({ id: "hole-mask-color-za00" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    clipPath({ id: "stripe1-za00" }, [
                        rect({ x: "-100", y: "-50", width: "456", height: "90", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe2-za00" }, [
                        rect({ x: "-100", y: "40", width: "456", height: "35", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe3-za00" }, [
                        rect({ x: "-100", y: "75", width: "456", height: "25", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe4-za00" }, [
                        rect({ x: "-100", y: "100", width: "456", height: "40", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe5-za00" }, [
                        rect({ x: "-100", y: "140", width: "456", height: "50", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe6-za00" }, [
                        rect({ x: "-100", y: "190", width: "456", height: "30", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe7-za00" }, [
                        rect({ x: "-100", y: "220", width: "456", height: "130", transform: "rotate(135 128 128)" }),
                    ]),
                ]),
                g({ mask: "url(#hole-mask-outline-za00)" }, [
                    use({
                        href: "#gear-solid-za00",
                        fill: "#2A2A2A",
                        stroke: "#2A2A2A",
                        "stroke-width": "8",
                        "stroke-linejoin": "round",
                    }),
                ]),
                g({ mask: "url(#hole-mask-color-za00)" }, [
                    use({ href: "#gear-solid-za00", fill: "#C1C1C1", "clip-path": "url(#stripe1-za00)" }),
                    use({ href: "#gear-solid-za00", fill: "#898989", "clip-path": "url(#stripe2-za00)" }),
                    use({ href: "#gear-solid-za00", fill: "#E0E0E0", "clip-path": "url(#stripe3-za00)" }),
                    use({ href: "#gear-solid-za00", fill: "#898989", "clip-path": "url(#stripe4-za00)" }),
                    use({ href: "#gear-solid-za00", fill: "#5A5A5A", "clip-path": "url(#stripe5-za00)" }),
                    use({ href: "#gear-solid-za00", fill: "#898989", "clip-path": "url(#stripe6-za00)" }),
                    use({ href: "#gear-solid-za00", fill: "#3A3A3A", "clip-path": "url(#stripe7-za00)" }),
                ]),
            ],
            { viewBox: "0 0 128 128", "aria-hidden": "true", ...props }
        ),

    CogZA0: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-za0" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "teeth-za0" }, [
                        use({ href: "#tooth-za0" }),
                        use({ href: "#tooth-za0", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-za0", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-za0", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-za0", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-za0", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-za0", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-za0", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-za0" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-za0" }),
                    ]),
                    mask({ id: "hole-mask-outline-za0" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "41", fill: "black" }),
                    ]),
                    mask({ id: "hole-mask-color-za0" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    clipPath({ id: "stripe1-za0" }, [
                        rect({ x: "-100", y: "-50", width: "456", height: "90", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe2-za0" }, [
                        rect({ x: "-100", y: "40", width: "456", height: "35", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe3-za0" }, [
                        rect({ x: "-100", y: "75", width: "456", height: "25", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe4-za0" }, [
                        rect({ x: "-100", y: "100", width: "456", height: "40", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe5-za0" }, [
                        rect({ x: "-100", y: "140", width: "456", height: "50", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe6-za0" }, [
                        rect({ x: "-100", y: "190", width: "456", height: "30", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe7-za0" }, [
                        rect({ x: "-100", y: "220", width: "456", height: "130", transform: "rotate(135 128 128)" }),
                    ]),
                ]),
                g({ mask: "url(#hole-mask-outline-za0)" }, [
                    use({
                        href: "#gear-solid-za0",
                        fill: "#2A2A2A",
                        stroke: "#2A2A2A",
                        "stroke-width": "8",
                        "stroke-linejoin": "round",
                    }),
                ]),
                g({ mask: "url(#hole-mask-color-za0)" }, [
                    use({ href: "#gear-solid-za0", fill: "#C1C1C1", "clip-path": "url(#stripe1-za0)" }),
                    use({ href: "#gear-solid-za0", fill: "#898989", "clip-path": "url(#stripe2-za0)" }),
                    use({ href: "#gear-solid-za0", fill: "#E0E0E0", "clip-path": "url(#stripe3-za0)" }),
                    use({ href: "#gear-solid-za0", fill: "#898989", "clip-path": "url(#stripe4-za0)" }),
                    use({ href: "#gear-solid-za0", fill: "#5A5A5A", "clip-path": "url(#stripe5-za0)" }),
                    use({ href: "#gear-solid-za0", fill: "#898989", "clip-path": "url(#stripe6-za0)" }),
                    use({ href: "#gear-solid-za0", fill: "#3A3A3A", "clip-path": "url(#stripe7-za0)" }),
                ]),
            ],
            { viewBox: "0 0 128 128", "aria-hidden": "true", ...props }
        ),

    CogZA01: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-za01" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "teeth-za01" }, [
                        use({ href: "#tooth-za01" }),
                        use({ href: "#tooth-za01", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-za01", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-za01", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-za01", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-za01", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-za01", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-za01", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-za01" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-za01" }),
                    ]),
                    mask({ id: "hole-mask-outline-za01" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "41", fill: "black" }),
                    ]),
                    mask({ id: "hole-mask-color-za01" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    clipPath({ id: "stripe1-za01" }, [
                        rect({ x: "-100", y: "-50", width: "456", height: "90", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe2-za01" }, [
                        rect({ x: "-100", y: "40", width: "456", height: "35", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe3-za01" }, [
                        rect({ x: "-100", y: "75", width: "456", height: "25", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe4-za01" }, [
                        rect({ x: "-100", y: "100", width: "456", height: "40", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe5-za01" }, [
                        rect({ x: "-100", y: "140", width: "456", height: "50", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe6-za01" }, [
                        rect({ x: "-100", y: "190", width: "456", height: "30", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe7-za01" }, [
                        rect({ x: "-100", y: "220", width: "456", height: "130", transform: "rotate(135 128 128)" }),
                    ]),
                ]),
                g({ mask: "url(#hole-mask-outline-za01)" }, [
                    use({
                        href: "#gear-solid-za01",
                        fill: "#2A2A2A",
                        stroke: "#2A2A2A",
                        "stroke-width": "8",
                        "stroke-linejoin": "round",
                    }),
                ]),
                g({ mask: "url(#hole-mask-color-za01)" }, [
                    use({ href: "#gear-solid-za01", fill: "#C1C1C1", "clip-path": "url(#stripe1-za01)" }),
                    use({ href: "#gear-solid-za01", fill: "#898989", "clip-path": "url(#stripe2-za01)" }),
                    use({ href: "#gear-solid-za01", fill: "#E0E0E0", "clip-path": "url(#stripe3-za01)" }),
                    use({ href: "#gear-solid-za01", fill: "#898989", "clip-path": "url(#stripe4-za01)" }),
                    use({ href: "#gear-solid-za01", fill: "#5A5A5A", "clip-path": "url(#stripe5-za01)" }),
                    use({ href: "#gear-solid-za01", fill: "#898989", "clip-path": "url(#stripe6-za01)" }),
                    use({ href: "#gear-solid-za01", fill: "#3A3A3A", "clip-path": "url(#stripe7-za01)" }),
                ]),
            ],
            { viewBox: "128 0 128 128", "aria-hidden": "true", ...props }
        ),

    CogZA02: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-za02" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "teeth-za02" }, [
                        use({ href: "#tooth-za02" }),
                        use({ href: "#tooth-za02", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-za02", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-za02", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-za02", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-za02", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-za02", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-za02", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-za02" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-za02" }),
                    ]),
                    mask({ id: "hole-mask-outline-za02" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "41", fill: "black" }),
                    ]),
                    mask({ id: "hole-mask-color-za02" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    clipPath({ id: "stripe1-za02" }, [
                        rect({ x: "-100", y: "-50", width: "456", height: "90", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe2-za02" }, [
                        rect({ x: "-100", y: "40", width: "456", height: "35", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe3-za02" }, [
                        rect({ x: "-100", y: "75", width: "456", height: "25", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe4-za02" }, [
                        rect({ x: "-100", y: "100", width: "456", height: "40", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe5-za02" }, [
                        rect({ x: "-100", y: "140", width: "456", height: "50", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe6-za02" }, [
                        rect({ x: "-100", y: "190", width: "456", height: "30", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe7-za02" }, [
                        rect({ x: "-100", y: "220", width: "456", height: "130", transform: "rotate(135 128 128)" }),
                    ]),
                ]),
                g({ mask: "url(#hole-mask-outline-za02)" }, [
                    use({
                        href: "#gear-solid-za02",
                        fill: "#2A2A2A",
                        stroke: "#2A2A2A",
                        "stroke-width": "8",
                        "stroke-linejoin": "round",
                    }),
                ]),
                g({ mask: "url(#hole-mask-color-za02)" }, [
                    use({ href: "#gear-solid-za02", fill: "#C1C1C1", "clip-path": "url(#stripe1-za02)" }),
                    use({ href: "#gear-solid-za02", fill: "#898989", "clip-path": "url(#stripe2-za02)" }),
                    use({ href: "#gear-solid-za02", fill: "#E0E0E0", "clip-path": "url(#stripe3-za02)" }),
                    use({ href: "#gear-solid-za02", fill: "#898989", "clip-path": "url(#stripe4-za02)" }),
                    use({ href: "#gear-solid-za02", fill: "#5A5A5A", "clip-path": "url(#stripe5-za02)" }),
                    use({ href: "#gear-solid-za02", fill: "#898989", "clip-path": "url(#stripe6-za02)" }),
                    use({ href: "#gear-solid-za02", fill: "#3A3A3A", "clip-path": "url(#stripe7-za02)" }),
                ]),
            ],
            { viewBox: "0 128 128 128", "aria-hidden": "true", ...props }
        ),

    CogZA03: (props) =>
        SvgBase(
            [
                defs([
                    g({ id: "tooth-za03" }, [polygon({ points: "108,36 115,6 141,6 148,36" })]),
                    g({ id: "teeth-za03" }, [
                        use({ href: "#tooth-za03" }),
                        use({ href: "#tooth-za03", transform: "rotate(45 128 128)" }),
                        use({ href: "#tooth-za03", transform: "rotate(90 128 128)" }),
                        use({ href: "#tooth-za03", transform: "rotate(135 128 128)" }),
                        use({ href: "#tooth-za03", transform: "rotate(180 128 128)" }),
                        use({ href: "#tooth-za03", transform: "rotate(225 128 128)" }),
                        use({ href: "#tooth-za03", transform: "rotate(270 128 128)" }),
                        use({ href: "#tooth-za03", transform: "rotate(315 128 128)" }),
                    ]),
                    g({ id: "gear-solid-za03" }, [
                        circle({ cx: "128", cy: "128", r: "96" }),
                        use({ href: "#teeth-za03" }),
                    ]),
                    mask({ id: "hole-mask-outline-za03" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "41", fill: "black" }),
                    ]),
                    mask({ id: "hole-mask-color-za03" }, [
                        rect({ width: "256", height: "256", fill: "white" }),
                        circle({ cx: "128", cy: "128", r: "45", fill: "black" }),
                    ]),
                    clipPath({ id: "stripe1-za03" }, [
                        rect({ x: "-100", y: "-50", width: "456", height: "90", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe2-za03" }, [
                        rect({ x: "-100", y: "40", width: "456", height: "35", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe3-za03" }, [
                        rect({ x: "-100", y: "75", width: "456", height: "25", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe4-za03" }, [
                        rect({ x: "-100", y: "100", width: "456", height: "40", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe5-za03" }, [
                        rect({ x: "-100", y: "140", width: "456", height: "50", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe6-za03" }, [
                        rect({ x: "-100", y: "190", width: "456", height: "30", transform: "rotate(135 128 128)" }),
                    ]),
                    clipPath({ id: "stripe7-za03" }, [
                        rect({ x: "-100", y: "220", width: "456", height: "130", transform: "rotate(135 128 128)" }),
                    ]),
                ]),
                g({ mask: "url(#hole-mask-outline-za03)" }, [
                    use({
                        href: "#gear-solid-za03",
                        fill: "#2A2A2A",
                        stroke: "#2A2A2A",
                        "stroke-width": "8",
                        "stroke-linejoin": "round",
                    }),
                ]),
                g({ mask: "url(#hole-mask-color-za03)" }, [
                    use({ href: "#gear-solid-za03", fill: "#C1C1C1", "clip-path": "url(#stripe1-za03)" }),
                    use({ href: "#gear-solid-za03", fill: "#898989", "clip-path": "url(#stripe2-za03)" }),
                    use({ href: "#gear-solid-za03", fill: "#E0E0E0", "clip-path": "url(#stripe3-za03)" }),
                    use({ href: "#gear-solid-za03", fill: "#898989", "clip-path": "url(#stripe4-za03)" }),
                    use({ href: "#gear-solid-za03", fill: "#5A5A5A", "clip-path": "url(#stripe5-za03)" }),
                    use({ href: "#gear-solid-za03", fill: "#898989", "clip-path": "url(#stripe6-za03)" }),
                    use({ href: "#gear-solid-za03", fill: "#3A3A3A", "clip-path": "url(#stripe7-za03)" }),
                ]),
            ],
            { viewBox: "128 128 128 128", "aria-hidden": "true", ...props }
        ),

    CogFLflagS1: (props) =>
        SvgBase(
            [
                rect({ x: "20", y: "80", width: "65", height: "12", fill: "#000000" }),
                rect({ x: "35", y: "68", width: "40", height: "12", fill: "#000000" }),
                rect({ x: "62", y: "15", width: "8", height: "53", fill: "#000000" }),
                polygon({
                    points: "62,15 62,65 10,40",
                    fill: "#D32F2F",
                    stroke: "#000000",
                    "stroke-width": "5",
                    "stroke-linejoin": "round",
                }),
            ],
            { viewBox: "0 0 100 100", "aria-hidden": "true", ...props }
        ),

    CogFLflag: (props) =>
        SvgBase(
            [
                rect({ x: "25", y: "80", width: "55", height: "12", fill: "#000000" }),
                rect({ x: "40", y: "68", width: "30", height: "12", fill: "#000000" }),
                rect({ x: "58", y: "15", width: "8", height: "53", fill: "#000000" }),
                polygon({
                    points: "58,15 58,50 25,32.5",
                    fill: "#D32F2F",
                    stroke: "#000000",
                    "stroke-width": "5",
                    "stroke-linejoin": "round",
                }),
            ],
            { viewBox: "0 0 100 100", "aria-hidden": "true", ...props }
        ),

    CogSq_S1: (props) =>
        SvgBase(
            [
                defs([clipPath({ id: "inner-box-cogsq-s1" }, [rect({ x: "1", y: "1", width: "14", height: "14" })])]),
                rect({ width: "16", height: "16", fill: "#A47C62" }),
                rect({ x: "1", y: "1", width: "14", height: "14", fill: "#3E2723" }),
                g({ "clip-path": "url(#inner-box-cogsq-s1)" }, [
                    rect({ x: "1", y: "4", width: "2", height: "1", fill: "#4E342E" }),
                    rect({ x: "3", y: "3", width: "7", height: "1", fill: "#4E342E" }),
                    rect({ x: "10", y: "4", width: "4", height: "1", fill: "#4E342E" }),
                    rect({ x: "1", y: "7", width: "3", height: "1", fill: "#4E342E" }),
                    rect({ x: "4", y: "6", width: "6", height: "1", fill: "#4E342E" }),
                    rect({ x: "10", y: "7", width: "5", height: "1", fill: "#4E342E" }),
                    rect({ x: "1", y: "10", width: "1", height: "1", fill: "#4E342E" }),
                    rect({ x: "2", y: "9", width: "3", height: "1", fill: "#4E342E" }),
                    rect({ x: "1", y: "5", width: "2", height: "1", fill: "#5D4037" }),
                    rect({ x: "3", y: "4", width: "7", height: "1", fill: "#5D4037" }),
                    rect({ x: "10", y: "5", width: "4", height: "1", fill: "#5D4037" }),
                    rect({ x: "1", y: "8", width: "3", height: "1", fill: "#5D4037" }),
                    rect({ x: "4", y: "7", width: "6", height: "1", fill: "#5D4037" }),
                    rect({ x: "10", y: "8", width: "5", height: "1", fill: "#5D4037" }),
                    rect({ x: "1", y: "11", width: "1", height: "1", fill: "#5D4037" }),
                    rect({ x: "2", y: "10", width: "3", height: "1", fill: "#5D4037" }),
                ]),
                rect({ x: "1", y: "1", width: "1", height: "1", fill: "#1A0F0A" }),
                rect({ x: "14", y: "1", width: "1", height: "1", fill: "#1A0F0A" }),
                rect({ x: "1", y: "14", width: "1", height: "1", fill: "#1A0F0A" }),
                rect({ x: "14", y: "14", width: "1", height: "1", fill: "#1A0F0A" }),
            ],
            { viewBox: "0 0 16 16", "aria-hidden": "true", ...props }
        ),

    CogSq1: (props) =>
        SvgBase(
            [
                defs([clipPath({ id: "inner-box-cogsq1" }, [rect({ x: "1", y: "1", width: "14", height: "14" })])]),
                rect({ width: "16", height: "16", fill: "#A47C62" }),
                rect({ x: "1", y: "1", width: "14", height: "14", fill: "#3E2723" }),
                g({ "clip-path": "url(#inner-box-cogsq1)" }, [
                    rect({ x: "1", y: "4", width: "2", height: "1", fill: "#4E342E" }),
                    rect({ x: "3", y: "3", width: "7", height: "1", fill: "#4E342E" }),
                    rect({ x: "10", y: "4", width: "4", height: "1", fill: "#4E342E" }),
                    rect({ x: "1", y: "7", width: "3", height: "1", fill: "#4E342E" }),
                    rect({ x: "4", y: "6", width: "6", height: "1", fill: "#4E342E" }),
                    rect({ x: "10", y: "7", width: "5", height: "1", fill: "#4E342E" }),
                    rect({ x: "1", y: "10", width: "1", height: "1", fill: "#4E342E" }),
                    rect({ x: "2", y: "9", width: "3", height: "1", fill: "#4E342E" }),
                    rect({ x: "1", y: "5", width: "2", height: "1", fill: "#5D4037" }),
                    rect({ x: "3", y: "4", width: "7", height: "1", fill: "#5D4037" }),
                    rect({ x: "10", y: "5", width: "4", height: "1", fill: "#5D4037" }),
                    rect({ x: "1", y: "8", width: "3", height: "1", fill: "#5D4037" }),
                    rect({ x: "4", y: "7", width: "6", height: "1", fill: "#5D4037" }),
                    rect({ x: "10", y: "8", width: "5", height: "1", fill: "#5D4037" }),
                    rect({ x: "1", y: "11", width: "1", height: "1", fill: "#5D4037" }),
                    rect({ x: "2", y: "10", width: "3", height: "1", fill: "#5D4037" }),
                ]),
                rect({ x: "1", y: "1", width: "1", height: "1", fill: "#1A0F0A" }),
                rect({ x: "14", y: "1", width: "1", height: "1", fill: "#1A0F0A" }),
                rect({ x: "1", y: "14", width: "1", height: "1", fill: "#1A0F0A" }),
                rect({ x: "14", y: "14", width: "1", height: "1", fill: "#1A0F0A" }),
            ],
            { viewBox: "0 0 16 16", "aria-hidden": "true", ...props }
        ),

    CogSq_S0: (props) =>
        SvgBase(
            [
                rect({ width: "16", height: "16", fill: "#4A352F" }),
                rect({ x: "1", y: "1", width: "14", height: "14", fill: "#6A4930" }),
                rect({ x: "1", y: "4", width: "2", height: "1", fill: "#8E6346" }),
                rect({ x: "3", y: "3", width: "7", height: "1", fill: "#8E6346" }),
                rect({ x: "10", y: "4", width: "4", height: "1", fill: "#8E6346" }),
                rect({ x: "1", y: "7", width: "3", height: "1", fill: "#8E6346" }),
                rect({ x: "4", y: "6", width: "6", height: "1", fill: "#8E6346" }),
                rect({ x: "10", y: "7", width: "5", height: "1", fill: "#8E6346" }),
                rect({ x: "1", y: "10", width: "1", height: "1", fill: "#8E6346" }),
                rect({ x: "2", y: "9", width: "3", height: "1", fill: "#8E6346" }),
                rect({ x: "1", y: "5", width: "2", height: "1", fill: "#A47C62" }),
                rect({ x: "3", y: "4", width: "7", height: "1", fill: "#A47C62" }),
                rect({ x: "10", y: "5", width: "4", height: "1", fill: "#A47C62" }),
                rect({ x: "1", y: "8", width: "3", height: "1", fill: "#A47C62" }),
                rect({ x: "4", y: "7", width: "6", height: "1", fill: "#A47C62" }),
                rect({ x: "10", y: "8", width: "5", height: "1", fill: "#A47C62" }),
                rect({ x: "1", y: "11", width: "1", height: "1", fill: "#A47C62" }),
                rect({ x: "2", y: "10", width: "3", height: "1", fill: "#A47C62" }),
            ],
            { viewBox: "0 0 16 16", "aria-hidden": "true", ...props }
        ),

    CogSq0: (props) =>
        SvgBase(
            [
                rect({ width: "16", height: "16", fill: "#4A352F" }),
                rect({ x: "1", y: "1", width: "14", height: "14", fill: "#6A4930" }),
                rect({ x: "1", y: "4", width: "2", height: "1", fill: "#8E6346" }),
                rect({ x: "3", y: "3", width: "7", height: "1", fill: "#8E6346" }),
                rect({ x: "10", y: "4", width: "4", height: "1", fill: "#8E6346" }),
                rect({ x: "1", y: "7", width: "3", height: "1", fill: "#8E6346" }),
                rect({ x: "4", y: "6", width: "6", height: "1", fill: "#8E6346" }),
                rect({ x: "10", y: "7", width: "5", height: "1", fill: "#8E6346" }),
                rect({ x: "1", y: "10", width: "1", height: "1", fill: "#8E6346" }),
                rect({ x: "2", y: "9", width: "3", height: "1", fill: "#8E6346" }),
                rect({ x: "1", y: "5", width: "2", height: "1", fill: "#A47C62" }),
                rect({ x: "3", y: "4", width: "7", height: "1", fill: "#A47C62" }),
                rect({ x: "10", y: "5", width: "4", height: "1", fill: "#A47C62" }),
                rect({ x: "1", y: "8", width: "3", height: "1", fill: "#A47C62" }),
                rect({ x: "4", y: "7", width: "6", height: "1", fill: "#A47C62" }),
                rect({ x: "10", y: "8", width: "5", height: "1", fill: "#A47C62" }),
                rect({ x: "1", y: "11", width: "1", height: "1", fill: "#A47C62" }),
                rect({ x: "2", y: "10", width: "3", height: "1", fill: "#A47C62" }),
            ],
            { viewBox: "0 0 16 16", "aria-hidden": "true", ...props }
        ),

    headBIG: (props) =>
        SvgBase(
            [
                defs([
                    radialGradient({ id: "skin", cx: "50%", cy: "50%", r: "50%" }, [
                        stop({ offset: "0%", "stop-color": "#FFDFC4" }),
                        stop({ offset: "100%", "stop-color": "#E0B896" }),
                    ]),
                ]),
                path({ d: "M 50 100 C 50 40, 150 40, 150 100 L 150 160 C 150 180, 50 180, 50 160 Z", fill: "#4A3B32" }),
                path({ d: "M 85 145 L 80 200 L 120 200 L 115 145 Z", fill: "#D4A37D" }),
                path({ d: "M 40 200 C 40 160, 160 160, 160 200 Z", fill: "#2980B9" }),
                path({
                    d: "M 60 100 C 60 60, 140 60, 140 100 C 140 140, 120 160, 100 160 C 80 160, 60 140, 60 100 Z",
                    fill: "url(#skin)",
                }),
                circle({ cx: "85", cy: "105", r: "4.5", fill: "#2C3E50" }),
                circle({ cx: "115", cy: "105", r: "4.5", fill: "#2C3E50" }),
                circle({ cx: "86", cy: "104", r: "1.5", fill: "#FFFFFF" }),
                circle({ cx: "116", cy: "104", r: "1.5", fill: "#FFFFFF" }),
                path({
                    d: "M 76 95 Q 85 92 92 96",
                    stroke: "#4A3B32",
                    "stroke-width": "2.5",
                    fill: "none",
                    "stroke-linecap": "round",
                }),
                path({
                    d: "M 108 96 Q 115 92 124 95",
                    stroke: "#4A3B32",
                    "stroke-width": "2.5",
                    fill: "none",
                    "stroke-linecap": "round",
                }),
                path({
                    d: "M 100 105 L 100 122 L 105 122",
                    stroke: "#B88A6B",
                    "stroke-width": "2",
                    fill: "none",
                    "stroke-linecap": "round",
                    "stroke-linejoin": "round",
                }),
                path({
                    d: "M 88 135 Q 100 144 112 135",
                    stroke: "#C46A6A",
                    "stroke-width": "2.5",
                    fill: "none",
                    "stroke-linecap": "round",
                }),
                path({
                    d: "M 60 100 C 60 70, 100 65, 100 65 C 100 65, 140 70, 140 100 C 140 80, 110 45, 100 45 C 90 45, 60 80, 60 100 Z",
                    fill: "#382B24",
                }),
            ],
            { viewBox: "0 0 200 200", "aria-hidden": "true", ...props }
        ),
};
