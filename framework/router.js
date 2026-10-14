// ─────────────────────────────────────────────────────────────
// router.js — routing: keeping the URL and the state in sync
//
//   URL   -> state : the part after "#" is copied into state.route
//   state -> URL   : navigate("/active") changes the URL
//
// Hash routing ("index.html#/active") never reloads the page, and the
// browser's back / forward buttons work for free.
// ─────────────────────────────────────────────────────────────

function currentPath() {
    const path = location.hash.slice(1);      // "#/active" -> "/active"
    if (path === "") {
        return "/";
    }
    return path.startsWith("/") ? path : "/" + path;
}

export function createRouter(store) {
    function sync() {
        store.setState({ route: currentPath() });
    }

    // The browser fires "hashchange" on link clicks, back/forward and when
    // the address bar changes. (Internal use only: framework users never
    // call addEventListener themselves.)
    window.addEventListener("hashchange", sync);
    sync();   // read the URL once at startup
}

export function navigate(path) {
    location.hash = path;
}
