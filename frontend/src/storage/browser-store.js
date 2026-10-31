import { STORE_KEY, seedState } from './initial-state.js';
/* localStorage wrapper. Falls back to memory when storage is blocked (private mode, file restrictions). */
export const Store = {
  state: null,
  persistent: true,

  init() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORE_KEY));
    } catch (e) {
      this.persistent = false;
    }
    const validEntity = item => item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.phone === 'string';
    const valid = saved && saved.v === 1 && saved.settings && typeof saved.settings === 'object'
      && Array.isArray(saved.providers) && saved.providers.every(p => validEntity(p) && Array.isArray(p.slots))
      && Array.isArray(saved.pharmacies) && saved.pharmacies.every(p => validEntity(p) && p.stock && typeof p.stock === 'object')
      && Array.isArray(saved.bookings) && saved.bookings.every(b => b && typeof b.id === 'string' && typeof b.pid === 'string' && typeof b.date === 'string' && typeof b.time === 'string');
    this.state = valid ? saved : seedState();
    this.state.settings = { ...seedState().settings, ...this.state.settings };
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
