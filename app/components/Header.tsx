

export default function Header() {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="h-8 w-32 bg-gray-300 rounded animate-pulse" />

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl mx-8">
              {/* create search button component */}
              <div className="h-10 bg-gray-200 rounded-full animate-pulse" />
            </div>

            {/* Icons */}
            {/* create component for this */}
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 bg-gray-300 rounded-full animate-pulse" />
              <div className="h-8 w-8 bg-gray-300 rounded-full animate-pulse" />
              <div className="h-8 w-8 bg-gray-300 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </header>
  )
}