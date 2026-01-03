'use client'

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LoadingSpinner from "./components/LoadingSpinner";

export default function Home() {
  const router = useRouter();


  useEffect(() => {
    setTimeout(() => {
      router.push('/home')
    }, 1000)
  }, [])
  return (
    <LoadingSpinner />
  );
}
