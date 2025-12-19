import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="bg-white border-b border-slate-200 p-6 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
            <Link href="/" className="text-slate-500 hover:text-indigo-600 flex items-center gap-2 text-sm font-bold">
                <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
            <span className="text-xl font-bold text-slate-900">Cookie Policy</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-8 md:p-12 bg-white mt-8 mb-20 shadow-sm rounded-xl border border-slate-200">
        <h1 className="text-4xl font-extrabold mb-2 text-slate-900">Cookie Policy</h1>
        <p className="text-slate-500 mb-10">Last updated: December 16, 2025</p>

        <div className="space-y-8 text-slate-700 leading-relaxed">
            <section>
                <h2 className="text-xl font-bold text-slate-900 mb-3">1. What are cookies?</h2>
                <p>Cookies are small text files that are stored on your device when you visit a website. They are widely used to make websites work more efficiently and to provide information to the owners of the site.</p>
            </section>

            <section>
                <h2 className="text-xl font-bold text-slate-900 mb-3">2. How we use cookies</h2>
                <p>Tutorio uses cookies for the following purposes:</p>
                <div className="mt-4 space-y-4">
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <h3 className="font-bold text-indigo-700">Essential Cookies</h3>
                        <p className="text-sm">These are necessary for the website to function (e.g., logging in, keeping your session active). You cannot opt-out of these.</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <h3 className="font-bold text-indigo-700">Performance Cookies</h3>
                        <p className="text-sm">These help us understand how visitors interact with the website by collecting and reporting information anonymously.</p>
                    </div>
                </div>
            </section>

            <section>
                <h2 className="text-xl font-bold text-slate-900 mb-3">3. Managing Cookies</h2>
                <p>Most web browsers allow you to control cookies through their settings preferences. However, if you limit the ability of websites to set cookies, you may worsen your overall user experience, since it will no longer be personalized to you.</p>
            </section>
        </div>
      </div>
    </main>
  )
}