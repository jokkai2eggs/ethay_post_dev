import { ReactNode, Suspense } from 'react'

export default function ProductLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense>{children}</Suspense>
    </>
  )
}
