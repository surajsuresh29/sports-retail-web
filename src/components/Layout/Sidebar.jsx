import { Home, Package, Truck, ShoppingCart, FileText } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/utils'

const navItems = [
    { name: 'Dashboard', href: '/', icon: Home, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Inventory', href: '/inventory', icon: Package, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Transfers', href: '/transfers', icon: Truck, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Point of Sale', href: '/pos', icon: ShoppingCart, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { name: 'Sales History', href: '/sales', icon: FileText, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
]

export default function Sidebar() {
    return (
        <div className="hidden md:flex flex-col w-64 bg-slate-900 text-white">
            <div className="h-16 flex items-center justify-center font-bold text-xl border-b border-slate-700">
                Retail Hub
            </div>
            <nav className="flex-1 px-2 py-4 space-y-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.href}
                        className={({ isActive }) =>
                            cn(
                                "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                                isActive
                                    ? "bg-slate-800 text-white"
                                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            )
                        }
                    >
                        <item.icon className="mr-3 h-6 w-6" aria-hidden="true" />
                        {item.name}
                    </NavLink>
                ))}
            </nav>
        </div>
    )
}
