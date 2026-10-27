/* localStorage wrapper. Falls back to memory when storage is blocked (private mode, file restrictions). */
const Store = {
  state: null,
  persistent: true,

  init() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORE_KEY));
    } catch (e) {
      this.persistent = false;
    }
    this.state = saved && saved.v === 1 ? saved : seedState();
    this.save();
    return this.state;
  },

  save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(this.state));
    } catch (e) {
      this.persistent = false;
    }
  },

  reset() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    this.state = seedState();
    this.save();
    return this.state;
  }
};
