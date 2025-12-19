import Link from 'next/link';
import { CheckCircle, DollarSign, Calendar, ArrowRight } from 'lucide-react';

export default function BecomeTeacherPage() {
  return (
    <main className="min-h-screen bg-white font-sans text-slate-900">
      {/* Navbar Simple */}
      <nav className="p-6 border-b border-slate-100 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-indigo-600">Tutorio</Link>
        <Link href="/login" className="font-medium text-slate-600 hover:text-indigo-600">Login</Link>
      </nav>

      {/* Hero Teacher */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h1 className="text-5xl font-extrabold mb-6 text-slate-900">
            Share your knowledge. <span className="text-indigo-600">Earn on your terms.</span>
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
            Join the platform that handles the boring stuff (payments, scheduling, video) so you can focus on teaching.
          </p>
          <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-full font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl">
            Start Teaching Today <ArrowRight className="w-5 h-5"/>
          </Link>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-12">
            {[
                { icon: <DollarSign className="w-8 h-8 text-green-600"/>, title: "Set Your Rates", desc: "You decide how much your time is worth. We take a small commission only when you earn." },
                { icon: <Calendar className="w-8 h-8 text-blue-600"/>, title: "Flexible Schedule", desc: "Open your calendar only when you want to work. Perfect for side hustles or full-time careers." },
                { icon: <CheckCircle className="w-8 h-8 text-indigo-600"/>, title: "Guaranteed Payments", desc: "No more chasing students for money. We secure the payment before the class starts." }
            ].map((b, i) => (
                <div key={i} className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">{b.icon}</div>
                    <h3 className="text-xl font-bold mb-3">{b.title}</h3>
                    <p className="text-slate-500">{b.desc}</p>
                </div>
            ))}
        </div>
      </section>
    </main>
  )
}