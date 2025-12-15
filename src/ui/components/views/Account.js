import van from '../../van-1.6.0.js';
import store from '../../store.js';
import { Loader } from '../Loader.js';
import { debounce } from '../../utils.js';

const { div, button, input, label, span, p, h3 } = van.tags;

export const Account = () => {
    const isUnlocked = van.state(false);
    const filterText = van.state("");
    const hideAI = van.state(false);

    // We bind explicitly to these dependencies for the Main View
    const dependencies = van.derive(() => {
        return {
            unlocked: isUnlocked.val,
            loading: store.isLoading.val,
            data: store.accountOptions.val,
            schema: store.accountSchema.val
        };
    });

    const handleLoad = () => {
        isUnlocked.val = true;
        if (!store.accountOptions.val) {
            store.loadAccountOptions();
        }
    };

    return div({ id: 'options-account-tab', class: 'tab-pane active' },
        () => {
            const state = dependencies.val;

            // LOCKED STATE
            if (!state.unlocked) {
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

            // LOADING STATE
            if (state.loading) {
                return div({ style: 'display:flex; height:100%; align-items:center; justify-content:center;' },
                    Loader({ text: "DECRYPTING..." })
                );
            }

            // UNLOCKED & LOADED
            return div({ style: 'height: 100%; display: flex; flex-direction: column;' },
                div({ class: 'danger-zone-header' }, "ACCESSING RAW GAME ATTRIBUTES."),

                // Controls
                div({ class: 'control-bar' },
                    button({ class: 'btn-secondary', onclick: () => store.loadAccountOptions() }, "REFRESH"),
                    div({ class: 'spacer', style: 'flex:1' }),
                    label({ class: 'toggle-switch' },
                        input({ type: 'checkbox', onchange: e => hideAI.val = e.target.checked }),
                        span({ class: 'slider' }),
                        span({ class: 'label' }, "HIDE AI")
                    ),
                    input({
                        type: 'text',
                        class: 'compact-input',
                        placeholder: 'FILTER_INDEX...',
                        style: 'width: 200px; margin-left: 15px;',
                        oninput: debounce(e => filterText.val = e.target.value, 300)
                    })
                ),

                // Content List
                div({ id: 'options-account-content', class: 'scroll-container', style: 'flex: 1;' },
                    () => {
                        const data = state.data;
                        if (!data) return div({ style: 'padding:20px; color: red;' }, "ERROR: Data is null");

                        // Perform filtering inside the render to ensure we catch updates
                        const term = filterText.val.toLowerCase();
                        const hide = hideAI.val;
                        const schema = state.schema || {};

                        const items = [];
                        data.forEach((val, index) => {
                            const sch = schema[index];
                            if (hide && sch && sch.AI) return;
                            if (term) {
                                const name = (sch && sch.name ? sch.name : `UNDOCUMENTED ${index}`).toLowerCase();
                                if (!name.includes(term) && !index.toString().includes(term)) return;
                            }

                            // Render Item
                            items.push(OptionItem(index, val, sch));
                        });

                        if (items.length === 0) return div({ style: 'padding:20px' }, "NO MATCHES");
                        return div(items);
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

    const currentVal = van.state(normalizedInit);
    const status = van.state(null);

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
                    ? div({ class: 'number-input-wrapper' },
                        button({
                            class: 'number-input-btn',
                            onclick: () => currentVal.val = Number(currentVal.val) - 1
                        }, "-"),
                        input({
                            type: 'number',
                            class: 'option-input',
                            value: currentVal,
                            oninput: e => currentVal.val = e.target.value,
                            style: 'text-align: center;'
                        }),
                        button({
                            class: 'number-input-btn',
                            onclick: () => currentVal.val = Number(currentVal.val) + 1
                        }, "+")
                    )
                    : input({ type: 'text', class: 'option-input', value: currentVal, oninput: e => currentVal.val = e.target.value }),
            button({ class: 'option-apply-button', onclick: handleApply }, "SET")
        )
    );
};