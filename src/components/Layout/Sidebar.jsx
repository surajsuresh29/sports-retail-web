import { Home, Package, Truck, ShoppingCart, FileText, Users, Dumbbell } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'

const navItems = [
    { name: 'Dashboard', href: '/', icon: Home, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Inventory', href: '/inventory', icon: Package, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Transfers', href: '/transfers', icon: Truck, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Point of Sale', href: '/pos', icon: ShoppingCart, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { name: 'Sales History', href: '/sales', icon: FileText, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { name: 'Team', href: '/team', icon: Users, roles: ['ADMIN'] },
]

export default function Sidebar() {
    const { profile } = useAuthStore()

    // Filter items based on role
    const filteredNavItems = navItems.filter(item =>
        profile?.role && item.roles.includes(profile.role)
    )

    return (
        <div className="hidden md:flex flex-col w-64 bg-gradient-to-b from-amber-400 to-yellow-500 text-slate-900 border-r border-amber-500/50 shadow-xl z-20">
            <div className="h-20 flex items-center justify-center border-b border-amber-600/20 bg-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-900 p-2 rounded-xl text-amber-500 shadow-lg transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                        <Dumbbell size={24} strokeWidth={3} />
                    </div>
                    <div>
                        <h1 className="font-black text-2xl tracking-tighter text-slate-900 uppercase leading-none drop-shadow-sm">
                            Sports
                        </h1>
                        <p className="font-bold text-[10px] tracking-[0.3em] text-slate-800 uppercase leading-none mt-0.5">
                            Mart
                        </p>
                    </div>
                </div>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-2">
                {filteredNavItems.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.href}
                        className={({ isActive }) =>
                            cn(
                                "group flex items-center px-4 py-3 text-sm font-bold rounded-xl transition-all duration-200 transform",
                                isActive
                                    ? "bg-slate-900 text-amber-500 shadow-md translate-x-1"
                                    : "text-slate-800 hover:bg-white/20 hover:text-slate-900"
                            )
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon className={cn("mr-3 h-5 w-5 transition-transform", isActive ? "scale-110" : "group-hover:scale-110")} aria-hidden="true" />
                                {item.name}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>
            <div className="p-4 border-t border-amber-600/10 text-center text-xs font-semibold text-slate-700/60">
                v1.0.2
            </div>
        </div>
    )
}
