import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuthStore } from '../store/authStore' // To get current user and avoid self-lockout if needed
import { User, Shield, MapPin, Save, Search, Mail } from 'lucide-react'
import { useUIStore } from '../store/uiStore'

export default function Team() {
    const [team, setTeam] = useState([])
    const [locations, setLocations] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(null) // id of user being saved
    const { addToast } = useUIStore()

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            setLoading(true)
            // Fetch Profiles
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: true })

            if (profileError) throw profileError

            // Fetch Locations
            const { data: locs, error: locError } = await supabase
                .from('locations')
                .select('*')
                .order('name')

            if (locError) throw locError

            setTeam(profiles)
            setLocations(locs)
        } catch (error) {
            console.error("Error fetching team:", error)
            addToast("Failed to load team data", "error")
        } finally {
            setLoading(false)
        }
    }

    const handleUpdate = async (userId, updates) => {
        try {
            setSaving(userId)
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', userId)

            if (error) throw error

            setTeam(team.map(u => u.id === userId ? { ...u, ...updates } : u))
            addToast("User updated successfully", "success")
        } catch (error) {
            console.error("Error updating user:", error)
            addToast("Failed to update user", "error")
        } finally {
            setSaving(null)
        }
    }

    const getRoleColor = (role) => {
        switch (role) {
            case 'ADMIN': return 'text-purple-400 bg-purple-900/20 border-purple-500/30'
            case 'MANAGER': return 'text-blue-400 bg-blue-900/20 border-blue-500/30'
            default: return 'text-slate-400 bg-slate-800 border-slate-700'
        }
    }

    if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading Team Data...</div>

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
                    <p className="text-slate-500">Manage user roles, assignments, and access levels.</p>
                </div>
                {/* Could add 'Invite User' button here later */}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Assigned Location</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {team.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                <User size={20} />
                                            </div>
                                            <div>
                                                <input
                                                    type="text"
                                                    className="font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand outline-none transition-colors w-full"
                                                    defaultValue={user.full_name || ''}
                                                    placeholder="Set Name"
                                                    onBlur={(e) => {
                                                        if (e.target.value !== user.full_name) {
                                                            handleUpdate(user.id, { full_name: e.target.value })
                                                        }
                                                    }}
                                                />
                                                <div className="text-xs text-slate-400 font-mono">{user.id.slice(0, 8)}...</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Mail size={14} className="text-slate-400" />
                                            <input
                                                type="text"
                                                className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand outline-none transition-colors w-48"
                                                defaultValue={user.email || ''}
                                                placeholder="Set Email"
                                                onBlur={(e) => {
                                                    if (e.target.value !== user.email) {
                                                        handleUpdate(user.id, { email: e.target.value })
                                                    }
                                                }}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={user.role || 'CASHIER'}
                                            onChange={(e) => handleUpdate(user.id, { role: e.target.value })}
                                            className={`px-2 py-1 rounded-full text-xs font-bold border outline-none appearance-none cursor-pointer hover:opacity-80 transition-all text-center ${getRoleColor(user.role)}`}
                                        >
                                            <option value="ADMIN">ADMIN</option>
                                            <option value="MANAGER">MANAGER</option>
                                            <option value="CASHIER">CASHIER</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} className="text-slate-400" />
                                            <select
                                                value={user.assigned_location_id || ''}
                                                onChange={(e) => handleUpdate(user.id, { assigned_location_id: e.target.value || null })}
                                                className="bg-transparent text-slate-700 outline-none cursor-pointer hover:text-brand transition-colors max-w-[150px]"
                                            >
                                                <option value="">Unassigned</option>
                                                {locations.map(loc => (
                                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {saving === user.id ? (
                                            <span className="text-xs text-brand font-bold animate-pulse">Saving...</span>
                                        ) : (
                                            <div className="h-8"></div> // Placeholder to keep height
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {team.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                                        No team members found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
