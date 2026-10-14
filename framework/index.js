// ─────────────────────────────────────────────────────────────
// index.js — the front door of the framework
//
// Import everything from here:
//   import { h, createStore, createApp, createRouter } from "../framework/index.js";
// ─────────────────────────────────────────────────────────────
import { createElement, patchChildren, toChildren } from "./dom.js";

export { h, mount, createElement, patch } from "./dom.js";
export { createStore } from "./state.js";
export { createRouter, navigate } from "./router.js";
export { addHandler, removeHandler } from "./events.js";

// createApp wires everything into one loop:
//
//   user action -> handler -> store.setState -> render -> view(state)
//                                                  -> diff -> real DOM
//
// The framework calls YOUR view function whenever the state changes
// (inversion of control).
//
//   root        the real element to draw into
//   store       made with createStore
//   view        (state) => one element description (or an array of them)
//   afterRender optional (state) => {} called after each draw, for things
//               the description can't express (e.g. moving focus)
export function createApp({ root, store, view, afterRender }) {
    let oldKids = null;

    function render() {
        const state = store.getState();
        const newKids = toChildren([view(state)]);

        if (oldKids === null) {
            root.textContent = "";
            for (const kid of newKids) {
                root.appendChild(createElement(kid));
            }
        } else {
            patchChildren(root, oldKids, newKids);
        }

        oldKids = newKids;

        if (afterRender) {
            afterRender(state);
        }
    }

    store.subscribe(render);
    render();
}
