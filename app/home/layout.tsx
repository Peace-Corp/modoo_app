import BottomNavBar from "@/app/components/BottomNavBar";




export default function HomeLayout({children} : {children: React.ReactNode}) {
  return (
    <main>
      {children}
      <BottomNavBar />
    </main>
  )
}