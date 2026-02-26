import van from "../vendor/van-1.6.0.js";

const { svg, polyline, circle, title } = van.tags("http://www.w3.org/2000/svg");
const { span } = van.tags;

/**
 * Checks if a value is numeric and finite
 * @param {any} val - Value to check
 * @returns {boolean}
 */
const toNumeric = (val) => {
    if (typeof val === "number" && Number.isFinite(val)) return val;

    if (typeof val === "string") {
        const trimmed = val.trim();
        if (trimmed === "") return null;

        const parsed = Number(trimmed);
        if (Number.isFinite(parsed)) return parsed;
    }

    return null;
};

const isNumeric = (val) => toNumeric(val) !== null;

const POINT_COUNT = 10;

/**
 * Sparkline component - renders a small inline SVG graph with line and dots
 * Always displays 10 points, padding with oldest value if needed.
 * Order: left = oldest, right = newest.
 * @param {Object} props - Component properties
 * @param {Array<{value: any, ts: number}>} props.data - Array of history entries (index 0 = newest)
 * @param {number} [props.width=150] - SVG width in pixels
 * @param {number} [props.height=30] - SVG height in pixels
 * @returns {Element} SVG element or fallback span
 */
export const Sparkline = ({ data, width = 150, height = 30 }) => {
    // Filter to numeric values and reverse so oldest is first (left)
    const numericData = data
        .map((d) => {
            const numericValue = toNumeric(d.value);
            if (numericValue === null) return null;
            return { ...d, value: numericValue };
        })
        .filter(Boolean)
        .reverse();

    if (numericData.length === 0) {
        return span({ class: "sparkline-empty" }, "—");
    }

    // Pad to always have 10 points by repeating the oldest value
    const oldest = numericData[0];
    const padCount = Math.max(0, POINT_COUNT - numericData.length);
    const orderedData = [
        ...Array(padCount).fill().map(() => ({ ...oldest, isPadded: true })),
        ...numericData
    ];

    // Calculate min/max for normalization
    const values = orderedData.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1; // Avoid division by zero for flat lines

    // Padding to prevent dots from being clipped at edges
    const padX = 6;
    const padY = 5;
    const graphWidth = width - padX * 2;
    const graphHeight = height - padY * 2;

    // Calculate points for polyline and circles (Y inverted for SVG origin)
    const points = orderedData.map((entry, i) => {
        const x = padX + (i / (POINT_COUNT - 1)) * graphWidth;
        const y = padY + graphHeight - ((entry.value - min) / range) * graphHeight;
        return { x, y, value: entry.value, ts: entry.ts, isPadded: entry.isPadded };
    });

    const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

    return svg(
        { class: "sparkline", width, height, viewBox: `0 0 ${width} ${height}` },
        polyline({ class: "sparkline-line", points: polylinePoints }),
        ...points.map((p) => {
            const timestamp = new Date(p.ts).toLocaleTimeString();
            const dotClass = p.isPadded ? "sparkline-dot sparkline-dot-padded" : "sparkline-dot";
            return circle({ class: dotClass, cx: p.x, cy: p.y, r: 3 }, title(`${p.value} @ ${timestamp}`));
        })
    );
};

/**
 * Checks if history data can be graphed (has at least one numeric value)
 * @param {Array<{value: any, ts: number}>} data - History array
 * @returns {boolean}
 */
export const canGraph = (data) => {
    return data.some((d) => isNumeric(d.value));
};
