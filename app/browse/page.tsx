import Link from 'next/link';
import { Star, MapPin, CheckCircle } from 'lucide-react';

export default function PublicBrowse() {
  // DATOS FALSOS PERO REALISTAS (Perfil Latino/Hispano)
  // Sin precios, solo calidad y valor.
  const previewTutors = [
    { 
      name: "Alejandro Rivera", 
      lang: "Spanish Native & English C1", 
      rating: "5.0", 
      reviews: "120",
      location: "San Salvador, SV",
      img: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=200&h=200&q=80" // Rostro latino masculino
    },
    { 
      name: "Valentina Gómez", 
      lang: "English Native (Bilingual)", 
      rating: "4.9", 
      reviews: "85",
      location: "Mexico City, MX",
      img: "https://images.unsplash.com/photo-1589156280159-27698a70f29e?auto=format&fit=crop&w=200&h=200&q=80" // Rostro latino femenino profesional
    },
    { 
      name: "Carlos Mendoza", 
      lang: "Spanish & English", 
      rating: "5.0", 
      reviews: "210",
      location: "Bogotá, CO",
      img: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=200&h=200&q=80" // Rostro latino masculino
    },
    { 
      name: "Gabriela Torres", 
      lang: "Spanish Native", 
      rating: "4.8", 
      reviews: "45",
      location: "Santa Tecla, SV",
      img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&h=200&q=80" // Rostro femenino
    },
    { 
      name: "Javier Hernández", 
      lang: "English B2 & Spanish", 
      rating: "4.9", 
      reviews: "92",
      location: "Lima, PE",
      img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80" // Rostro masculino sonriente
    },
    { 
      name: "Lucía Morales", 
      lang: "Advanced English", 
      rating: "5.0", 
      reviews: "150",
      location: "San José, CR",
      img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&h=200&q=80" // Rostro femenino profesional
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
       {/* Navbar Simple */}
       <nav className="p-6 bg-white border-b border-slate-200 sticky top-0 z-20 flex justify-between items-center shadow-sm">
        <Link href="/" className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
            Tutorio
        </Link>
        <div className="flex gap-4">
             <Link href="/login" className="hidden sm:block font-medium text-slate-600 hover:text-indigo-600 px-4 py-2">Login</Link>
             <Link href="/register" className="font-bold bg-indigo-600 text-white px-6 py-2 rounded-full hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg">
                Sign Up
             </Link>
        </div>
      </nav>

      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 py-16 px-6">
        <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Find your perfect tutor</h1>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto">
                Connect with certified tutors from Latin America and beyond. Learn at your own pace with native speakers.
            </p>
        </div>
      </div>

      {/* Grid de Tutores */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {previewTutors.map((t, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                    
                    {/* Header de la Tarjeta */}
                    <div className="p-6 flex items-start gap-4">
                        <div className="relative">
                            <img src={t.img} alt={t.name} className="w-20 h-20 rounded-full object-cover border-4 border-slate-50 shadow-sm" />
                            <div className="absolute bottom-0 right-0 bg-green-500 w-4 h-4 rounded-full border-2 border-white"></div>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors">{t.name}</h3>
                            <div className="flex items-center gap-1 text-slate-500 text-xs mb-1">
                                <MapPin className="w-3 h-3" /> {t.location}
                            </div>
                            <p className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md inline-block">
                                {t.lang}
                            </p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="px-6 pb-4 flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 font-bold text-slate-900">
                            <Star className="w-4 h-4 text-amber-500 fill-current"/> {t.rating}
                        </div>
                        <span className="text-slate-400">|</span>
                        <div className="text-slate-500">
                            {t.reviews} reviews
                        </div>
                    </div>

                    {/* Footer / CTA (SIN PRECIO) */}
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center gap-3">
                        <Link href="/register" className="flex-1 bg-white border border-slate-200 text-slate-700 py-2.5 rounded-xl font-bold text-sm text-center hover:bg-slate-100 transition-colors">
                            View Profile
                        </Link>
                        <Link href="/register" className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-bold text-sm text-center hover:bg-indigo-700 shadow-indigo-200 shadow-md transition-all">
                            Book Trial
                        </Link>
                    </div>
                </div>
            ))}
        </div>

        {/* Bloqueo "Ver Más" */}
        <div className="mt-16 text-center">
            <div className="inline-block p-1 bg-white rounded-full border border-slate-200 shadow-sm mb-6">
                <div className="flex -space-x-2 px-4 py-2">
                    {previewTutors.slice(0,4).map((t,i) => (
                        <img key={i} src={t.img} className="w-8 h-8 rounded-full border-2 border-white" />
                    ))}
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">+99</div>
                </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Want to see more tutors?</h2>
            <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-full font-bold hover:bg-slate-800 transition-all shadow-xl hover:scale-105">
                Create Free Account to Browse All
            </Link>
        </div>
      </div>
    </main>
  )
}