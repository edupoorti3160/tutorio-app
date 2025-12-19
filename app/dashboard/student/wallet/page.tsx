'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { ArrowLeft, CreditCard, Copy, Check, Coins, Landmark, AlertTriangle, Info, MapPin, UploadCloud, Loader2, X } from 'lucide-react'
import Link from 'next/link'

// Credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export default function StudentWallet() {
  const router = useRouter()
  // Manual Supabase Client
  const [supabase] = useState(() => createClient(supabaseUrl, supabaseAnonKey))
  
  // State
  const [activeTab, setActiveTab] = useState<'paypal' | 'bank' | 'crypto'>('paypal')
  const [selectedCrypto, setSelectedCrypto] = useState<'USDT' | 'USDC'>('USDT')
  const [copied, setCopied] = useState(false)

  // Report State
  const [showReportModal, setShowReportModal] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [reportData, setReportData] = useState({ amount: '', reference: '' })

  // --- CONFIGURATION ---
  const CONFIG = {
    paypalLink: "https://paypal.me/angiejimenez3160", 
    
    // USA BANK DATA
    bank: {
      bankName: "LEAD BANK", 
      bankAddress: "1801 Main St, Kansas City, MO 64108",
      accountHolder: "Dora Angelica Jimenez de Portillo", 
      routingNumber: "10109644", 
      accountNumber: "216926848248", 
      accountType: "Checking" 
    },

    // CRYPTO WALLETS
    crypto: {
      USDT: "0x56bC4FD978aE9562cb3e68E6956D79f191f199Ba", 
      USDC: "0x56bC4FD978aE9562cb3e68E6956D79f191f199Ba" 
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // --- REPORT FUNCTION ---
  const handleReportPayment = async (e: React.FormEvent) => {
      e.preventDefault()
      if(!reportData.amount || !reportData.reference) return alert("Please fill all fields")
      
      setReporting(true)
      try {
          const { data: { user } } = await supabase.auth.getUser()
          if(!user) return router.push('/login')

          const { error } = await supabase.from('deposit_requests').insert({
              student_id: user.id,
              amount: parseFloat(reportData.amount),
              method: activeTab,
              reference_id: reportData.reference,
              status: 'pending'
          })

          if(error) throw error

          alert("✅ Payment reported! The admin will verify and update your balance shortly.")
          setShowReportModal(false)
          setReportData({ amount: '', reference: '' })

      } catch (error: any) {
          alert("Error reporting: " + error.message)
      } finally {
          setReporting(false)
      }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900 flex justify-center">
      <div className="w-full max-w-5xl">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/student" className="p-2 bg-white rounded-lg hover:bg-slate-100 border border-slate-200 text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Wallet & Payments</h1>
            <p className="text-slate-500">Manage your balance and payment methods.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* SIDEBAR MENU */}
          <div className="md:col-span-4 space-y-2">
            
            {/* 1. PAYPAL */}
            <button 
              onClick={() => setActiveTab('paypal')}
              className={`w-full text-left p-4 rounded-xl flex items-center gap-3 transition-all border ${activeTab === 'paypal' ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500' : 'bg-transparent border-transparent hover:bg-white'}`}
            >
              <div className={`p-2 rounded-lg ${activeTab === 'paypal' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className={`font-bold ${activeTab === 'paypal' ? 'text-blue-900' : 'text-slate-600'}`}>PayPal / Card</p>
                <p className="text-xs text-slate-400">Instant transfer</p>
              </div>
            </button>

            {/* 2. USA BANK */}
            <button 
              onClick={() => setActiveTab('bank')}
              className={`w-full text-left p-4 rounded-xl flex items-center gap-3 transition-all border ${activeTab === 'bank' ? 'bg-white border-green-600 shadow-md ring-1 ring-green-600' : 'bg-transparent border-transparent hover:bg-white'}`}
            >
              <div className={`p-2 rounded-lg ${activeTab === 'bank' ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <p className={`font-bold ${activeTab === 'bank' ? 'text-green-900' : 'text-slate-600'}`}>USA Bank Transfer</p>
                <p className="text-xs text-slate-400">ACH & Wire Transfer</p>
              </div>
            </button>

            {/* 3. CRYPTO */}
            <button 
              onClick={() => setActiveTab('crypto')}
              className={`w-full text-left p-4 rounded-xl flex items-center gap-3 transition-all border ${activeTab === 'crypto' ? 'bg-white border-orange-500 shadow-md ring-1 ring-orange-500' : 'bg-transparent border-transparent hover:bg-white'}`}
            >
              <div className={`p-2 rounded-lg ${activeTab === 'crypto' ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-500'}`}>
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <p className={`font-bold ${activeTab === 'crypto' ? 'text-orange-900' : 'text-slate-600'}`}>Crypto</p>
                <p className="text-xs text-slate-400">USDT & USDC</p>
              </div>
            </button>
          </div>

          {/* CONTENT AREA */}
          <div className="md:col-span-8 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 min-h-[400px]">
              
              {/* PAYPAL VIEW */}
              {activeTab === 'paypal' && (
                <div className="flex flex-col items-center text-center space-y-6 animate-fadeIn">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-10 mb-2" />
                  <h2 className="text-xl font-bold text-slate-800">Secure Payment</h2>
                  <p className="text-slate-500 max-w-md text-sm">
                    Pay securely using your PayPal balance or any Credit/Debit Card.
                  </p>
                  
                  <div className="grid grid-cols-3 gap-3 w-full max-w-sm mt-4">
                      {[20, 50, 100].map((amount) => (
                        <a 
                          key={amount}
                          href={`${CONFIG.paypalLink}/${amount}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="py-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all font-bold text-slate-700 hover:text-blue-700 flex flex-col items-center"
                        >
                          <span className="text-lg">${amount}</span>
                        </a>
                      ))}
                  </div>
                  <a href={CONFIG.paypalLink} target="_blank" className="text-sm text-blue-600 font-semibold hover:underline mt-4">
                    Custom Amount &rarr;
                  </a>
                </div>
              )}

              {/* BANK VIEW */}
              {activeTab === 'bank' && (
                <div className="flex flex-col animate-fadeIn space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-green-100 rounded-full text-green-700"><Landmark className="w-6 h-6"/></div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">USA Bank Account</h2>
                        <p className="text-xs text-slate-500">For Wire or ACH Transfers.</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-white p-3 rounded-lg border border-slate-200">
                                <p className="text-xs text-slate-400">Bank Name</p>
                                <p className="font-medium text-slate-800">{CONFIG.bank.bankName}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-200">
                                <p className="text-xs text-slate-400">Account Type</p>
                                <p className="font-medium text-slate-800">{CONFIG.bank.accountType}</p>
                            </div>
                            <div className="sm:col-span-2 bg-white p-3 rounded-lg border border-slate-200">
                                <p className="text-xs text-slate-400">Bank Address</p>
                                <div className="flex justify-between">
                                    <p className="font-medium text-slate-800 text-sm flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-slate-400"/> {CONFIG.bank.bankAddress}
                                    </p>
                                    <button onClick={() => handleCopy(CONFIG.bank.bankAddress)}><Copy className="w-3 h-3 text-slate-400"/></button>
                                </div>
                            </div>
                            <div className="sm:col-span-2 bg-white p-3 rounded-lg border border-slate-200">
                                <p className="text-xs text-slate-400">Beneficiary (Account Holder)</p>
                                <div className="flex justify-between">
                                    <p className="font-medium text-slate-800">{CONFIG.bank.accountHolder}</p>
                                    <button onClick={() => handleCopy(CONFIG.bank.accountHolder)}><Copy className="w-3 h-3 text-slate-400"/></button>
                                </div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-200">
                                <p className="text-xs text-slate-400">Routing Number (ACH/ABA)</p>
                                <div className="flex justify-between">
                                    <p className="font-mono font-medium text-slate-800">{CONFIG.bank.routingNumber}</p>
                                    <button onClick={() => handleCopy(CONFIG.bank.routingNumber)}><Copy className="w-3 h-3 text-slate-400"/></button>
                                </div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-200">
                                <p className="text-xs text-slate-400">Account Number</p>
                                <div className="flex justify-between">
                                    <p className="font-mono font-medium text-slate-800">{CONFIG.bank.accountNumber}</p>
                                    <button onClick={() => handleCopy(CONFIG.bank.accountNumber)}><Copy className="w-3 h-3 text-slate-400"/></button>
                                </div>
                            </div>
                        </div>
                  </div>
                  
                  <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-lg text-xs text-blue-700">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>Compatible with domestic USA transfers (Chase, Wells Fargo, Cash App, Venmo, etc.) using Routing & Account number.</p>
                  </div>
                </div>
              )}

              {/* CRYPTO VIEW */}
              {activeTab === 'crypto' && (
                <div className="flex flex-col animate-fadeIn items-center">
                    
                    {/* TOGGLE BUTTONS */}
                    <div className="flex justify-center gap-2 mb-6">
                        <button 
                          onClick={() => setSelectedCrypto('USDT')} 
                          className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${selectedCrypto === 'USDT' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-500'}`}
                        >
                          Tether (USDT)
                        </button>
                        <button 
                          onClick={() => setSelectedCrypto('USDC')} 
                          className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${selectedCrypto === 'USDC' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}
                        >
                          USD Coin (USDC)
                        </button>
                    </div>
                    
                    {/* WARNING BANNER */}
                    <div className="w-full max-w-md bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl mb-6 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="text-xs">
                           <p className="font-bold uppercase mb-1">⚠️ Important Network Warning</p>
                           <p>Please send only <strong>{selectedCrypto}</strong> using the <strong>BEP20 (Binance Smart Chain)</strong> network.</p>
                           <p className="mt-1">Sending via other networks (like ERC20 or TRC20) may result in permanent loss of funds.</p>
                        </div>
                    </div>

                    {/* QR CODE */}
                    <div className="bg-white p-3 rounded-xl border-2 border-slate-100 shadow-inner mb-4">
                       <img 
                         src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${CONFIG.crypto[selectedCrypto]}`} 
                         alt="QR Code" 
                         className="w-40 h-40 mix-blend-multiply"
                       />
                    </div>
                    
                    {/* ADDRESS COPY */}
                    <div className="w-full max-w-md">
                        <p className="text-xs text-center text-slate-400 mb-2 uppercase font-bold">Deposit Address ({selectedCrypto} - BEP20)</p>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-2">
                            <code className="px-2 text-xs md:text-sm text-slate-600 font-mono break-all flex-1 text-center">
                              {CONFIG.crypto[selectedCrypto]}
                            </code>
                            <button 
                              onClick={() => handleCopy(CONFIG.crypto[selectedCrypto])}
                              className="p-2 bg-white hover:bg-slate-100 rounded-lg text-slate-600 shadow-sm border border-slate-200"
                            >
                              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                </div>
              )}
            </div>

            {/* REPORT PAYMENT BUTTON */}
            <div className="bg-indigo-900 text-white p-6 rounded-2xl flex justify-between items-center shadow-lg">
                <div>
                    <h3 className="font-bold text-lg">Already made the payment?</h3>
                    <p className="text-indigo-200 text-sm">Let us know so we can update your balance.</p>
                </div>
                <button 
                    onClick={() => setShowReportModal(true)}
                    className="bg-white text-indigo-900 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors flex items-center gap-2"
                >
                    <UploadCloud className="w-5 h-5"/> Report Payment
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* REPORT MODAL */}
      {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-xl text-slate-900">Report Payment</h3>
                      <button onClick={() => setShowReportModal(false)}><X className="w-6 h-6 text-slate-400 hover:text-slate-600"/></button>
                  </div>
                  
                  <form onSubmit={handleReportPayment} className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Amount Sent ($)</label>
                          <input 
                              type="number" 
                              step="0.01" 
                              required
                              placeholder="e.g. 50.00"
                              className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-lg"
                              value={reportData.amount}
                              onChange={e => setReportData({...reportData, amount: e.target.value})}
                          />
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Transaction ID / Reference</label>
                          <input 
                              type="text" 
                              required
                              placeholder="e.g. PayPal Transaction ID or Hash"
                              className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                              value={reportData.reference}
                              onChange={e => setReportData({...reportData, reference: e.target.value})}
                          />
                      </div>

                      <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 flex gap-2">
                          <Info className="w-4 h-4 shrink-0"/>
                          <p>We will verify the transaction with <strong>{activeTab.toUpperCase()}</strong>. This usually takes 1-2 hours.</p>
                      </div>

                      <button 
                          type="submit" 
                          disabled={reporting}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-70 flex justify-center gap-2"
                      >
                          {reporting ? <Loader2 className="w-5 h-5 animate-spin"/> : "Submit Report"}
                      </button>
                  </form>
              </div>
          </div>
      )}

    </div>
  )
}
