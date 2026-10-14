// ─────────────────────────────────────────────────────────────
// state.js — state management
//
// A store is ONE object holding everything the app knows right now.
// Anyone who has the store can read it (getState), change it
// (setState) or ask to be told about changes (subscribe).
// ─────────────────────────────────────────────────────────────

export function createStore(initialState) {
    let state = initialState;
    const listeners = [];

    function getState() {
        return state;
    }

    // setState({ filter: "done" })            -> merge these changes
    // setState((s) => ({ count: s.count + 1 })) -> compute them from the old state
    function setState(changes) {
        const next = typeof changes === "function" ? changes(state) : changes;
        state = { ...state, ...next };
        listeners.slice().forEach((fn) => fn(state));
    }

    // subscribe(fn): fn(state) is called after every change.
    // It returns a function that cancels the subscription.
    function subscribe(fn) {
        listeners.push(fn);
        return () => {
            const i = listeners.indexOf(fn);
            if (i !== -1) {
                listeners.splice(i, 1);
            }
        };
    }

    return { getState, setState, subscribe };
}
