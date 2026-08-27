import { ProspectLaden } from '@/components/feedback/ProspectLaden'

/** Next rendert dit terwijl de server-component zijn query doet. */
export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <ProspectLaden />
    </main>
  )
}
