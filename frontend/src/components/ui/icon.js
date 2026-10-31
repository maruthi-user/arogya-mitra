import { escapeHtml } from '../../utils/html.js';
const paths={
  patient:'<circle cx="12" cy="7" r="4"/><path d="M5 21v-3a7 7 0 0 1 14 0v3"/>',
  provider:'<path d="M5 3v6a4 4 0 0 0 8 0V3M3 3h4m4 0h4m-6 10v3a5 5 0 0 0 10 0v-2"/><circle cx="19" cy="11" r="3"/>',
  admin:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m9 12 2 2 4-5"/>',
  home:'<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-12 4h2m3 0h2"/>',
  search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
  medicine:'<path d="m8 4-4 4a6 6 0 0 0 8 8l4-4A6 6 0 0 0 8 4Z"/><path d="m6 6 8 8"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  mic:'<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8"/>',
  settings:'<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
  logout:'<path d="M9 4H4v16h5m5-12 4 4-4 4m-6-4h12"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 6 9 7 9-7"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  ambulance:'<path d="M3 6h12v13H3Z"/><path d="M15 11h4l3 4v4h-7M6 10h6m-3-3v6"/><circle cx="6" cy="20" r="2"/><circle cx="19" cy="20" r="2"/>',
  stock:'<path d="m3 7 9-4 9 4v12l-9 3-9-3V7Zm0 0 9 4 9-4m-9 4v11"/>',
  audit:'<path d="M6 3h12v18H6Z"/><path d="M9 7h6m-6 5h6m-6 5h4"/>'
};
export function Icon(name){return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.home}</svg>`;}
