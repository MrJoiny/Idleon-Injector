/**
 * Number formatting utility — matches IdleOn's display style.
 *
 * Thresholds:
 *   < 1,000          → raw (e.g. 42)
 *   < 1e6            → K   (e.g. 4.32K)
 *   < 1e9            → M   (e.g. 123.4M)
 *   < 1e12           → B   (e.g. 1.23B)
 *   < 1e15           → T   (e.g. 4.56T)
 *   < 1e18           → Q   (quadrillion)
 *   < 1e21           → QQ  (quintillion)
 *   < 1e24           → QQQ (sextillion)
 *   ≥ 1e24           → Exx (e.g. E27)
 */
export function formatNumber(value) {
    const n = Number(value);
    if (!isFinite(n)) return String(value);
    if (n < 0) return "-" + formatNumber(-n);

    if (n < 1_000)     return n % 1 === 0 ? String(n) : n.toFixed(2);
    if (n < 1e6)       return (n / 1e3).toPrecision(4).replace(/\.?0+$/, "")  + "K";
    if (n < 1e9)       return (n / 1e6).toPrecision(4).replace(/\.?0+$/, "")  + "M";
    if (n < 1e12)      return (n / 1e9).toPrecision(4).replace(/\.?0+$/, "")  + "B";
    if (n < 1e15)      return (n / 1e12).toPrecision(4).replace(/\.?0+$/, "") + "T";
    if (n < 1e18)      return (n / 1e15).toPrecision(4).replace(/\.?0+$/, "") + "Q";
    if (n < 1e21)      return (n / 1e18).toPrecision(4).replace(/\.?0+$/, "") + "QQ";
    if (n < 1e24)      return (n / 1e21).toPrecision(4).replace(/\.?0+$/, "") + "QQQ";

    const exp = Math.floor(Math.log10(n));
    return `E${exp}`;
}

/**
 * Parse a formatted number string back to a numeric value.
 * Handles suffixes: K, M, B, T, Q, QQ, QQQ and scientific Exx notation.
 * Returns null if the string cannot be parsed.
 *
 * @param {string} str
 * @returns {number|null}
 */
export function parseNumber(str) {
    if (str === null || str === undefined) return null;
    const s = String(str).trim();
    if (s === "" || s === "-") return null;

    // Plain number
    const plain = Number(s);
    if (!isNaN(plain)) return plain;

    // Scientific Exx shorthand (E27 etc — no coefficient, assume 10^N)
    const eMatch = s.match(/^[eE](\d+)$/);
    if (eMatch) return Math.pow(10, Number(eMatch[1]));

    // Order matters — longer suffixes must be checked first
    const suffixes = [
        ["QQQ", 1e21],
        ["QQ",  1e18],
        ["Q",   1e15],
        ["T",   1e12],
        ["B",   1e9],
        ["M",   1e6],
        ["K",   1e3],
    ];

    for (const [suffix, mult] of suffixes) {
        if (s.toUpperCase().endsWith(suffix.toUpperCase())) {
            const n = Number(s.slice(0, -suffix.length));
            if (!isNaN(n)) return n * mult;
        }
    }

    return null;
}
