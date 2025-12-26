import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Dumbbell } from 'lucide-react'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const navigate = useNavigate()

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            navigate('/')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-400 to-yellow-500">
            <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/20">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-slate-900 p-3 rounded-2xl text-amber-500 shadow-xl transform -rotate-6 mb-4">
                        <Dumbbell size={40} strokeWidth={2.5} />
                    </div>
                    <div className="text-center">
                        <h1 className="font-black text-4xl tracking-tighter text-slate-900 uppercase leading-none mb-1">
                            Sports
                        </h1>
                        <p className="font-bold text-sm tracking-[0.4em] text-slate-600 uppercase leading-none">
                            Mart
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-6 text-sm flex items-center justify-center font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Email</label>
                        <input
                            type="email"
                            required
                            className="block w-full rounded-xl border-slate-200 bg-slate-50 focus:bg-white shadow-sm focus:border-amber-500 focus:ring-amber-500 p-3 border transition-all"
                            placeholder="user@sportsmart.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Password</label>
                        <input
                            type="password"
                            required
                            className="block w-full rounded-xl border-slate-200 bg-slate-50 focus:bg-white shadow-sm focus:border-amber-500 focus:ring-amber-500 p-3 border transition-all"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-amber-500/30 text-base font-bold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 transition-all transform hover:-translate-y-0.5"
                    >
                        {loading ? 'Logging in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    )
}
