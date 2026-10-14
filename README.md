# mini-framework

A small JavaScript framework written from scratch (no React, Angular, Vue or any other library), plus a
complete **TodoMVC** app built with it.

It gives you four things:

| Feature | What it does | File |
|---|---|---|
| **DOM abstraction** | Describe the page as plain JavaScript objects; the framework draws it and updates only what changed (a "virtual DOM") | `framework/dom.js` |
| **State management** | One store that holds everything the app knows and tells you when it changes | `framework/state.js` |
| **Event handling** | Write `onclick: fn` on any element; our own event system runs it (no `addEventListener` in your code) | `framework/events.js` |
| **Routing** | Keeps the URL (`#/active`) and the state in sync, both ways | `framework/router.js` |

---

## Contents

1. [Run it](#1-run-it)
2. [Folder structure](#2-folder-structure)
3. [Library vs framework: who is in control?](#3-library-vs-framework-who-is-in-control)
4. [Your first app in 2 minutes](#4-your-first-app-in-2-minutes)
5. [Creating elements](#5-creating-elements) · [attributes](#add-attributes-to-an-element) · [nesting](#nest-elements) · [lists & conditions](#lists-and-conditions)
6. [Creating events](#6-creating-events)
7. [State](#7-state)
8. [Routing](#8-routing)
9. [Putting it together: `createApp`](#9-putting-it-together-createapp)
10. [Why it works the way it works](#10-why-it-works-the-way-it-works)
11. [API reference](#11-api-reference)
12. [The TodoMVC app](#12-the-todomvc-app)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Run it

The app runs **from the root of this folder**. Browsers refuse to load JavaScript modules from a file
opened by double-click (`file://`), so serve the folder with any small web server. Pick one:

```bash
# Python (already installed on most computers)
python3 -m http.server 8000

# or Node
npx serve .
```

Then open **http://localhost:8000**.

*VS Code:* install the **Live Server** extension, right-click `index.html` → **Open with Live Server**.

---

## 2. Folder structure

```
mini-framework/
├── index.html          the page: an empty <div id="app"> and one script tag
├── README.md           this documentation
├── framework/          THE FRAMEWORK
│   ├── index.js        front door: import everything from here; contains createApp
│   ├── dom.js          h(), createElement(), patch()  -> DOM abstraction + diffing
│   ├── state.js        createStore()                  -> state management
│   ├── events.js       addHandler(), removeHandler()  -> event handling
│   └── router.js       createRouter(), navigate()     -> routing
└── todo/               AN APP BUILT WITH THE FRAMEWORK
    ├── app.js          the TodoMVC app (state, actions, view)
    └── styles.css      its design
```

The framework never imports anything from `todo/`. The app only imports from `framework/index.js`.

---

## 3. Library vs framework: who is in control?

With a **library** *you* call it: `library.doSomething()`.
With a **framework** the control is **inverted**: you describe *what* you want and the framework
decides *when* to run your code.

In mini-framework you hand over three things and never call them yourself:

| You write | The framework calls it... |
|---|---|
| a **view** function `(state) => page description` | every time the state changes |
| **handlers** like `onclick: fn` | when the user does that thing |
| **subscribers** `store.subscribe(fn)` | after every state change |

The loop that runs your app:

```
user clicks  ->  your handler  ->  store.setState(...)  ->  framework calls view(state)
      ^                                                              |
      |                                                              v
      └───────────── user sees the new page  <──  framework updates ONLY what changed
```

---

## 4. Your first app in 2 minutes

Create `counter.html` next to `index.html`:

```html
<!DOCTYPE html>
<html>
<body>
  <div id="app"></div>

  <script type="module">
    import { h, createStore, createApp } from "./framework/index.js";

    // 1. the state: everything the app knows
    const store = createStore({ count: 0 });

    // 2. the view: given the state, describe the page
    function view(state) {
      return h("div", { class: "counter" },
        h("h2", {}, "Count: " + state.count),
        h("button", {
          onclick: () => store.setState((s) => ({ count: s.count + 1 }))
        }, "+1")
      );
    }

    // 3. start: the framework now calls view() whenever the state changes
    createApp({ root: document.getElementById("app"), store, view });
  </script>
</body>
</html>
```

Open `http://localhost:8000/counter.html` and click the button. That's the whole framework in one
example: **state** (`createStore`), **DOM abstraction** (`h`), **events** (`onclick`).

---

## 5. Creating elements

### The idea

Instead of building real HTML elements by hand, you *describe* them with `h(tag, attributes, ...children)`.
It returns a plain object:

```js
h("div", { class: "box" }, "Hello")
```
```js
{ tag: "div", attrs: { class: "box" }, children: ["Hello"] }
```

That is exactly the object form of the DOM used by the project spec:

```html
<div class="nameSubm">
  <input type="text" placeholder="Insert Name" />
  <input type="submit" placeholder="Submit" />
</div>
```
```js
h("div", { class: "nameSubm" },
  h("input", { type: "text", placeholder: "Insert Name" }),
  h("input", { type: "submit", placeholder: "Submit" })
)
```

`h()` only *describes*. To put something on the page, use `createApp` (see section 9), or draw once with
`mount`:

```js
import { h, mount } from "./framework/index.js";
mount(h("p", {}, "Hello world"), document.getElementById("app"));
```

### Create an element

```js
h("h1", {}, "My title")              // <h1>My title</h1>
h("button", {}, "Click me")          // <button>Click me</button>
h("br")                              // <br>   (attributes can be left out)
h("p", "Short form")                 // <p>Short form</p>   (no attributes object needed)
```

### Add attributes to an element

The second argument is an object of `name: value`. Use the normal HTML attribute names.

```js
h("a",     { href: "https://example.com", target: "_blank" }, "A link")
h("input", { type: "text", placeholder: "Your name", id: "name" })
h("div",   { class: "card big", "data-id": "42" }, "…")     // quote names with a dash
h("label", { for: "name" }, "Name")
h("div",   { style: "color: red; font-size: 20px" }, "Red")
```

Special cases worth knowing:

| Attribute | Behaviour |
|---|---|
| `value` | Sets what an input *shows*. The page always shows what your state says (see "forms" in section 7). |
| `checked` | `true` / `false` — checks a checkbox. |
| `autofocus`, `disabled`, … | `true` adds the attribute, `false` / `undefined` / `null` removes it. |
| `class: undefined` | No `class` attribute at all (handy for "only sometimes"). |
| `onclick`, `onkeydown`, … | A **function** value is an event handler, not an attribute (section 6). |

### Nest elements

Everything after the attributes is a child. Children can be text or other `h()` results, nested as deep as
you like:

```js
h("div", { class: "card" },
  h("h2", {}, "Shopping"),
  h("ul", {},
    h("li", {}, "Milk"),
    h("li", {}, "Bread", h("strong", {}, " (fresh!)"))
  )
)
```
```html
<div class="card">
  <h2>Shopping</h2>
  <ul>
    <li>Milk</li>
    <li>Bread<strong> (fresh!)</strong></li>
  </ul>
</div>
```

### Lists and conditions

Children can also be **arrays**, and `false` / `null` / `undefined` draw nothing. So ordinary JavaScript
does the job:

```js
// a list: map() turns each item into an <li>
h("ul", {}, items.map((item) => h("li", {}, item)))

// a condition: `cond && h(...)` draws nothing when cond is false
h("div", {},
  state.loggedIn && h("p", {}, "Welcome back!"),
  state.items.length === 0 && h("p", {}, "Nothing here yet")
)

// either/or
state.done ? h("span", {}, "Done") : h("span", {}, "In progress")
```

Numbers are turned into text for you: `h("strong", {}, 3)` → `<strong>3</strong>`.
Text is always inserted as **text**, never as HTML, so user input can't inject markup.

---

## 6. Creating events

Give any element an attribute that starts with `on` and a **function** as its value:

```js
h("button", { onclick: () => console.log("clicked!") }, "Click me")
```

The name after `on` is the browser's event name: `onclick`, `ondblclick`, `onkeydown`, `onkeyup`,
`oninput`, `onchange`, `onblur`, `onfocus`, `onmouseover`, `onscroll`, …

Your function receives the browser's event object:

```js
// react to a key
h("input", {
  onkeydown: (event) => {
    if (event.key === "Enter") {
      console.log("Enter pressed");
    }
  }
})

// read what the user typed
h("input", {
  oninput: (event) => store.setState({ text: event.target.value })
})

// double click
h("label", { ondblclick: () => console.log("edit me") }, "Double-click me")
```

Handlers usually change the state, and the page updates by itself:

```js
h("button", { onclick: () => store.setState({ open: !store.getState().open }) }, "Toggle")
```

### How our event system works (and why it is not `addEventListener`)

You never call `addEventListener`. When the framework builds an element with `onclick: fn`, it writes
`element → { click: fn }` into a private registry. The framework keeps **one** listener per event type on
the whole document. When something is clicked it:

1. takes the element that was hit,
2. looks it up in the registry and calls its handler if it has one,
3. repeats for the parent, the grandparent… up to the top
   (so a click on text inside a button still reaches the button's `onclick`).

`event.stopPropagation()` works: the walk upwards stops. Because handlers live in a registry and not on
the elements, redrawing the page never loses or duplicates them.

---

## 7. State

The **state** is one object holding everything the app knows *right now*: the list, what is typed in a box,
which page is open. You create a **store** for it:

```js
import { createStore } from "./framework/index.js";

const store = createStore({ todos: [], filter: "all" });
```

| Call | Meaning |
|---|---|
| `store.getState()` | read the current state |
| `store.setState({ filter: "done" })` | change *only* these keys (the rest is kept) |
| `store.setState((s) => ({ n: s.n + 1 }))` | compute the change from the current state |
| `store.subscribe(fn)` | call `fn(state)` after every change; returns a function that unsubscribes |

```js
store.subscribe((state) => console.log("changed:", state));
store.setState({ filter: "done" });   // logs { todos: [], filter: "done" }
```

**The state is reachable everywhere.** Put the store in a module and import it wherever it's needed:

```js
// store.js
import { createStore } from "./framework/index.js";
export const store = createStore({ user: null, cart: [] });

// any other file
import { store } from "./store.js";
store.setState({ user: "Sara" });
```

**Update without mutating.** Always build a new array/object instead of editing the old one:

```js
store.setState({ todos: [...todos, newTodo] });                         // add
store.setState({ todos: todos.filter((t) => t.id !== id) });            // remove
store.setState({ todos: todos.map((t) => t.id === id ? { ...t, done: true } : t) }); // change one
```

### Forms: keep the input in the state

Inputs follow the state (and the state follows the input):

```js
h("input", {
  value: state.name,                                        // the box shows the state
  oninput: (e) => store.setState({ name: e.target.value })  // typing updates the state
})
```

Typing into a box never loses focus or text, because the framework only touches parts of the page
that changed.

---

## 8. Routing

Routing keeps the **URL** and the **state** in sync.

```js
import { createRouter, navigate } from "./framework/index.js";

const store = createStore({ route: "/" });
createRouter(store);   // call this BEFORE createApp
```

- **URL → state:** the part after `#` is copied into `state.route`. Opening `index.html#/about`, clicking a
  link, or pressing the browser's back/forward button all set `state.route` to `"/about"`.
- **State → URL:** `navigate("/about")` changes the URL (which updates `state.route`).

Links need no JavaScript, an `href` starting with `#` is enough:

```js
function view(state) {
  return h("div", {},
    h("nav", {},
      h("a", { href: "#/" }, "Home"), " ",
      h("a", { href: "#/about", class: state.route === "/about" ? "selected" : undefined }, "About")
    ),
    state.route === "/about" ? h("p", {}, "About page") : h("p", {}, "Home page"),
    h("button", { onclick: () => navigate("/about") }, "Go to About")
  );
}
```

`state.route` is ordinary state, so any part of the app can read it. The empty URL is `"/"`.

---

## 9. Putting it together: `createApp`

```js
createApp({
  root:        document.getElementById("app"),  // where to draw
  store:       store,                           // from createStore
  view:        view,                            // (state) => description (or an array of them)
  afterRender: (state) => { /* optional */ }    // runs after each redraw
});
```

On every state change the framework runs `view(state)`, compares the result with the previous result
and changes only the parts of the real page that differ.
`afterRender` is for things a description cannot express, such as moving the cursor into a box or
changing something outside `root` (the TodoMVC uses it to set the light/dark theme on `<html>`).

`view` may return one element or an **array** of elements (they become siblings inside `root`).

---

## 10. Why it works the way it works

**The page is described with plain objects.**
Objects are cheap to build, easy to compare and easy to inspect with `console.log`. Real DOM elements are
heavy and slow to change. It is also the structure the project asks for: `tag`, `attrs`, `children`.

**`view` is a function of the state.**
The page is always *calculated from* the state, never edited by hand, so the screen cannot drift out of
sync with the data. To change the page you change the state.

**Diffing instead of redrawing everything.**
After each change we compare the new description with the old one and touch the real page only where they
differ. This keeps the text you are typing, the focus and the scroll position, and is much faster than
rebuilding the whole page. Children are matched by position.

**One event listener on the document.**
A registry maps elements to handlers and a single listener per event type dispatches them. It never
loses handlers when elements are replaced and the user's code never calls `addEventListener`.
New handler functions are re-registered on every redraw, so they never use stale data.

**State is replaced, not mutated.**
Every `setState` creates a new state object. Subscribers can cheaply tell what changed
(`if (state.todos !== lastSaved)`), and nothing changes behind the framework's back.

**Hash routing.**
`#/path` changes never reload the page, need no server configuration and give you back/forward buttons
for free.

---

## 11. API reference

Everything is exported from `framework/index.js`.

| Function | Description |
|---|---|
| `h(tag, attrs?, ...children)` | Describe an element → `{ tag, attrs, children }`. Children: text, numbers, `h()` results or arrays; `false`/`null`/`undefined` are ignored. |
| `createApp({ root, store, view, afterRender? })` | Draw `view(state)` into `root` and redraw (diffing) on every state change. |
| `createStore(initialState)` | → `{ getState, setState, subscribe }`. |
| `createRouter(store)` | Sync `state.route` with the URL hash. Call before `createApp`. |
| `navigate(path)` | Change the URL hash, e.g. `navigate("/active")`. |
| `mount(vnode, container)` | Draw a description once (no updates). |
| `createElement(vnode)` | Description → real DOM element. |
| `patch(parent, oldVnode, newVnode, index?)` | Update the real DOM so it matches `newVnode`. Used by `createApp`. |
| `addHandler(el, type, fn)` / `removeHandler(el, type)` | The event registry. Used by the framework; you normally use `onclick: fn` instead. |

---

## 12. The TodoMVC app

`todo/app.js` is a full TodoMVC built only with the framework, and `todo/styles.css` is its design
("paper on a desk", with light and dark mode). The markup uses the standard TodoMVC classes and ids:
`todoapp`, `header`, `new-todo`, `main`, `toggle-all`, `todo-list`, `view`, `toggle`, `destroy`, `edit`,
`completed`, `editing`, `footer`, `todo-count`, `filters`, `selected`, `clear-completed`, `info`.

What it does:

- **Add** with Enter (text is trimmed, empty is ignored)
- **Complete** a todo with its checkbox; **mark all** with the arrow
- **Edit** by double-clicking: Enter or clicking away saves, Escape cancels, an empty text deletes the todo
- **Delete** with the × (shown on hover)
- **Counter** ("1 item left" / "3 items left") and **Clear completed** (only when there is something to clear)
- **Filters** All / Active / Completed, kept in the URL (`#/`, `#/active`, `#/completed`)
- The list is **saved in localStorage** and survives a reload
- **Light / dark mode**: the round button in the top-right corner switches theme. Until you press it the page follows
  your computer's setting; after that it remembers your choice
- `main` and `footer` appear only when there are todos

State shape:

```js
{
  todos: [{ id: 1, title: "Buy milk", completed: false }],
  newTodo: "",      // text in the top input
  editingId: null,  // id of the todo being edited
  editText: "",     // text in the edit input
  route: "/",       // "/", "/active" or "/completed" (from the URL)
  theme: "light"    // "light" or "dark"
}
```

### How the theme switch works

It is a nice example of using the framework's pieces together:

1. `theme` is ordinary **state**. The button's `onclick` calls `store.setState({ theme: ... })`.
2. The `<html>` element is outside the part of the page that `view` draws, so the **`afterRender`** hook writes
   `document.documentElement.dataset.theme = state.theme` after each draw.
3. The CSS has one set of colour variables for `:root` (light) and another for `:root[data-theme="dark"]`.
   Every other rule uses `var(--paper)`, `var(--ink)`… so nothing else changes.
4. A subscriber saves the theme to `localStorage` when it changes, and a tiny script in `index.html` restores it
   *before* the page is drawn, so there is no flash of the wrong colours.

---

## 13. Troubleshooting

| Problem | Cause / fix |
|---|---|
| Blank page, console says *"CORS"* or *"Failed to load module script"* | You opened `index.html` by double-click. Serve it (section 1). |
| `404` for `dom` or `state` in the console | Import paths need the extension: `"./dom.js"`, not `"./dom"`. |
| `Cannot read properties of undefined` | A child is a plain object that isn't an `h()` result, or `view` returns nothing. `view` must return the description. |
| A click does nothing | The attribute must be a **function**: `onclick: () => doIt()`, not `onclick: doIt()`. |
| Page doesn't update | Change state with `setState`; editing an object or array in place isn't noticed. |
| `state.route` is always `"/"` | Call `createRouter(store)` and include `route` in the initial state. |
