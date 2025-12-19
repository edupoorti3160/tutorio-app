import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="bg-white border-b border-slate-200 p-6 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
            <Link href="/" className="text-slate-500 hover:text-indigo-600 flex items-center gap-2 text-sm font-bold">
                <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
            <span className="text-xl font-bold text-slate-900">Privacy Policy</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-8 md:p-12 bg-white mt-8 mb-20 shadow-sm rounded-xl border border-slate-200">
        <h1 className="text-4xl font-extrabold mb-2 text-slate-900">Privacy Policy</h1>
        <p className="text-slate-500 mb-10">Effective Date: December 16, 2025</p>

        <div className="space-y-8 text-slate-700 leading-relaxed">
            <section>
                <h2 className="text-xl font-bold text-slate-900 mb-3">1. Information We Collect</h2>
                <p>We collect information you provide directly to us, such as when you create an account, update your profile, or communicate with us. This may include:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Name and Contact Information (Email).</li>
                    <li>Payment Information (processed by Stripe/PayPal).</li>
                    <li>Profile Data (Biography, Languages spoken).</li>
                </ul>
            </section>

            <section>
                <h2 className="text-xl font-bold text-slate-900 mb-3">2. How We Use Your Information</h2>
                <p>We use the information we collect to:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Connect students with tutors.</li>
                    <li>Process transactions and send related information.</li>
                    <li>Facilitate video calls and chat features.</li>
                    <li>Send technical notices, updates, and security alerts.</li>
                </ul>
            </section>

            <section>
                <h2 className="text-xl font-bold text-slate-900 mb-3">3. Data Sharing</h2>
                <p>We do not sell your personal data. We share information only in the following circumstances:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li><strong>With Tutors/Students:</strong> To facilitate the lesson (e.g., displaying your name).</li>
                    <li><strong>Service Providers:</strong> Vendors who perform services for us (hosting, customer support).</li>
                    <li><strong>Legal Requirements:</strong> If required by law or to protect rights and safety.</li>
                </ul>
            </section>

            <section>
                <h2 className="text-xl font-bold text-slate-900 mb-3">4. Data Security</h2>
                <p>We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.</p>
            </section>
        </div>
      </div>
    </main>
  )
}