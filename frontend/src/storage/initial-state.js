export const STORE_KEY = 'arogyaMitra.v1';
export function seedState() {
  return {
    v: 1,
    settings: { lang: null, village: null, name: '', voice: true, introSeen: false, providerId: null, role: null, patientId: null },
    providers: [],
    pharmacies: [],
    bookings: []
  };
}
