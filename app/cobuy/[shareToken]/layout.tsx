// Generate static params for Capacitor builds
// Returns empty array since cobuy sessions are created dynamically
export async function generateStaticParams() {
  return []
}

export default function CoBuyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
