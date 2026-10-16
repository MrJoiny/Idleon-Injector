import {
    NEW_SCAN_TYPES,
    NEXT_SCAN_TYPES,
    isInputlessScanType,
    requiresSecondaryInput,
    requiresNumericInput,
    needsPreviousSnapshot,
    buildSnapshotFromResults,
    filterResultsByScanType,
} from "./scanUtils.js";

/**
 * Own scan transitions and baselines independently of rendering.
 * `state` is a plain or reactive output object initialized by this module.
 * The view may update displayed results after edits without changing the scan baseline.
 * `run` returns validation feedback or truncation feedback for the view to present.
 */
export const createScanSession = ({ search, state }) => {
    let scopePaths = [];
    let previousSnapshot = {};

    const reset = () => {
        scopePaths = [];
        previousSnapshot = {};
        Object.assign(state, {
            active: false,
            lastSearchMode: "new",
            results: [],
            scopeCount: 0,
            error: null,
            hasSearched: false,
        });
    };

    state.isSearching = false;
    reset();

    const run = async ({ mode = "new", scanType, query, query2, keys }) => {
        if (state.isSearching) return;

        const isNext = mode === "next";
        const allowedScanTypes = isNext ? NEXT_SCAN_TYPES : NEW_SCAN_TYPES;
        if (!allowedScanTypes.includes(scanType)) {
            return {
                validationError: isNext
                    ? "This scan type is only available for NEW scans"
                    : "This scan type is only available for NEXT scans",
            };
        }

        if (isNext) {
            if (scopePaths.length === 0) {
                return { validationError: "Run a NEW search first to build a list for NEXT search" };
            }
        } else if (keys.length === 0) {
            return { validationError: "Select at least one key to search in" };
        }

        query = String(query ?? "");
        query2 = String(query2 ?? "");
        const queryTrimmed = query.trim();
        const query2Trimmed = query2.trim();
        const inputless = isInputlessScanType(scanType);

        if (scanType === "exact_value" && queryTrimmed === "") {
            return { validationError: "Enter a value for FIND VALUE, or choose UNKNOWN INITIAL VALUE" };
        }
        if (!inputless && scanType !== "exact_value" && queryTrimmed === "") {
            return { validationError: "Enter a value for this scan type" };
        }
        if (requiresNumericInput(scanType) && (queryTrimmed === "" || Number.isNaN(Number(queryTrimmed)))) {
            return { validationError: "This scan type requires a numeric value" };
        }
        if (requiresSecondaryInput(scanType)) {
            if (queryTrimmed === "" || query2Trimmed === "") {
                return { validationError: "Enter both values for VALUE BETWEEN" };
            }
            if (Number.isNaN(Number(queryTrimmed)) || Number.isNaN(Number(query2Trimmed))) {
                return { validationError: "VALUE BETWEEN requires numeric bounds" };
            }
        }
        if (isNext && needsPreviousSnapshot(scanType) && Object.keys(previousSnapshot).length === 0) {
            return { validationError: "This NEXT scan type needs a previous result baseline" };
        }

        state.hasSearched = true;
        state.isSearching = true;
        state.error = null;
        state.lastSearchMode = mode;

        // Absolute predicates run game-side before its result cap; relative scans use our baseline.
        const qNum = Number(queryTrimmed);
        const q2Num = Number(query2Trimmed);
        let effectiveQuery = "";
        let compare = null;
        if (scanType === "exact_value") {
            effectiveQuery = query;
        } else if (scanType === "bigger_than") {
            compare = { op: "gt", value: qNum };
        } else if (scanType === "smaller_than") {
            compare = { op: "lt", value: qNum };
        } else if (scanType === "value_between") {
            effectiveQuery = `${Math.min(qNum, q2Num)}-${Math.max(qNum, q2Num)}`;
        }

        const options = {};
        if (isNext) options.withinPaths = [...scopePaths];
        if (compare) options.compare = compare;
        const requestOptions = Object.keys(options).length > 0 ? options : null;

        try {
            const data = await search(effectiveQuery, keys, requestOptions);
            const results = needsPreviousSnapshot(scanType)
                ? filterResultsByScanType(data.results || [], {
                      scanType,
                      query: inputless ? "" : query,
                      previousSnapshot,
                  })
                : data.results || [];

            state.results = results;
            scopePaths = results.map((result) => result.path);
            previousSnapshot = buildSnapshotFromResults(results);
            state.scopeCount = scopePaths.length;
            state.active = true;
            return { truncated: Boolean(data.truncated) };
        } catch (err) {
            state.error = err.message || "Search failed";
            if (!isNext) {
                scopePaths = [];
                previousSnapshot = {};
                state.results = [];
                state.scopeCount = 0;
                state.active = false;
            }
        } finally {
            state.isSearching = false;
        }
    };

    return { run, reset };
};
