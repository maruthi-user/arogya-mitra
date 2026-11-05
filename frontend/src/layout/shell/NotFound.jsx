import { Link } from "wouter";
import { getLayoutConfig } from "@layout/config/registry";

export default function NotFound() {
  const { paths } = getLayoutConfig();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <p className="text-muted-foreground">This page does not exist.</p>
      <Link href={paths.home} className="text-sm font-medium text-primary underline">
        Home
      </Link>
    </div>
  );
}
