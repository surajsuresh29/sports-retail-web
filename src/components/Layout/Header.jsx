import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { LogOut, AlertTriangle } from 'lucide-react'

export default function Header() {
    const { signOut, user, profile } = useAuthStore()
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

    const handleLogout = () => {
        signOut()
        setShowLogoutConfirm(false)
    }

    return (
        <>
            <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 z-10">
                <h2 className="text-xl font-semibold text-slate-800">
                    Results
                </h2>
                <div className="flex items-center space-x-4">
                    <div className="flex flex-col text-right">
                        <span className="text-sm font-medium text-slate-900">{user?.email}</span>
                        <span className="text-xs text-slate-500 capitalize">{profile?.role || 'User'}</span>
                    </div>
                    <button
                        onClick={() => setShowLogoutConfirm(true)}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-600 hover:text-danger transition-colors"
                        title="Sign Out"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 p-6">
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-red-100 p-3 rounded-full mb-4">
                                <AlertTriangle className="text-red-600 h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Sign Out?</h3>
                            <p className="text-slate-500 mb-6">
                                Are you sure you want to end your session? You will need to log in again to access the system.
                            </p>

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setShowLogoutConfirm(false)}
                                    className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg shadow-red-500/30 transition-colors"
                                >
                                    Log Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
