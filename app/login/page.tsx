import { LoginForm } from '@/app/components/auth/LoginForm'
import Image from 'next/image'

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-black">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/backgrounds/login_bg.png"
          alt="Login Background"
          fill
          priority
          className="object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-[440px] px-6">
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[40px] p-8 md:p-12 shadow-2xl">
          <div className="flex flex-col items-center gap-2 mb-10 text-center">
             <h1 className="text-4xl md:text-5xl font-display font-black text-[#be185d] italic tracking-tighter">
                Kaikansen
             </h1>
             <p className="text-white text-base md:text-lg font-body font-medium tracking-tight">
                Welcome back. Your journey awaits.
             </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  )
}
