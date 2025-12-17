
export default function ProductCard() {
  return (
    <div className="bg-white rounded-sm overflow-hidden shadow-sm">
      {/* Product Image */}
      <div className="aspect-4/5 bg-gray-300 animate-pulse"/>

      {/* Product Details */}
      <div className="p-2 space-y-2">
        {/* Brand Name */}
        <div className="h-3 bg-gray-200 rounded animate-pulse w-10" />
        {/* Product Name */}
        <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
        {/* Pricing */}
        <div className="h-6 w-1/2 bg-gray-300 rounded animate-pulse" />
        {/* Optional: Discount info */}
        <div className="h-6 w-1/2 bg-gray-300 rounded animate-pulse" />

        {/* Optional: Tags */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-16 bg-yellow-200 rounded animate-pulse" />
          <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    </div>
  )
}