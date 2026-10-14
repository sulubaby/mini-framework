// ═════════════════════════════════════════════════════════════
// TodoMVC — built ONLY with our own framework (see ../framework/)
//
// The file has five parts, top to bottom:
//   1. imports
//   2. STATE      what the app remembers
//   3. ACTIONS    the things a user can do (each one just changes state)
//   4. VIEW       a function that turns the state into a page description
//   5. START      hand everything to the framework, which runs the loop
//
// The loop:  click/keypress -> action -> store.setState -> framework
//            calls view(state) -> framework updates the real page
// ═════════════════════════════════════════════════════════════

// ───────── 1. IMPORTS ─────────
// Everything we need comes through the framework's single front door.
import { h, createStore, createApp, createRouter } from "../framework/index.js";


// ───────── 2. STATE ─────────

// localStorage is the browser's small notebook that survives reloads.
// It can throw errors (private windows, blocked storage), so every use
// is wrapped in try/catch: if it fails we just carry on without saving.
const STORAGE_KEY = "mini-framework-todos";

function loadTodos() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return Array.isArray(saved) ? saved : [];
    } catch (error) {
        return [];
    }
}

function saveTodos(todos) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (error) {
        // nothing to do: the app still works, it just won't remember
    }
}

// The chosen theme ("light" or "dark") is remembered the same way.
// Until the user picks one, the page simply follows the computer's setting
// (index.html works that out before the page is drawn).
const THEME_KEY = "mini-framework-theme";

function saveTheme(theme) {
    try {
        localStorage.setItem(THEME_KEY, theme);
    } catch (error) {
        // not saved: the theme still works for this visit
    }
}

const savedTodos = loadTodos();

// Each todo looks like: { id: 3, title: "Buy milk", completed: false }
// nextId gives every new todo a number nobody else has.
let nextId = savedTodos.reduce((max, todo) => Math.max(max, todo.id), 0) + 1;

// The ONE store. Every piece of information the page needs is in here:
const store = createStore({
    todos: savedTodos,   // the list
    newTodo: "",         // text typed in the top input box
    editingId: null,     // id of the todo being edited (null = none)
    editText: "",        // text typed in the edit box
    route: "/",          // "/" , "/active" or "/completed" (kept in sync with the URL)
    // "light" or "dark". index.html already put the right value on the <html>
    // element before the page appeared, so we just read it from there.
    theme: document.documentElement.dataset.theme === "dark" ? "dark" : "light"
});

// Save the list whenever it changes. We only compare the list itself:
// typing in the input changes the state too, but that must not trigger a save.
// (This works because we never edit a list — we always build a NEW one.)
let lastSaved = store.getState().todos;
store.subscribe((state) => {
    if (state.todos !== lastSaved) {
        lastSaved = state.todos;
        saveTodos(state.todos);
    }
});

// Same idea for the theme: save it only when it really changed.
let lastTheme = store.getState().theme;
store.subscribe((state) => {
    if (state.theme !== lastTheme) {
        lastTheme = state.theme;
        saveTheme(state.theme);
    }
});


// ───────── 3. ACTIONS ─────────
// Each action reads the current state with getState() and writes the new
// one with setState(). Notice we never modify an array or object in place:
// map / filter / [...spread] all create NEW ones.

function addTodo() {
    const { todos, newTodo } = store.getState();
    const title = newTodo.trim();          // trim() removes spaces at both ends
    if (title === "") {
        return;                            // ignore empty todos
    }
    store.setState({
        todos: [...todos, { id: nextId++, title: title, completed: false }],
        newTodo: ""                        // empty the input box again
    });
}

function toggleTodo(id) {
    const { todos } = store.getState();
    store.setState({
        // keep every todo as it is, except the one with this id: flip "completed"
        todos: todos.map((todo) =>
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
        )
    });
}

function toggleAll(completed) {
    const { todos } = store.getState();
    store.setState({
        todos: todos.map((todo) => ({ ...todo, completed: completed }))
    });
}

function removeTodo(id) {
    const { todos } = store.getState();
    store.setState({
        todos: todos.filter((todo) => todo.id !== id)   // keep everything except this one
    });
}

function clearCompleted() {
    const { todos } = store.getState();
    store.setState({
        todos: todos.filter((todo) => !todo.completed)  // keep only the unfinished ones
    });
}

function toggleTheme() {
    const next = store.getState().theme === "dark" ? "light" : "dark";
    const change = () => store.setState({ theme: next });

    // Modern browsers can cross-fade between the old and the new look.
    // Where that isn't available (or the user prefers less motion), just switch.
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (document.startViewTransition && !reduceMotion) {
        document.startViewTransition(change);
    } else {
        change();
    }
}

function startEditing(todo) {
    store.setState({ editingId: todo.id, editText: todo.title });
}

function cancelEditing() {
    store.setState({ editingId: null, editText: "" });
}

function finishEditing(id) {
    const { todos, editingId, editText } = store.getState();

    // Pressing Enter AND leaving the box both call this function, so it can
    // run twice. If we are no longer editing this todo, there is nothing to do.
    if (editingId !== id) {
        return;
    }

    const title = editText.trim();

    if (title === "") {
        // an emptied todo is deleted
        store.setState({
            todos: todos.filter((todo) => todo.id !== id),
            editingId: null,
            editText: ""
        });
    } else {
        store.setState({
            todos: todos.map((todo) => (todo.id === id ? { ...todo, title: title } : todo)),
            editingId: null,
            editText: ""
        });
    }
}


// ───────── 4. VIEW ─────────
// view(state) answers one question: "given this state, what should the
// page look like?" It returns a description made with h(tag, attrs, ...children).
// It never touches the real page — the framework does that.

// One row of the list. Written as its own function to keep view() readable.
function todoItem(todo, state) {
    const isEditing = state.editingId === todo.id;

    // build the class list: "completed", "editing", both, or neither
    const classes = [todo.completed && "completed", isEditing && "editing"]
        .filter(Boolean)     // throw away the false entries
        .join(" ");

    return h("li", { class: classes || undefined, "data-id": String(todo.id) },

        // the normal look of the row
        h("div", { class: "view" },
            h("input", {
                type: "checkbox",
                class: "toggle",
                checked: todo.completed,
                onchange: () => toggleTodo(todo.id)
            }),
            h("label", { ondblclick: () => startEditing(todo) }, todo.title),
            h("button", { class: "destroy", onclick: () => removeTodo(todo.id) })
        ),

        // the box shown instead while editing (hidden by CSS otherwise)
        h("input", {
            class: "edit",
            value: isEditing ? state.editText : todo.title,
            oninput: (event) => store.setState({ editText: event.target.value }),
            onkeydown: (event) => {
                if (event.key === "Enter") {
                    finishEditing(todo.id);
                } else if (event.key === "Escape") {
                    cancelEditing();
                }
            },
            onblur: () => finishEditing(todo.id)    // clicking elsewhere saves
        })
    );
}

// One link in the filter bar. "selected" marks the current page.
function filterLink(label, path, route) {
    return h("li", {},
        h("a", { class: route === path ? "selected" : undefined, href: "#" + path }, label)
    );
}

function view(state) {
    const { todos, newTodo, route, theme } = state;

    // numbers we need for the page, worked out from the state
    const activeTodos = todos.filter((todo) => !todo.completed);
    const completedCount = todos.length - activeTodos.length;
    const allDone = todos.length > 0 && activeTodos.length === 0;

    // which todos to show depends on the route (the URL)
    let visibleTodos = todos;
    if (route === "/active") {
        visibleTodos = activeTodos;
    } else if (route === "/completed") {
        visibleTodos = todos.filter((todo) => todo.completed);
    }

    // The page is THREE sibling pieces, so we return a list: the app card,
    // the small footer with instructions, and the round theme button.
    // All of them are drawn into #app.
    return [
        h("section", {
            class: "todoapp",
            // a CSS variable the stylesheet uses to draw the progress bar
            style: "--progress: " + (todos.length ? completedCount / todos.length : 0),
            "data-all-done": allDone ? "true" : undefined
        },

            // ── top: title + "new todo" input ──
            h("header", { class: "header" },
                h("h1", {}, "todos"),
                h("input", {
                    class: "new-todo",
                    placeholder: "What needs to be done?",
                    autofocus: true,
                    value: newTodo,        // the box always shows what the state says
                    oninput: (event) => store.setState({ newTodo: event.target.value }),
                    onkeydown: (event) => {
                        if (event.key === "Enter") {
                            addTodo();
                        }
                    }
                })
            ),

            // ── middle: the list. `cond && h(...)` draws nothing when cond is false ──
            todos.length > 0 && h("section", { class: "main" },
                h("input", {
                    id: "toggle-all",
                    class: "toggle-all",
                    type: "checkbox",
                    checked: allDone,
                    onchange: () => toggleAll(!allDone)
                }),
                h("label", { for: "toggle-all" }, "Mark all as complete"),
                h("ul", { class: "todo-list" },
                    // turn each todo into an <li>; the framework flattens the list for us
                    visibleTodos.map((todo) => todoItem(todo, state))
                )
            ),

            // ── bottom: counter, filters, "clear completed" ──
            todos.length > 0 && h("footer", { class: "footer" },
                h("span", { class: "todo-count" },
                    h("strong", {}, activeTodos.length),
                    activeTodos.length === 1 ? " item left" : " items left"
                ),
                h("ul", { class: "filters" },
                    filterLink("All", "/", route),
                    filterLink("Active", "/active", route),
                    filterLink("Completed", "/completed", route)
                ),
                // only exists when at least one todo is completed
                completedCount > 0 && h("button", {
                    class: "clear-completed",
                    onclick: clearCompleted
                }, "Clear completed")
            )
        ),

        h("footer", { class: "info" },
            h("p", {}, "Double-click to edit a todo"),
            h("p", {}, "Built from scratch with our own mini-framework"),
            h("p", {}, "Part of ", h("a", { href: "http://todomvc.com" }, "TodoMVC"))
        ),

        // Light / dark switch. The icon (moon or sun) is drawn by the CSS;
        // here we only set the text that screen readers and tooltips use.
        h("button", {
            type: "button",
            class: "theme-toggle",
            title: theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
            "aria-label": theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
            onclick: toggleTheme
        })
    ];
}


// ───────── 5. START ─────────

// Things the description can't say, like "put the cursor in this box".
// The framework calls this after every redraw.
function afterRender(state) {
    // The theme is a switch on the <html> element, which is outside the part
    // of the page our view draws, so we set it here. The CSS does the rest:
    // it has one set of colours for data-theme="light" and one for "dark".
    document.documentElement.dataset.theme = state.theme;

    if (state.editingId !== null) {
        const input = document.querySelector(".todo-list li.editing .edit");
        if (input && document.activeElement !== input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length); // cursor at the end
        }
    }
}

// 1) connect the URL to the state (sets state.route, keeps it updated)
createRouter(store);

// 2) hand the store and the view to the framework. From now on the
//    framework calls view(state) every time the state changes.
createApp({
    root: document.getElementById("app"),
    store: store,
    view: view,
    afterRender: afterRender
});

// put the cursor in the "new todo" box when the page opens
document.querySelector(".new-todo").focus();
