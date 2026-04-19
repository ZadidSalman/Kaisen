import { LoginForm } from '@/app/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4
                bg-bg-base relative overflow-hidden">
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="w-14 h-14 rounded-[16px] bg-accent-container flex items-center justify-center">
          <span className="text-accent text-2xl">≋</span>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-display font-extrabold text-ktext-primary">Kaikansen</h1>
          <p className="text-xs font-body tracking-[0.2em] uppercase text-ktext-tertiary mt-1">
            The Ethereal Tide
          </p>
        </div>
      </div>

      <LoginForm />
    </div>
  )
}
