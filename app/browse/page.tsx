import Link from 'next/link';
import Image from 'next/image';
import { Star, MapPin, CheckCircle, ArrowRight } from 'lucide-react';

export default function PublicBrowse() {
  // DATOS FALSOS PERO REALISTAS (Perfil Latino/Hispano)
  const previewTutors = [
    { 
      name: "Alejandro Rivera", 
      lang: "Spanish Native & English C1", 
      rating: "5.0", 
      reviews: "120",
      location: "San Salvador, SV",
      img: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=200&h=200&q=80" 
    },
    { 
      name: "Valentina Gómez", 
      lang: "English Native (Bilingual)", 
      rating: "4.9", 
      reviews: "85",
      location: "Mexico City, MX",
      img: "https://images.unsplash.com/photo-1589156280159-27698a70f29e?auto=format&fit=crop&w=200&h=200&q=80" 
    },
    { 
      name: "Carlos Mendoza", 
      lang: "Spanish & English", 
      rating: "5.0", 
      reviews: "210",
      location: "Bogotá, CO",
      img: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=200&h=200&q=80" 
    },
    { 
      name: "Gabriela Torres", 
      lang: "Spanish Native", 
      rating: "4.8", 
      reviews: "45",
      location: "Santa Tecla, SV",
      img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&h=200&q=80" 
    },
    { 
      name: "Javier Hernández", 
      lang: "English B2 & Spanish", 
      rating: "4.9", 
      reviews: "92",
      location: "Lima, PE",
      img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80" 
    },
    { 
      name: "Lucía Morales", 
      lang: "Advanced English", 
      rating: "5.0", 
      reviews: "150",
      location: "San José, CR",
      img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&h=200&q=80" 
    },
  ];

  return (
    <main className="min-h-screen bg-[#F8FAFC] font-sans text-slate-600 selection:bg-teal-100 selection:text-indigo-900">
       
       {/* Navbar Simple Consistente */}
       <nav className="p-4 bg-white/80 backdrop-blur-md border-b border-indigo-50 sticky top-0 z-50 flex justify-between items-center shadow-sm">
        
        {/* LOGO CORPORATIVO */}
        <Link href="/" className="flex items-center group">
             <div className="relative w-[180px] h-[50px]"> 
                 <Image 
                    src="/logo.png" 
                    alt="Tutorio Logo" 
                    fill
                    className="object-contain object-left scale-[1.4] origin-left" 
                    priority 
                 />
              </div>
        </Link>

        <div className="flex gap-4 items-center">
             <Link href="/login" className="hidden sm:block font-bold text-indigo-900 hover:text-teal-600 transition-colors px-4 py-2">
                Login
             </Link>
             <Link href="/register" className="font-bold bg-[#1e1b4b] text-white px-6 py-2.5 rounded-full hover:bg-teal-500 transition-all shadow-lg hover:shadow-teal-500/20 hover:-translate-y-0.5">
                Sign Up
             </Link>
        </div>
      </nav>

      {/* Header Section */}
      <div className="bg-white border-b border-indigo-50 py-16 px-6 relative overflow-hidden">
        {/* Fondo sutil */}
        <div className="absolute top-0 right-0 -z-0 opacity-20">
            <div className="w-[400px] h-[400px] bg-teal-100 rounded-full blur-[80px] absolute -top-20 -right-20"></div>
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
            <h1 className="text-4xl md:text-5xl font-extrabold text-[#1e1b4b] mb-4">
                Find your perfect tutor
            </h1>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto">
                Connect with certified tutors from Latin America and beyond. Learn at your own pace with native speakers.
            </p>
        </div>
      </div>

      {/* Grid de Tutores */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {previewTutors.map((t, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:shadow-indigo-100 hover:-translate-y-1 transition-all duration-300 group">
                    
                    {/* Header de la Tarjeta */}
                    <div className="p-6 flex items-start gap-4">
                        <div className="relative">
                            <img src={t.img} alt={t.name} className="w-20 h-20 rounded-full object-cover border-4 border-slate-50 shadow-sm" />
                            <div className="absolute bottom-0 right-0 bg-teal-500 w-4 h-4 rounded-full border-2 border-white"></div>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-[#1e1b4b] group-hover:text-teal-600 transition-colors">{t.name}</h3>
                            <div className="flex items-center gap-1 text-slate-500 text-xs mb-1">
                                <MapPin className="w-3 h-3" /> {t.location}
                            </div>
                            <p className="text-sm font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block">
                                {t.lang}
                            </p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="px-6 pb-4 flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 font-bold text-[#1e1b4b]">
                            <Star className="w-4 h-4 text-amber-400 fill-current"/> {t.rating}
                        </div>
                        <span className="text-slate-300">|</span>
                        <div className="text-slate-500">
                            {t.reviews} reviews
                        </div>
                    </div>

                    {/* Footer / CTA (SIN PRECIO) */}
                    <div className="p-4 bg-[#F8FAFC] border-t border-slate-100 flex justify-between items-center gap-3">
                        <Link href="/register" className="flex-1 bg-white border border-slate-200 text-slate-600 py-2.5 rounded-xl font-bold text-sm text-center hover:bg-slate-50 hover:text-indigo-900 transition-colors">
                            View Profile
                        </Link>
                        <Link href="/register" className="flex-1 bg-[#1e1b4b] text-white py-2.5 rounded-xl font-bold text-sm text-center hover:bg-teal-500 transition-all shadow-md">
                            Book Trial
                        </Link>
                    </div>
                </div>
            ))}
        </div>

        {/* Bloqueo "Ver Más" */}
        <div className="mt-20 text-center">
            <div className="inline-block p-2 bg-white rounded-full border border-indigo-50 shadow-sm mb-6">
                <div className="flex -space-x-3 px-4 py-1">
                    {previewTutors.slice(0,4).map((t,i) => (
                        <img key={i} src={t.img} className="w-10 h-10 rounded-full border-2 border-white object-cover" />
                    ))}
                    <div className="w-10 h-10 rounded-full border-2 border-white bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-900">+99</div>
                </div>
            </div>
            <h2 className="text-3xl font-bold text-[#1e1b4b] mb-4">Want to see more tutors?</h2>
            <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 bg-[#1e1b4b] text-white rounded-full font-bold hover:bg-teal-500 transition-all shadow-xl hover:scale-105 hover:shadow-teal-500/30">
                Create Free Account to Browse All
                <ArrowRight className="w-5 h-5" />
            </Link>
        </div>
      </div>
    </main>
  )
}