export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
      </div>
    </div>
  );
}
