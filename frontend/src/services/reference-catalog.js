// In-memory view of /api/reference-data. No embedded operational catalog or offline fallback.
export const VILLAGES=[], MEDICINES=[], SYMPTOMS=[], RED_FLAGS=[], EMERGENCY_KW=[], SERVICE_KINDS=[], BUSINESS_TYPES=[];
export const BUSINESS_KINDS={};
export function applyReferenceData(data){
  for(const [key,target] of [['villages',VILLAGES],['medicines',MEDICINES],['symptoms',SYMPTOMS],['redFlags',RED_FLAGS],['emergencyKeywords',EMERGENCY_KW],['businessTypes',BUSINESS_TYPES]]){
    if(!Array.isArray(data[key]))throw new Error('The backend reference catalog is incomplete: '+key);
    target.splice(0,target.length,...data[key]);
  }
  if(!Array.isArray(data.serviceKinds))throw new Error('The backend service catalog is incomplete');
  SERVICE_KINDS.splice(0,SERVICE_KINDS.length,...data.serviceKinds.map(s=>[s.id,s.te,s.en]));
  for(const key of Object.keys(BUSINESS_KINDS))delete BUSINESS_KINDS[key];
  for(const business of BUSINESS_TYPES)BUSINESS_KINDS[business.id]=business.services;
}
