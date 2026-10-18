import { isUIExpanded } from "./overlay.js";

let menu = null;
let timer = null;
export function configureSushiButtons(showSort, showPlay, command, getState) {
    if (timer) clearInterval(timer);
    if (menu) menu.remove();
    menu = null;
    timer = null;
    if (!showSort && !showPlay) return;
    const styleId = "sushi-native-buttons-style";
    if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `#sushi-native-buttons{position:fixed;right:12px;top:55vh;z-index:999999;width:210px;padding:8px;background:#171b22;color:#f4e8c2;border:1px solid #b89031;border-radius:6px;font:12px Arial;}
#sushi-native-buttons .actions{display:flex;gap:8px;}#sushi-native-buttons button{flex:1;padding:8px;color:#ffd76c;background:#343126;border:1px solid #e4af36;border-radius:4px;cursor:pointer;}#sushi-native-buttons button:disabled{opacity:.5;}#sushi-native-buttons p{margin:8px 0 0;overflow-wrap:anywhere;}`;
        document.head.appendChild(style);
    }
    menu = document.createElement("div");
    menu.id = "sushi-native-buttons";
    const actions = document.createElement("div");
    actions.className = "actions";
    const sort = document.createElement("button");
    sort.type = "button";
    sort.textContent = "Sort";
    sort.hidden = !showSort;
    const play = document.createElement("button");
    play.type = "button";
    play.textContent = "Auto Play";
    play.hidden = !showPlay;
    const status = document.createElement("p");
    status.setAttribute("role", "status");
    actions.append(sort, play);
    menu.append(actions, status);
    document.body.appendChild(menu);
    let feedback = "";
    function act(action) {
        try {
            command(action);
            feedback = "";
        } catch (error) {
            feedback = error.message;
        }
        update();
    }
    sort.onclick = () => act("sort");
    play.onclick = () => act(getState().busy ? "stop" : "start");
    function update() {
        const state = getState();
        menu.hidden = isUIExpanded() || (!!state.error && !state.busy);
        sort.disabled = state.busy || !!state.error;
        play.disabled = state.stopping || (!state.busy && !!state.error);
        play.textContent = state.busy ? (state.stopping ? "Stopping…" : "Stop") : "Auto Play";
        status.textContent = feedback || state.error || state.message;
    }
    update();
    timer = setInterval(update, 250);
}
