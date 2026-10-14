// ─────────────────────────────────────────────────────────────
// events.js — our own event system (no addEventListener for users)
//
// Users write   onclick: someFunction   inside an element's attributes.
// We keep a "guest book" (registry) of which element wants which
// function, and ONE listener per event type on the document acts as a
// receptionist: it finds the element that was hit, walks up through its
// parents, and calls the functions it finds in the guest book.
// ─────────────────────────────────────────────────────────────

// element -> { click: fn, keydown: fn, ... }
// A WeakMap forgets an element automatically once it leaves the page.
const registry = new WeakMap();

// which event types already have a document listener, e.g. { click: true }
const listening = {};

function dispatch(event) {
    let node = event.target;
    while (node) {
        const handlers = registry.get(node);
        if (handlers && handlers[event.type]) {
            handlers[event.type](event);
            // if a handler called event.stopPropagation(), stop walking up
            if (event.cancelBubble) {
                return;
            }
        }
        node = node.parentNode;
    }
}

export function addHandler(el, type, fn) {
    const handlers = registry.get(el) || {};
    handlers[type] = fn;
    registry.set(el, handlers);

    if (!listening[type]) {
        // "true" = capture phase, so events that normally don't bubble
        // (focus, blur, scroll...) still reach us.
        document.addEventListener(type, dispatch, true);
        listening[type] = true;
    }
}

export function removeHandler(el, type) {
    const handlers = registry.get(el);
    if (handlers) {
        delete handlers[type];
    }
}
