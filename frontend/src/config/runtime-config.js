/* Public configuration only. Never put credentials in this file. */
export const config = Object.freeze((typeof window!=='undefined'&&window.APP_CONFIG) || {
  dataMode: 'api',
  apiBaseUrl: '/api'
});
