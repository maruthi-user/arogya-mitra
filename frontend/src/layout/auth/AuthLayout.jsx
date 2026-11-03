import AuthShell from "@layout/auth/AuthShell";
import useLoginApp from "@layout/auth/useLoginApp";

/**
 * Frame for the account screens (forgot / restore password, activation).
 * Same look as the login screen - the brand pane, illustration and company
 * links come from the shared `AuthShell`, branded for the app in `?app=`.
 */
const AuthLayout = ({ children, showCompanyLinks = true }) => {
  const app = useLoginApp();

  return (
    <AuthShell app={app} showCompanyLinks={showCompanyLinks}>
      {children}
    </AuthShell>
  );
};

export default AuthLayout;
