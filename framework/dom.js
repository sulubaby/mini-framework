// ─────────────────────────────────────────────────────────────
// dom.js — abstracting the DOM (a small "virtual DOM")
//
//   1. h()            describe an element as a plain object
//   2. createElement  turn that description into a real element
//   3. patch          compare old and new descriptions and update the
//                     real page only where something changed
// ─────────────────────────────────────────────────────────────
import { addHandler, removeHandler } from "./events.js";

/* ───────── 1. Describing elements ───────── */

// Is this value an attributes object (and not a child)?
function isAttrs(value) {
    return value !== null
        && typeof value === "object"
        && !Array.isArray(value)
        && !("tag" in value);
}

// Clean up a list of children:
//  - arrays are flattened      ( [a, b] inside the list  ->  a, b )
//  - null / undefined / false / true are dropped (conditional rendering)
//  - numbers become text
export function toChildren(list) {
    return list
        .flat(Infinity)
        .filter((child) => child !== null && child !== undefined
                        && child !== false && child !== true)
        .map((child) => (typeof child === "object" ? child : String(child)));
}

// h("div", { class: "box" }, "Hello")
//   -> { tag: "div", attrs: { class: "box" }, children: ["Hello"] }
export function h(tag, attrs, ...children) {
    if (!isAttrs(attrs)) {
        // the attrs argument was left out: h("p", "just text")
        if (attrs !== null && attrs !== undefined) {
            children.unshift(attrs);
        }
        attrs = {};
    }
    return { tag, attrs, children: toChildren(children) };
}

/* ───────── 2. Building real elements ───────── */

const isEvent = (name, value) => name.startsWith("on") && typeof value === "function";

// "value" and "checked" are special: what the user sees lives in a live
// DOM *property*, not in the HTML attribute, so we set the property too.
const PROPS = ["value", "checked"];

function setAttr(el, name, value) {
    if (name === "value") {
        const text = value === null || value === undefined ? "" : String(value);
        el.setAttribute("value", text);
        if (el.value !== text) {
            el.value = text;
        }
    } else if (name === "checked") {
        el.toggleAttribute("checked", Boolean(value));
        el.checked = Boolean(value);
    } else if (value === false || value === null || value === undefined) {
        el.removeAttribute(name);
    } else {
        el.setAttribute(name, value === true ? "" : value);
    }
}

function removeAttr(el, name) {
    if (name === "value") {
        el.removeAttribute("value");
        el.value = "";
    } else if (name === "checked") {
        el.removeAttribute("checked");
        el.checked = false;
    } else {
        el.removeAttribute(name);
    }
}

export function createElement(vnode) {
    // text
    if (typeof vnode === "string") {
        return document.createTextNode(vnode);
    }

    const el = document.createElement(vnode.tag);

    // attributes and events (value/checked wait until the children exist)
    for (const name in vnode.attrs) {
        const value = vnode.attrs[name];
        if (isEvent(name, value)) {
            addHandler(el, name.slice(2), value);   // "onclick" -> "click"
        } else if (!PROPS.includes(name)) {
            setAttr(el, name, value);
        }
    }

    // children, built the same way (recursion)
    for (const child of vnode.children) {
        el.appendChild(createElement(child));
    }

    for (const name of PROPS) {
        if (name in vnode.attrs) {
            setAttr(el, name, vnode.attrs[name]);
        }
    }

    return el;
}

// Draw a description inside a container, once.
export function mount(vnode, container) {
    container.appendChild(createElement(vnode));
}

/* ───────── 3. Diffing: update only what changed ───────── */

// Is the new node so different that the old real node can't be reused?
function changed(a, b) {
    return typeof a !== typeof b
        || (typeof a === "string" && a !== b)
        || a.tag !== b.tag;
}

function updateAttrs(el, oldAttrs, newAttrs) {
    for (const name in newAttrs) {
        const value = newAttrs[name];

        if (isEvent(name, oldAttrs[name]) && !isEvent(name, value)) {
            removeHandler(el, name.slice(2));
        }

        if (isEvent(name, value)) {
            // always refresh: the function is a new copy on every render
            addHandler(el, name.slice(2), value);
        } else if (PROPS.includes(name)) {
            // compare with what is really on screen, not with the old
            // description (the user may have typed or clicked in between)
            setAttr(el, name, value);
        } else if (oldAttrs[name] !== value) {
            setAttr(el, name, value);
        }
    }

    for (const name in oldAttrs) {
        if (!(name in newAttrs)) {
            if (isEvent(name, oldAttrs[name])) {
                removeHandler(el, name.slice(2));
            } else {
                removeAttr(el, name);
            }
        }
    }
}

// Compare two lists of children and patch the real children of `el`.
export function patchChildren(el, oldKids, newKids) {
    for (let i = 0; i < newKids.length; i++) {
        patch(el, oldKids[i], newKids[i], i);
    }

    // children that no longer exist are removed from the end,
    // counting backwards so positions don't shift under us
    for (let i = oldKids.length - 1; i >= newKids.length; i--) {
        el.removeChild(el.childNodes[i]);
    }
}

// Make the real child number `index` of `parent` look like `newNode`.
export function patch(parent, oldNode, newNode, index = 0) {
    const el = parent.childNodes[index];

    // nothing was here before: build it
    if (oldNode === undefined) {
        parent.appendChild(createElement(newNode));
        return;
    }

    // a different kind of node: swap it
    if (changed(oldNode, newNode)) {
        parent.replaceChild(createElement(newNode), el);
        return;
    }

    // identical text: nothing to do
    if (typeof newNode === "string") {
        return;
    }

    // same element: update its attributes, then compare its children
    updateAttrs(el, oldNode.attrs, newNode.attrs);
    patchChildren(el, oldNode.children, newNode.children);
}
