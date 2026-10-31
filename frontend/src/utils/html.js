export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
export function attributes(values = {}) {
  return Object.entries(values).filter(([,v]) => v !== undefined && v !== null && v !== false)
    .map(([key,value]) => {
      if (!/^[a-zA-Z][\w-]*$/.test(key) || /^on/i.test(key)) throw new Error('Invalid attribute');
      return value === true ? key : `${key}="${escapeHtml(value)}"`;
    }).join(' ');
}
