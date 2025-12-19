import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="bg-white border-b border-slate-200 p-6 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
            <Link href="/" className="text-slate-500 hover:text-indigo-600 flex items-center gap-2 text-sm font-bold">
                <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
            <span className="text-xl font-bold text-slate-900">Terms of Service</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-8 md:p-12 bg-white mt-8 mb-20 shadow-sm rounded-xl border border-slate-200">
        <h1 className="text-4xl font-extrabold mb-2 text-slate-900">Terms of Service</h1>
        <p className="text-slate-500 mb-10">Last updated: December 16, 2025</p>

        <div className="space-y-8 text-slate-700 leading-relaxed">
            <section>
                <h2 className="text-xl font-bold text-slate-900 mb-3">1. Acceptance of Terms</h2>
                <p>By accessing and using Tutorio ("the Platform"), you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
            </section>

            <section>
                <h2 className="text-xl font-bold text-slate-900 mb-3">2. User Accounts</h2>
                <p>To access certain features, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.</p>
            </section>

            <section>
                <h2 className="text-xl font-bold text-slate-900 mb-3">3. Payments and Refunds</h2>
                <p><strong>Students:</strong> Payments for lessons are processed securely via our payment providers. You are charged at the time of booking.</p>
                <p><strong>Refunds:</strong> You may cancel a lesson up to 24 hours before the scheduled time for a full refund. Cancellations made within 24 hours are non-refundable to compensate the tutor's time.</p>
            </section>

            <section>
                <h2 className="text-xl font-bold text-slate-900 mb-3">4. User Conduct</h2>
                <p>You agree not to use the Platform to:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Harass, abuse, or harm another person.</li>
                    <li>Record sessions without the explicit consent of all parties.</li>
                    <li>Distribute spam or malicious software.</li>
                </ul>
            </section>

            <section>
                <h2 className="text-xl font-bold text-slate-900 mb-3">5. Termination</h2>
                <p>We reserve the right to suspend or terminate your account at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users of the Platform.</p>
            </section>
        </div>
      </div>
    </main>
  )
}