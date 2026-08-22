export default function DeskRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="desk-shell min-h-screen">{children}</div>;
}
