import { Store } from '../storage/browser-store.js';
export function createAppState() {
  const local = Store.init();
  const settings=local.settings;settings.role=null;settings.patientId=null;settings.providerId=null;
  return {settings,session:{role:'anonymous'},providers:[],pharmacies:[],bookings:[],applications:[],notifications:[],audit:[],medicineRequests:[]};
}
