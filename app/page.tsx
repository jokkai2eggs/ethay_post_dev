'use client'

import { useToast } from '@/hooks/use-toast'

export default function Home() {
  const { toast } = useToast()

  return (
    <div className="text-center text-2xl flex justify-center items-center h-full">
      Why you here?
    </div>
  )
}
