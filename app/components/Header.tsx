'use client'
import { ArrowLeft, Menu, ShoppingBasket } from "lucide-react";
import CartButton from "./CartButton";
import { useRouter } from "next/navigation";


export default function Header({back=false} : {back? : boolean}) {
  const router = useRouter()

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* If back is enabled show the back button instead */}
            {
              back ? (
                <button className="" onClick={() => router.back()}>
                  <ArrowLeft className="text-gray-700 size-6"/>
                </button>
              ) :
                <button className="size-6">
                  {/* <Menu className="text-gray-700 size-6"/> */}
                </button>
            }

            {/* Logo */}
            <div className="h-10 w-32 bg-gray-300 rounded animate-pulse" />

            {/* Shopping card button */}
            <CartButton />
          </div>
        </div>
      </header>
  )
}