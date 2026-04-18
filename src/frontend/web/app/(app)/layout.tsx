import Link from "next/link";

export default function AppShellLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="shell">
      <header className="shell-header">
        <div className="page">
          <div className="eyebrow">App Surface</div>
          <h1>Household App</h1>
          <p className="lede">
            Member-facing scheduling and household context shell.
          </p>
          <nav className="shell-nav">
            <Link href="/app">Overview</Link>
            <Link href="/app/food">Food</Link>
            <Link href="/admin">Admin</Link>
            <Link href="/display">Display</Link>
          </nav>
        </div>
      </header>
      <main className="page shell-main">{children}</main>
    </div>
  );
}
