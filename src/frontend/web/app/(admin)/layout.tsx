import Link from "next/link";

export default function AdminShellLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="shell">
      <header className="shell-header">
        <div className="page">
          <div className="eyebrow">Admin Surface</div>
          <h1 style={{ color: "var(--admin)" }}>Administration</h1>
          <p className="lede">
            Member management, display management, and household settings stay
            grouped here.
          </p>
          <nav className="shell-nav">
            <Link href="/app">App</Link>
            <Link href="/admin">Admin Overview</Link>
            <Link href="/display">Display</Link>
          </nav>
        </div>
      </header>
      <main className="page shell-main">{children}</main>
    </div>
  );
}
