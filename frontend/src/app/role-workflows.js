import { createRoleNavigation } from '../components/navigation/role-navigation.js';
import { createRoleSelectionPage } from '../pages/landing/role-selection.js';
export function createRoleUI({ S, resetTo }) {
  return { screens: { roles: createRoleSelectionPage({ S }) }, actions: { switchRole: () => resetTo('roles') }, navbar: createRoleNavigation(S) };
}
