export default function LoadingLibrary() {
  return (
    <div className="space-y-4 pt-4 pb-20">
      <div className="h-12 w-full rounded-full bg-bg-elevated shimmer" />
      <div className="h-24 w-full rounded-card bg-bg-elevated shimmer" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-28 rounded-card bg-bg-elevated shimmer" />
        <div className="h-28 rounded-card bg-bg-elevated shimmer" />
      </div>
      <div className="space-y-2">
        <div className="h-16 w-full rounded-card bg-bg-elevated shimmer" />
        <div className="h-16 w-full rounded-card bg-bg-elevated shimmer" />
      </div>
    </div>
  )
}
