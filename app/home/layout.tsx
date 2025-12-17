import BottomNavBar from "../components/BottomNavBar";




export default function HomeLayout({children} : {children: React.ReactElement}) {
  return (
    <main>
      {children}
      <BottomNavBar />
    </main>
  )
}