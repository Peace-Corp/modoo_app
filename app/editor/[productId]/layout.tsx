// Generate static params for Capacitor builds
// Returns empty array since this route uses dynamic data
export async function generateStaticParams() {
  return []
}

export default function DynamicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
