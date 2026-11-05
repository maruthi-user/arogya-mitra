import RecordDataTable from '../../components/data-display/RecordDataTable';
import { useState } from "react";
import * as Icons from "@layout/ui/icons";
import { Eye, EyeOff, Lock, Info, Clock, Moon, Sun, MonitorSmartphone } from "lucide-react";
import { useSelector } from "react-redux";
import { getLayoutConfig } from "@layout/config/registry";
import {
  useChangePasswordMutation,
  useGetSessionsQuery,
  useRevokeSessionMutation,
  useRevokeOtherSessionsMutation,
} from "@layout/store/authApi";
import { useToast } from "@layout/hooks/use-toast";
import { formatStatus } from "@layout/utils/formatStatus";
import { Card } from "@layout/ui/card";
import { Badge } from "@layout/ui/badge";
import { Button } from "@layout/ui/button";
import Tabs from "@layout/filters/Tabs";
import { useLayout } from "@layout/shell/LayoutContext";

const getInitials = (name = "") =>
  name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "U";

const Row = ({ icon, label, value }) => {
  const Icon = Icons[icon] || Icons.Info;
  return (
    <div className="flex items-start gap-3 border-b border-border/60 px-1 py-3 last:border-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 break-words text-sm font-medium text-foreground">{value || "-"}</p>
      </div>
    </div>
  );
};

const Heading = ({ icon: Icon, title, subtitle }) => (
  <div className="mb-6 flex items-center gap-3">
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-md shadow-blue-500/20">
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <h3 className="text-base font-semibold leading-tight">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  </div>
);

function PasswordField({ id, label, value, onChange, autoComplete, minLength }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">{label}</label>
      <div className="relative">
        <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          id={id}
          name={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          minLength={minLength}
          required
          className="w-full rounded-xl border border-border bg-card py-3 pl-12 pr-12 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground"
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

function ChangePassword() {
  const { account } = getLayoutConfig();
  const { toast } = useToast();
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const empty = { currentPassword: "", newPassword: "", confirmPassword: "" };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  const set = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.newPassword.length < account.minPasswordLength) {
      setError(`New password must be at least ${account.minPasswordLength} characters.`);
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }
    if (form.newPassword === form.currentPassword) {
      setError("New password must be different from the current password.");
      return;
    }
    try {
      // confirmPassword is a client-side check only (see above) - the
      // backend's ChangePasswordRequest only accepts currentPassword/newPassword
      // and rejects unknown fields.
      const { currentPassword, newPassword } = form;
      const res = getLayoutConfig().auth.demo
        ? { message: "Demo mode: password not sent anywhere." }
        : await changePassword({ currentPassword, newPassword }).unwrap();
      toast({
        title: "Password updated",
        description: res?.message || "Your password was changed. You were signed out on all other devices.",
      });
      setForm(empty);
    } catch (err) {
      const detail = err?.data?.message || err?.data;
      setError(typeof detail === "string" && detail.trim() ? detail : "Unable to change password. Please try again.");
    }
  };

  return (
    <Card className="rounded-2xl border p-6 shadow-sm">
      <Heading icon={Lock} title="Change Password" subtitle="Use at least a few characters you have not used elsewhere" />
      <form onSubmit={submit} className="max-w-xl space-y-5">
        <PasswordField id="currentPassword" label="Current Password" value={form.currentPassword} onChange={set} autoComplete="current-password" />
        <PasswordField id="newPassword" label="New Password" value={form.newPassword} onChange={set} autoComplete="new-password" minLength={account.minPasswordLength} />
        <PasswordField id="confirmPassword" label="Confirm Password" value={form.confirmPassword} onChange={set} autoComplete="new-password" minLength={account.minPasswordLength} />
        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        <Button type="submit" disabled={isLoading} className="rounded-xl px-6">
          {isLoading ? "Updating Password..." : "Change Password"}
        </Button>
      </form>
    </Card>
  );
}

function Applications({ user }) {
  const { apps, access } = getLayoutConfig();
  return (
    <Card className="rounded-2xl border p-6 shadow-sm">
      <Heading icon={Icons.LayoutGrid} title="Application Access" subtitle="Applications you can open and whether you have access" />
      {apps.map((app) => {
        const Icon = Icons[app.icon] || Icons.Boxes;
        const ok = access.canAccessApp(user, app);
        return (
          <div key={app.id} className="flex items-center gap-3 border-b border-border/60 px-1 py-3 last:border-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{app.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{ok ? formatStatus(user?.role) || "-" : "No access"}</p>
            </div>
            <Badge className={ok ? "border border-emerald-600/20 bg-emerald-600/10 text-emerald-600" : "border border-gray-500/20 bg-gray-500/10 text-gray-600"}>
              {ok ? "Yes" : "No"}
            </Badge>
          </div>
        );
      })}
    </Card>
  );
}

// "Chrome on Windows" from a User-Agent string; good enough for a device list.
const describeAgent = (ua = "") => {
  const browser =
    (/Edg\//.test(ua) && "Edge") ||
    (/OPR\//.test(ua) && "Opera") ||
    (/Chrome\//.test(ua) && "Chrome") ||
    (/Firefox\//.test(ua) && "Firefox") ||
    (/Safari\//.test(ua) && "Safari") ||
    null;
  const os =
    (/Windows/.test(ua) && "Windows") ||
    (/Android/.test(ua) && "Android") ||
    (/iPhone|iPad/.test(ua) && "iOS") ||
    (/Mac OS X/.test(ua) && "macOS") ||
    (/Linux/.test(ua) && "Linux") ||
    null;
  if (browser && os) return `${browser} on ${os}`;
  return browser || os || (ua ? ua.slice(0, 60) : "Unknown device");
};

const formatWhen = (value) => (value ? new Date(value).toLocaleString() : "-");

function Sessions() {
  const tableScope=useSelector(state=>state.auth.user?.accountId||state.auth.user?.id||'anonymous');
  const { toast } = useToast();
  const { data: sessions = [], isLoading, isError } = useGetSessionsQuery();
  const [revokeSession, { isLoading: revoking }] = useRevokeSessionMutation();
  const [revokeOthers, { isLoading: revokingOthers }] = useRevokeOtherSessionsMutation();
  const others = sessions.filter((s) => !s.current).length;

  const signOut = async (id) => {
    try {
      await revokeSession(id).unwrap();
      toast({ title: "Device signed out" });
    } catch {
      toast({ title: "Could not sign out that device", variant: "destructive" });
    }
  };

  const signOutOthers = async () => {
    try {
      const res = await revokeOthers().unwrap();
      toast({ title: "Signed out other devices", description: `${res?.revoked ?? 0} session(s) ended.` });
    } catch {
      toast({ title: "Could not sign out other devices", variant: "destructive" });
    }
  };

  return (
    <Card className="rounded-2xl border p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Heading icon={MonitorSmartphone} title="Devices" subtitle="Where your account is signed in" />
        {others > 0 && (
          <Button variant="outline" onClick={signOutOthers} disabled={revokingOthers} className="cursor-pointer">
            Sign out all other devices
          </Button>
        )}
      </div>
      {getLayoutConfig().auth.demo ? (
        <p className="text-sm text-muted-foreground">Demo mode: no sessions are tracked.</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : isError ? (
        <p className="text-sm text-red-600">Could not load your devices.</p>
      ) : (
        <RecordDataTable key={tableScope} id="account-sessions" caption="Signed-in devices" language={typeof document==='undefined'?'en':document.documentElement.lang} rows={sessions} columns={[
          {key:'userAgent',label:'Device',value:s=>describeAgent(s.userAgent),render:s=><span>{describeAgent(s.userAgent)} {s.current&&<Badge>This device</Badge>}</span>},
          {key:'ipAddress',label:'IP address'},{key:'lastSeenAt',label:'Last active',render:s=>formatWhen(s.lastSeenAt)},{key:'createdAt',label:'Signed in',render:s=>formatWhen(s.createdAt)},
          {label:'Actions',sortable:false,searchable:false,render:s=>!s.current?<Button variant="outline" size="sm" onClick={()=>signOut(s.id)} disabled={revoking}>Sign out</Button>:null}
        ]}/>
      )}
    </Card>
  );
}

function Preferences() {
  const { theme, toggleTheme } = useLayout();
  return (
    <Card className="rounded-2xl border p-6 shadow-sm">
      <Heading icon={Icons.SlidersHorizontal} title="Preferences" subtitle="Saved on this device" />
      <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
        <div className="flex items-center gap-3">
          {theme === "light" ? <Sun className="h-5 w-5 text-muted-foreground" /> : <Moon className="h-5 w-5 text-muted-foreground" />}
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className="text-xs text-muted-foreground">Currently {theme}</p>
          </div>
        </div>
        <Button variant="outline" onClick={toggleTheme} className="cursor-pointer">
          Switch to {theme === "light" ? "dark" : "light"}
        </Button>
      </div>
    </Card>
  );
}

/**
 * Manage Account page - the same for every application. Configure it with
 * `account` in app.config.js (fields, notice, extra tabs); the data comes from
 * the signed-in user in the store.
 */
export default function ManageAccount() {
  const user = useSelector((s) => s.auth?.user || null);
  const { account } = getLayoutConfig();
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { key: "overview", label: "Overview" },
    ...(account.showApplications ? [{ key: "applications", label: "Applications" }] : []),
    { key: "preferences", label: "Preferences" },
    ...(account.showSessions ? [{ key: "devices", label: "Devices" }] : []),
    ...account.extraTabs.map((t) => ({ key: t.key, label: t.label })),
    ...(account.allowPasswordChange ? [{ key: "password", label: "Change Password" }] : []),
  ];
  const extra = account.extraTabs.find((t) => t.key === activeTab);

  return (
    <div className="am-account-workspace space-y-4">
      <Card className="overflow-hidden rounded-3xl border shadow-sm">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 text-2xl font-bold text-white shadow-xl shadow-blue-500/30">
            {getInitials(user?.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-2xl font-bold">{user?.fullName || "-"}</h2>
              {user?.role && (
                <Badge className="border border-blue-600/20 bg-blue-600/10 text-blue-600">{formatStatus(user.role)}</Badge>
              )}
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">{user?.email || "-"}</p>
          </div>
          {user?.lastLogin && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Last login {String(user.lastLogin)}
            </span>
          )}
        </div>
      </Card>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "overview" && (
        <div className="space-y-4">
          {account.notice && (
            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{account.notice}</p>
            </div>
          )}
          <Card className="rounded-2xl border p-6 shadow-sm">
            <Heading icon={Icons.User} title="Account Information" subtitle="Your account details" />
            {account.fields.map((f) => (
              <Row key={f.key} icon={f.icon} label={f.label} value={f.format ? f.format(user?.[f.key], user) : user?.[f.key]} />
            ))}
          </Card>
        </div>
      )}
      {activeTab === "applications" && <Applications user={user} />}
      {activeTab === "preferences" && <Preferences />}
      {activeTab === "devices" && <Sessions />}
      {extra && extra.render(user)}
      {activeTab === "password" && <ChangePassword />}
    </div>
  );
}
