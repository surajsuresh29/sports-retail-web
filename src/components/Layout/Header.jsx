import { useAuthStore } from '../../store/authStore'
import { LogOut } from 'lucide-react'

export default function Header() {
    const { signOut, user, profile } = useAuthStore()

    return (
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
                    onClick={() => signOut()}
                    className="p-2 rounded-full hover:bg-slate-100 text-slate-600 hover:text-danger transition-colors"
                    title="Sign Out"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </header>
    )
}
