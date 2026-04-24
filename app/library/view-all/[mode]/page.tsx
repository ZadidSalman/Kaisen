import { ViewAllClient } from './ViewAllClient'

export default async function ViewAllPage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params
  return <ViewAllClient mode={mode} />
}
