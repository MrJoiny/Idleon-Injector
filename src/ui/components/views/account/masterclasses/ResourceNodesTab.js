import van from "../../../../vendor/van-1.6.0.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { gga, readCList } from "../../../../services/api.js";
import { formatNumber } from "../../../../utils/numberFormat.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { BulkActionBar } from "../BulkActionBar.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { AccountRow } from "../components/AccountRow.js";
import { AccountSection } from "../components/AccountSection.js";
import { ActionButton } from "../components/ActionButton.js";
import { InlineEditableNumberField } from "../components/InlineEditableNumberField.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import {
    getOrCreateState,
    resolveNumberInput,
    toInt,
    toNum,
    useWriteStatus,
    writeVerified,
} from "../accountShared.js";

const { button, div, img, span } = van.tags;

const WORLD_COUNT = 7;
const NODES_PER_WORLD = 20;

const royalResourceIcon = (resourceId) => `/assets/royal-resources/RGres${resourceId}.png`;

const nodeWorld = (nodeIndex) => Math.floor(nodeIndex / NODES_PER_WORLD) + 1;
const localNode = (nodeIndex) => nodeIndex % NODES_PER_WORLD;

const nodeMax = (nodeIndex, baseAmount, grade) =>
    5 * baseAmount * Math.pow(1.5, Math.max(0, grade)) * Math.pow(5, Math.floor(nodeIndex / NODES_PER_WORLD));

const formatAmount = (value) => formatNumber(Math.max(0, Math.floor(toNum(value, 0))));

const readNodes = async () => {
    const [rawNodes, rawCollected, rawGrades] = await Promise.all([
        readCList("RoyalResources"),
        gga("RoyalG[4]"),
        gga("RoyalG[5]"),
    ]);
    const collected = toIndexedArray(rawCollected ?? []);
    const grades = toIndexedArray(rawGrades ?? []);

    return toIndexedArray(rawNodes ?? [])
        .map((node, nodeIndex) => {
            const row = toIndexedArray(node ?? []);
            const resourceType = toInt(row[3], { min: 0, fallback: -1 });
            if (!Array.isArray(node) || resourceType < 0) return null;

            const x = toNum(row[0], 0);
            const y = toNum(row[1], 0);
            const baseAmount = toNum(row[2], 0);
            if (baseAmount === 0 && x === 0 && y === 0) return null;

            const grade = toInt(grades[nodeIndex], { min: 0 });
            const depleted = toNum(collected[nodeIndex], 0);
            const max = nodeMax(nodeIndex, baseAmount, grade);

            return {
                nodeIndex,
                world: nodeWorld(nodeIndex),
                localNode: localNode(nodeIndex),
                x,
                y,
                baseAmount,
                resourceType,
                grade,
                depleted,
                max,
            };
        })
        .filter(Boolean);
};

const nodeBadge = ({ depleted, max }) => {
    if (depleted < 0) return "DEPLETED";
    if (depleted === 0) return `FULL / ${formatAmount(max)}`;
    return `LEFT ${formatAmount(max - depleted)}`;
};

const NodeInfo = ({ node }) => [
    span({ class: "account-row__index" }, `N${node.localNode}`),
    img({
        class: "masterclass-currency__icon resource-node-row__icon",
        src: royalResourceIcon(node.resourceType),
        alt: "",
        loading: "lazy",
    }),
    div(
        { class: "resource-node-row__text" },
        span({ class: "account-row__name" }, `Node ${node.nodeIndex} / RGres${node.resourceType}`),
        span(
            { class: "resource-node-row__meta" },
            `Base ${formatAmount(node.baseAmount)} | Max ${formatAmount(node.max)} | X ${node.x}, Y ${node.y}`
        )
    ),
];

const NodeRow = ({ node, gradeState, depletedState }) => {
    const quickStatus = useWriteStatus();
    const refreshComputed = () => {
        node.grade = toInt(gradeState.val, { min: 0 });
        node.depleted = toNum(depletedState.val, 0);
        node.max = nodeMax(node.nodeIndex, node.baseAmount, node.grade);
    };

    const writeDepleted = async (value) => {
        const result = await quickStatus.run(async () => {
            await writeVerified(`RoyalG[4][${node.nodeIndex}]`, value);
            depletedState.val = value;
            refreshComputed();
        });
        return result.ok;
    };

    return AccountRow({
        status: quickStatus.status,
        rowClass: "resource-node-row",
        badgeClass: "resource-node-row__badge",
        controlsClass: "resource-node-row__controls",
        info: NodeInfo({ node }),
        badge: () => nodeBadge(node),
        controls: [
            InlineEditableNumberField({
                label: "GRADE",
                valueState: gradeState,
                path: `RoyalG[5][${node.nodeIndex}]`,
                normalize: (raw) => resolveNumberInput(raw, { formatted: true, min: 0, fallback: null }),
                rootClass: "resource-node-row__field",
                labelClass: "resource-node-row__field-label",
                inputClass: "resource-node-row__set",
            }),
            InlineEditableNumberField({
                label: "COLLECTED",
                valueState: depletedState,
                path: `RoyalG[4][${node.nodeIndex}]`,
                inputMode: "float",
                normalize: (raw) =>
                    resolveNumberInput(raw, { formatted: true, float: true, min: -1, fallback: null }),
                rootClass: "resource-node-row__field",
                labelClass: "resource-node-row__field-label",
                inputClass: "resource-node-row__set",
            }),
            ActionButton({
                label: "FRESH",
                status: quickStatus.status,
                tooltip: "Set collected/depleted amount to 0.",
                onClick: (e) => {
                    e.preventDefault();
                    void writeDepleted(0);
                },
            }),
            ActionButton({
                label: "DEPLETE",
                status: quickStatus.status,
                variant: "danger",
                tooltip: "Set collected/depleted amount to -1.",
                onClick: (e) => {
                    e.preventDefault();
                    void writeDepleted(-1);
                },
            }),
        ],
    });
};

export const ResourceNodesTab = () => {
    const { loading, error, run: runLoad } = useAccountLoad({ label: "Resource Nodes" });
    const activeWorld = van.state(1);
    const nodes = van.state([]);
    const gradeStates = new Map();
    const depletedStates = new Map();
    const rowNodes = new Map();
    const rowList = div({ class: "account-item-stack account-item-stack--dense resource-node-list" });
    const noNodes = EmptyState({
        icon: Icons.SearchX(),
        title: "NO RESOURCE NODES",
        subtitle: "No RoyalResources rows were returned for this world.",
    });

    const renderRows = () => {
        const visible = nodes.val.filter((node) => node.world === activeWorld.val);
        rowList.replaceChildren(...visible.map((node) => rowNodes.get(node.nodeIndex)));
        return visible.length ? rowList : noNodes;
    };

    const bodyContent = div();

    van.derive(() => {
        activeWorld.val;
        nodes.val;
        bodyContent.replaceChildren(renderRows());
    });

    const load = () =>
        runLoad(async () => {
            const nextNodes = await readNodes();

            nextNodes.forEach((node) => {
                const gradeState = getOrCreateState(gradeStates, node.nodeIndex);
                const depletedState = getOrCreateState(depletedStates, node.nodeIndex);
                gradeState.val = node.grade;
                depletedState.val = node.depleted;

                rowNodes.set(
                    node.nodeIndex,
                    NodeRow({
                        node,
                        gradeState,
                        depletedState,
                    })
                );
            });

            nodes.val = nextNodes;
        });

    load();

    return PersistentAccountListPage({
        title: "RESOURCE NODES",
        description: "Manage Royal Guard resource node grades and depleted state.",
        wrapActions: false,
        actions: BulkActionBar({
            refresh: {
                onClick: load,
                tooltip: "Re-read Royal resource nodes from the running game.",
                disabled: () => loading.val,
            },
        }),
        state: { loading, error },
        loadingText: "READING RESOURCE NODES",
        errorTitle: "RESOURCE NODES READ FAILED",
        initialWrapperClass: "masterclass-upgrade-scroll",
        body: div(
            { class: "masterclass-upgrade-scroll scrollable-panel" },
            AccountSection({
                title: "NODE WORLDS",
                body: [
                    div(
                        { class: "masterclass-category-tabs" },
                        ...Array.from({ length: WORLD_COUNT }, (_, index) => {
                            const world = index + 1;
                            return button(
                                {
                                    type: "button",
                                    class: () =>
                                        `masterclass-category-tabs__button${
                                            activeWorld.val === world ? " is-active" : ""
                                        }`,
                                    onclick: () => {
                                        activeWorld.val = world;
                                    },
                                },
                                `W${world}`
                            );
                        })
                    ),
                    bodyContent,
                ],
            }),
        ),
    });
};
