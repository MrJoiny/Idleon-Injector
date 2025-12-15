import van from '../../van-1.6.0.js';
import vanX from '../../van-x-0.6.3.js';
import store from '../../store.js';
import { Loader } from '../Loader.js';
import { debounce } from '../../utils.js';
import { NumberInput } from '../NumberInput.js';

const { div, button, input, label, span, p, h3 } = van.tags;

export const Account = () => {
    // Local Reactive UI State
    const ui = vanX.reactive({
        isUnlocked: false,
        filterText: "",
        hideAI: false,
        displayList: [] // We will push filtered items here for vanX.list
    });

    const handleLoad = () => {
        ui.isUnlocked = true;
        // Check length of reactive array
        if (!store.data.accountOptions.length) {
            store.loadAccountOptions();
        }
    };

    // Reactively update the displayList whenever dependencies change
    van.derive(() => {
        const data = store.data.accountOptions;
        const schema = store.data.accountSchema;
        const term = ui.filterText.toLowerCase();
        const hide = ui.hideAI;

        // Dependency check
        // Access lengths to ensure reactivity triggers on data changes
        const _len = data.length;

        if (!data || data.length === 0) {
            ui.displayList = [];
            return;
        }

        const results = [];
        // Standard loop for performance on large arrays
        for (let index = 0; index < data.length; index++) {
            const val = data[index];
            const sch = schema[index];

            if (hide && sch && sch.AI) continue;
            if (term) {
                const name = (sch && sch.name ? sch.name : `UNDOCUMENTED ${index}`).toLowerCase();
                // Search both Name and Index ID
                if (!name.includes(term) && !index.toString().includes(term)) continue;
            }

            // We push a proxy-friendly object. 
            // Note: vanX.list operates on the list itself. 
            results.push({ index, val, schema: sch });
        }
        ui.displayList = results;
    });

    return div({ id: 'options-account-tab', class: 'tab-pane' },
        () => {
            // Access properties to trigger dependency tracking
            if (!ui.isUnlocked) {
                return div({ class: 'modal-box', style: 'margin: 50px auto; max-width: 600px;' },
                    div({ class: 'modal-header' }, h3("⚠ CRITICAL WARNING")),
                    div({ class: 'modal-body' },
                        p("You are entering the Options List Editor."),
                        p("Modifying these indices directly bypasses game logic safety checks."),
                        p("Proceed with caution.")
                    ),
                    div({ class: 'modal-footer' },
                        button({ class: 'btn-danger', onclick: handleLoad }, "CONFIRM ACCESS")
                    )
                );
            }

            if (store.app.isLoading) {
                return div({ style: 'display:flex; height:100%; align-items:center; justify-content:center;' },
                    Loader({ text: "DECRYPTING..." })
                );
            }

            return div({ style: 'height: 100%; display: flex; flex-direction: column;' },
                div({ class: 'danger-zone-header' }, "ACCESSING RAW GAME ATTRIBUTES."),

                div({ class: 'control-bar' },
                    button({ class: 'btn-secondary', onclick: () => store.loadAccountOptions() }, "REFRESH"),
                    label({ class: 'toggle-switch', style: 'margin-left:25px;' },
                        input({
                            type: 'checkbox',
                            checked: () => ui.hideAI,
                            onchange: e => ui.hideAI = e.target.checked
                        }),
                        span({ class: 'slider' }),
                        span({ class: 'label' }, "HIDE AI")
                    ),
                    input({
                        type: 'text',
                        class: 'compact-input',
                        placeholder: 'FILTER_INDEX...',
                        style: 'width: 100%; margin-left: 15px;',
                        value: () => ui.filterText,
                        oninput: debounce(e => ui.filterText = e.target.value, 300)
                    })
                ),

                div({ id: 'options-account-content', class: 'scroll-container', style: 'flex: 1;' },
                    () => {
                        const items = ui.displayList; // Uses the same reactive list populated by derive
                        if (items.length === 0) return div({ style: 'padding:20px' }, "NO MATCHES");

                        // Explicit mapping creates fresh DOM nodes for every render cycle of the list
                        // This avoids VanX list reuse issues when data references change rapidly
                        return div({ style: 'display:flex; flex-direction:column;' },
                            items.map(item => OptionItem(item.index, item.val, item.schema))
                        );
                    }
                )
            );
        }
    );
};

const OptionItem = (index, rawVal, schema) => {
    // Determine type safely
    const type = typeof rawVal;
    const normalizedInit = (type === 'object' && rawVal !== null) ? JSON.stringify(rawVal) : rawVal;

    // We keep a local state for the input buffer (while typing)
    const currentVal = van.state(normalizedInit);
    const status = van.state(null);

    // Sync removed to prevent ghost inputs on list shift
    // We rely on 'normalizedInit' being fresh on component mount

    const handleApply = async () => {
        try {
            let val = currentVal.val;
            if (type === 'number') val = Number(val);
            else if (type === 'boolean') val = Boolean(val);
            else if (type === 'object') val = JSON.parse(val);

            await store.updateAccountOption(index, val);
            status.val = 'success';
            setTimeout(() => status.val = null, 1000);
        } catch (e) {
            status.val = 'error';
            setTimeout(() => status.val = null, 1000);
        }
    };

    const name = schema ? schema.name : 'UNDOCUMENTED INDEX';
    const desc = schema ? schema.description : null;
    const isAI = schema ? schema.AI : false;
    const warning = schema ? schema.warning : null;

    return div({
        class: () => `option-item ${isAI ? 'is-ai-option' : ''} ${warning ? 'has-warning' : ''} ${status.val === 'success' ? 'save-success' : ''} ${status.val === 'error' ? 'save-error' : ''}`,
        'data-index': index
    },
        div({ class: 'option-header' },
            div({ class: 'option-label' },
                isAI ? span({ style: 'color:var(--c-accent); font-size:0.75rem;' }, "AI_GEN // ") : null,
                name
            ),
            div({ class: 'option-index' }, `IDX::${index}`)
        ),
        warning ? div({ style: 'color:var(--c-warning); font-size:0.8rem; margin-bottom:8px;' }, `⚠ ${warning}`) : null,
        desc ? div({ class: 'option-description' }, desc) : null,
        div({ class: 'option-input-wrapper' },
            (type === 'boolean')
                ? input({ type: 'checkbox', class: 'option-input', checked: currentVal, onchange: e => currentVal.val = e.target.checked })
                : (type === 'number')
                    ? NumberInput({
                        class: 'option-input',
                        value: currentVal,
                        oninput: e => currentVal.val = e.target.value,
                        onDecrement: () => currentVal.val = Number(currentVal.val) - 1,
                        onIncrement: () => currentVal.val = Number(currentVal.val) + 1
                    })
                    : input({ type: 'text', class: 'option-input', value: currentVal, oninput: e => currentVal.val = e.target.value }),
            button({ class: 'option-apply-button', onclick: handleApply }, "SET")
        )
    );
};