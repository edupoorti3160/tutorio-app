import Link from 'next/link';
import Image from 'next/image';
import { Video, Mic, Globe, CheckCircle, ArrowRight, Play, Star, Calendar, Shield, CreditCard, Clock, Laptop, ChevronDown, Check } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-700 scroll-smooth">
      
      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-lg border-b border-slate-200 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* LOGO GIGANTE - VERSIÓN FINAL */}
            <Link href="/" className="flex items-center">
              {/* Forzamos un contenedor de 300px de ancho x 70px de alto */}
              <div className="relative w-[300px] h-[70px]"> 
                 <Image 
                    src="/logo.png" 
                    alt="Tutorio Logo" 
                    fill
                    className="object-contain object-left" // Se alinea a la izquierda y crece hasta tocar los bordes
                    priority 
                    sizes="(max-width: 768px) 100vw, 300px"
                 />
              </div>
            </Link>
            
            <div className="hidden md:flex items-center gap-8 font-medium text-slate-600 text-sm">
              <Link href="/browse" className="hover:text-indigo-600 transition-colors">Find Tutors</Link>
              <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">How it works</a>
              <a href="#maestros" className="hover:text-indigo-600 transition-colors">Soy Maestro</a>
              <a href="#faq" className="hover:text-indigo-600 transition-colors">FAQ</a>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/login" className="hidden sm:inline-flex px-5 py-2.5 text-slate-700 font-bold hover:text-indigo-600 transition-colors">
                Log in
              </Link>
              <Link href="/register" className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-full font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="pt-36 pb-20 lg:pt-48 lg:pb-32 relative overflow-hidden">
         {/* Fondo sutil */}
         <div className="absolute top-0 right-0 -z-10 opacity-40">
            <div className="w-[600px] h-[600px] bg-indigo-100 rounded-full blur-[100px] absolute -top-20 -right-20"></div>
            <div className="w-[500px] h-[500px] bg-blue-50 rounded-full blur-[100px] absolute top-40 right-40"></div>
         </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-8">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                New: Integrated Digital Wallet
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 text-slate-900">
                Learn Spanish <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                  The Real Way.
                </span>
              </h1>
              
              <p className="text-lg text-slate-600 mb-10 leading-relaxed">
                Forget boring apps. Connect with verified native tutors in a professional video classroom designed for serious learning. Pay per class, learn at your pace.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link href="/register" className="flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200">
                  Find a Tutor
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a href="#how-it-works" className="flex items-center justify-center gap-3 px-8 py-4 bg-white text-slate-700 border-2 border-slate-200 rounded-2xl font-bold text-lg hover:border-indigo-600 hover:text-indigo-600 transition-all">
                   <Play className="w-5 h-5 fill-current" />
                   How it works
                </a>
              </div>

              <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
                <div className="flex -space-x-3">
                   <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white"></div>
                   <div className="w-10 h-10 rounded-full bg-slate-300 border-2 border-white"></div>
                   <div className="w-10 h-10 rounded-full bg-slate-400 border-2 border-white"></div>
                </div>
                <p>Join our growing community</p>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative mx-auto w-full max-w-[600px]">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-8 border-white bg-slate-100">
                <img 
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80" 
                  alt="Online tutoring session" 
                  className="w-full h-auto object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl border border-slate-100 flex items-center gap-3 animate-bounce-slow">
                 <div className="bg-green-100 p-2 rounded-full"><CheckCircle className="w-6 h-6 text-green-600"/></div>
                 <div>
                    <p className="text-xs text-slate-500 font-bold uppercase">Certified</p>
                    <p className="font-bold text-slate-900">Native Speakers</p>
                 </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* --- DETAILED FEATURES --- */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-20">
                <h2 className="text-indigo-600 font-bold tracking-wide uppercase mb-4">Why Choose Tutorio?</h2>
                <p className="text-4xl font-extrabold text-slate-900">Everything you need to become fluent.</p>
            </div>

            {/* FEATURE 1: EL AULA */}
            <div className="flex flex-col md:flex-row items-center gap-12 mb-24">
                <div className="flex-1 order-2 md:order-1">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                        <Laptop className="w-6 h-6"/>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900 mb-4">Interactive Video Classroom</h3>
                    <p className="text-lg text-slate-600 leading-relaxed mb-6">
                        No need to install Zoom or Skype. Our classroom runs directly in your browser. It features:
                    </p>
                    <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-slate-700 font-medium"><CheckCircle className="w-5 h-5 text-green-500"/> HD Video & Audio</li>
                        <li className="flex items-center gap-3 text-slate-700 font-medium"><CheckCircle className="w-5 h-5 text-green-500"/> Screen Sharing & Whiteboard</li>
                        <li className="flex items-center gap-3 text-slate-700 font-medium"><CheckCircle className="w-5 h-5 text-green-500"/> Chat with instant translation</li>
                    </ul>
                </div>
                <div className="flex-1 order-1 md:order-2">
                    <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80" alt="Classroom feature" className="rounded-3xl shadow-lg border border-slate-100"/>
                </div>
            </div>

            {/* FEATURE 2: PAGOS Y BILLETERA */}
            <div className="flex flex-col md:flex-row items-center gap-12 mb-24">
                <div className="flex-1">
                    <img src="https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=800&q=80" alt="Secure Payment Easy" className="rounded-3xl shadow-lg border border-slate-100"/>
                </div>
                <div className="flex-1">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6">
                        <CreditCard className="w-6 h-6"/>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900 mb-4">Pay Per Lesson, Not Subscriptions</h3>
                    <p className="text-lg text-slate-600 leading-relaxed mb-6">
                        We believe in freedom. Load your wallet and pay only for the classes you book.
                    </p>
                    <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-slate-700 font-medium"><CheckCircle className="w-5 h-5 text-green-500"/> Secure Wallet System</li>
                        <li className="flex items-center gap-3 text-slate-700 font-medium"><CheckCircle className="w-5 h-5 text-green-500"/> Transparent Pricing (Set by Tutors)</li>
                        <li className="flex items-center gap-3 text-slate-700 font-medium"><CheckCircle className="w-5 h-5 text-green-500"/> Money-back guarantee on cancellations</li>
                    </ul>
                </div>
            </div>

            {/* FEATURE 3: AGENDA */}
            <div className="flex flex-col md:flex-row items-center gap-12">
                <div className="flex-1 order-2 md:order-1">
                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
                        <Calendar className="w-6 h-6"/>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900 mb-4">Smart Scheduling</h3>
                    <p className="text-lg text-slate-600 leading-relaxed mb-6">
                        Booking a class is as easy as one click. We handle the time-zone math so you don't have to.
                    </p>
                    <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-slate-700 font-medium"><CheckCircle className="w-5 h-5 text-green-500"/> Auto Time-zone Conversion</li>
                        <li className="flex items-center gap-3 text-slate-700 font-medium"><CheckCircle className="w-5 h-5 text-green-500"/> Instant Calendar Sync</li>
                        <li className="flex items-center gap-3 text-slate-700 font-medium"><CheckCircle className="w-5 h-5 text-green-500"/> Reminders before class</li>
                    </ul>
                </div>
                <div className="flex-1 order-1 md:order-2">
                    <img src="https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80" alt="Scheduling feature" className="rounded-3xl shadow-lg border border-slate-100"/>
                </div>
            </div>
        </div>
      </section>

      {/* --- HOW IT WORKS --- */}
      <section id="how-it-works" className="py-24 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-extrabold text-slate-900">Start Speaking in 3 Steps</h2>
                <p className="text-slate-500 mt-4 max-w-2xl mx-auto">No complicated assessments. Just sign up and start learning.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {[
                    { step: "01", icon: <Shield className="w-8 h-8"/>, title: "Browse Profiles", desc: "Filter tutors by price, country, and specialty. Watch their intro videos to see if you click." },
                    { step: "02", icon: <CreditCard className="w-8 h-8"/>, title: "Book & Pay", desc: "Choose a time slot that works for you. Pay securely using your Tutorio Wallet." },
                    { step: "03", icon: <Video className="w-8 h-8"/>, title: "Connect", desc: "At the scheduled time, enter the Virtual Classroom and start your lesson instantly." },
                ].map((item, i) => (
                    <div key={i} className="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm relative group hover:-translate-y-2 transition-transform duration-300">
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            {item.icon}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                        <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                        <span className="absolute top-6 right-8 text-6xl font-black text-slate-100 -z-0 select-none">{item.step}</span>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* --- AUDIENCE SECTION --- */}
      <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid md:grid-cols-2 gap-12 items-center bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden">
                  <div className="relative z-10">
                      <h2 className="text-3xl md:text-4xl font-bold mb-6">Perfect for...</h2>
                      <div className="space-y-6">
                          <div className="flex gap-4">
                              <div className="bg-white/10 p-3 rounded-xl h-fit"><BriefcaseIcon /></div>
                              <div>
                                  <h4 className="font-bold text-lg">Professionals</h4>
                                  <p className="text-slate-400 text-sm">Improve your Business English or Spanish for better job opportunities.</p>
                              </div>
                          </div>
                          <div className="flex gap-4">
                              <div className="bg-white/10 p-3 rounded-xl h-fit"><PlaneIcon /></div>
                              <div>
                                  <h4 className="font-bold text-lg">Travelers</h4>
                                  <p className="text-slate-400 text-sm">Learn conversational skills to survive and thrive in your next trip.</p>
                              </div>
                          </div>
                          <div className="flex gap-4">
                              <div className="bg-white/10 p-3 rounded-xl h-fit"><GraduationIcon /></div>
                              <div>
                                  <h4 className="font-bold text-lg">Students</h4>
                                  <p className="text-slate-400 text-sm">Get help with homework or prepare for international exams.</p>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="relative z-10 hidden md:block">
                      <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80" className="rounded-2xl shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500" alt="Students"/>
                  </div>
                  
                  {/* Decorative Circles */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full blur-[80px] opacity-40"></div>
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-600 rounded-full blur-[80px] opacity-40"></div>
              </div>
          </div>
      </section>

      {/* --- NUEVA SECCIÓN: CONVIÉRTETE EN MAESTRO (ESPAÑOL) --- */}
      <section id="maestros" className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
            
            {/* Texto de Venta */}
            <div>
              <span className="text-indigo-600 font-bold tracking-wider uppercase text-sm">Para Profesores</span>
              <h2 className="text-4xl font-extrabold mt-2 mb-6 text-slate-900 leading-tight">
                Comparte tu conocimiento. <br/>
                <span className="text-indigo-600">Gana bajo tus propios términos.</span>
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Únete a la plataforma que se encarga de lo aburrido (cobros, agenda, video) para que tú solo te enfoques en enseñar.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex gap-4">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 w-full">
                      <span className="text-2xl">💰</span> 
                      <div>
                        <strong>Define tu Tarifa:</strong> 
                        <span className="block text-sm text-slate-500">Tú decides cuánto vale tu hora.</span>
                      </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 w-full">
                      <span className="text-2xl">📅</span> 
                      <div>
                        <strong>Horario Flexible:</strong> 
                        <span className="block text-sm text-slate-500">Trabaja solo cuando quieras.</span>
                      </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 w-full">
                      <span className="text-2xl">🔒</span> 
                      <div>
                        <strong>Pagos Seguros:</strong> 
                        <span className="block text-sm text-slate-500">Sin perseguir alumnos para cobrar.</span>
                      </div>
                  </div>
                </div>
              </div>

              <Link href="/register?role=teacher" className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white transition-all duration-200 bg-indigo-600 border border-transparent rounded-full hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/30">
                Empezar a Enseñar Hoy
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>

            {/* Visual */}
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-3xl transform rotate-3 opacity-10"></div>
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 relative">
                    <div className="flex items-center gap-4 mb-6 border-b border-slate-50 pb-6">
                        <div className="w-16 h-16 bg-slate-200 rounded-full overflow-hidden">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Profesor" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">Carlos Mendoza</h3>
                            <p className="text-indigo-600 text-sm font-medium">Profesor de Español</p>
                        </div>
                        <div className="ml-auto text-right">
                            <p className="text-2xl font-bold text-slate-900">$25<span className="text-sm font-normal text-slate-400">/h</span></p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="h-2 bg-slate-100 rounded-full w-3/4"></div>
                        <div className="h-2 bg-slate-100 rounded-full w-1/2"></div>
                        <div className="h-2 bg-slate-100 rounded-full w-full"></div>
                    </div>
                    <div className="mt-6 flex justify-between items-center text-sm font-bold text-slate-600">
                        <span className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400 fill-current"/> 4.9 (120 Clases)</span>
                        <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Verificado</span>
                    </div>
                </div>
            </div>

        </div>
      </section>

      {/* --- FAQ SECTION --- */}
      <section id="faq" className="py-24 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-extrabold text-center text-slate-900 mb-12">Frequently Asked Questions</h2>
              <div className="space-y-4">
                  {[
                      { q: "How do I pay for lessons?", a: "You can load funds into your Tutorio Wallet using a credit card or PayPal. Then, use that balance to book individual lessons." },
                      { q: "What happens if I cancel a class?", a: "If you cancel more than 24 hours in advance, you get a 100% refund to your wallet. Cancellations within 24 hours are paid to the tutor to respect their time." },
                      { q: "Do I need to download Zoom?", a: "No! We have a built-in video classroom that works in Chrome, Firefox, and Safari on your computer or phone." },
                      { q: "Can I become a tutor?", a: "Yes, we are always looking for passionate educators. Click 'Find Tutors' -> 'Become a Teacher' in the footer to apply." }
                  ].map((item, i) => (
                      <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                          <h3 className="font-bold text-lg text-slate-900 mb-2 flex justify-between items-center">
                              {item.q}
                              <ChevronDown className="w-5 h-5 text-slate-400"/>
                          </h3>
                          <p className="text-slate-600">{item.a}</p>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* --- FINAL CTA --- */}
      <section className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-extrabold text-slate-900 mb-6">
            Ready to start your journey?
          </h2>
          <p className="text-xl text-slate-500 mb-10">
            Join Tutorio today and connect with the perfect tutor for you.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-full font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl">
                Create Free Account
            </Link>
            <Link href="/browse" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-100 text-slate-700 rounded-full font-bold text-lg hover:bg-slate-200 transition-all">
                Browse Tutors First
            </Link>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-950 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
                <span className="text-2xl font-bold text-white">Tutorio</span>
                <p className="text-sm mt-2">© 2024 Tutorio Inc. All rights reserved.</p>
            </div>
            <div className="flex gap-8 text-sm font-medium">
                <Link href="/terms" className="hover:text-indigo-400">Terms</Link>
                <Link href="/privacy" className="hover:text-indigo-400">Privacy</Link>
                <Link href="/cookies" className="hover:text-indigo-400">Cookies</Link>
            </div>
        </div>
      </footer>

    </main>
  );
}

// Iconos Auxiliares
function BriefcaseIcon() { return <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> }
function PlaneIcon() { return <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-