'use client'
import { ArrowLeft, Heart, User } from "lucide-react";
import CartButton from "./CartButton";
import { useRouter } from "next/navigation";
import Link from "next/link";


export default function Header({
  back = false,
  showHomeNav = false,
}: {
  back?: boolean;
  showHomeNav?: boolean;
}) {
  const router = useRouter()

  return (
    <header className="bg-white/70 backdrop-blur-md shadow-sm lg:shadow-none sticky top-0 z-50 border-b border-white/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between h-16 gap-4">
              {/* If back is enabled show the back button instead */}
              <div className="flex items-center lg:w-48">
                {
                  back ? (
                    <button className="" onClick={() => router.back()}>
                      <ArrowLeft className="text-gray-700 size-6"/>
                    </button>
                  ) :
                    (showHomeNav ? (
                      <Link
                        href="/home"
                        className="text-lg font-black tracking-[0.18em] text-gray-900"
                        aria-label="MODOO 홈"
                      >
                        MODOO
                      </Link>
                    ) : (
                      <button className="size-6">
                        {/* <Menu className="text-gray-700 size-6"/> */}
                      </button>
                    ))
                }
              </div>

              {/* Logo / Placeholder */}
              {!showHomeNav && (
                <div className="h-10 w-32 bg-gray-300 rounded animate-pulse" />
              )}

              {showHomeNav && (
                <nav className="hidden lg:flex flex-1 items-center justify-center gap-8 text-base font-semibold text-gray-700">
                  <Link href="/home" className="hover:text-black transition">홈</Link>
                  <Link href="/home/search" className="hover:text-black transition">검색</Link>
                  <Link href="/home/designs" className="hover:text-black transition">내 디자인</Link>
                  <Link href="/home/my-page" className="hover:text-black transition">내정보</Link>
                </nav>
              )}

              {/* Shopping card button */}
              {showHomeNav ? (
                <div className="hidden lg:flex items-center justify-end gap-4 text-gray-600 lg:w-48">
                  <CartButton />
                  <Link href="/home/my-page" className="hover:text-black transition" aria-label="내 정보">
                    <User className="size-5" />
                  </Link>
                </div>
              ) : (
                <CartButton />
              )}
            </div>
          </div>
        </div>
      </header>
  )
}
