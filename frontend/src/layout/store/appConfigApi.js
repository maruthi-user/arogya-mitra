import { getLayoutConfig } from "@layout/config/registry";
import { apiSlice } from "./apiSlice";

/**
 * The backend's public "what the UI needs to build itself" endpoint
 * (api.appConfigUrl in app.config.js; defaults to /api/v1/app/config):
 * branding, enabled modules, labels, dropdowns, role names. No auth
 * required - safe to call before login.
 *
 * A module entry in apps.json may declare `requiresModule: "<name>"`;
 * Sidebar and CommandPalette hide it when the backend reports that module
 * as disabled, instead of leaving a nav item that 404s.
 */
const url = () => getLayoutConfig().api.appConfigUrl || "/api/v1/app/config";

export const appConfigApi = apiSlice.enhanceEndpoints({ addTagTypes: ["PublicAppConfig"] }).injectEndpoints({
  endpoints: (builder) => ({
    getPublicAppConfig: builder.query({
      query: () => url(),
      providesTags: ["PublicAppConfig"],
    }),
  }),
});

export const { useGetPublicAppConfigQuery } = appConfigApi;

/**
 * True when `module.requiresModule` is unset, or the backend hasn't told us
 * yet (`enabledModules` is undefined - avoids hiding things while the
 * request is in flight), or that module is actually enabled.
 */
export const isModuleAvailable = (module, enabledModules) =>
  !module.requiresModule || !enabledModules || enabledModules.includes(module.requiresModule);
