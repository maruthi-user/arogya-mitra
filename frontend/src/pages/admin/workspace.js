// Every admin workspace page is now a React page (react-app/pages.jsx). The legacy host renders nothing
// for these screens; they stay registered so the legacy router still recognises them.
const reactPage=()=>({voice:null,html:''});
export function createAdminPages(){
  return {
    adminApplications:reactPage,
    verifierQueue:reactPage,
    adminVerifiers:reactPage,
    adminNotifications:reactPage,
    adminAudit:reactPage,
    adminPharmacies:reactPage,
    adminRequests:reactPage
  };
}
