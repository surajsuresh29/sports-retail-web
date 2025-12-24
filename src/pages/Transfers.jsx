import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuthStore } from '../store/authStore'
import { Plus, ArrowRight, CheckCircle, Clock, Search } from 'lucide-react'
import CreateTransferModal from '../components/Transfers/CreateTransferModal'
import { clsx } from 'clsx'

export default function Transfers() {
    const { user, profile } = useAuthStore()
    const [transactions, setTransactions] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const [filter, setFilter] = useState('ALL') // ALL, PENDING
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        fetchTransactions()
    }, [filter])

    const fetchTransactions = async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('transactions')
                .select(`
          *,
          product:products(name, sku),
          from_location:from_location_id(name),
          to_location:to_location_id(name)
        `)
                .in('type', ['TRANSFER_OUT', 'TRANSFER_IN'])
                .order('created_at', { ascending: false })

            if (filter === 'PENDING') {
                query = query.eq('status', 'PENDING').eq('type', 'TRANSFER_OUT')
            }

            const { data, error } = await query
            if (error) throw error
            setTransactions(data)
        } catch (error) {
            console.error('Error fetching transfers:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleReceive = async (tx) => {
        if (!confirm(`Receive ${tx.quantity} units of ${tx.product.name}?`)) return

        try {
            // 1. Update Destination Inventory
            // Get current stock
            const { data: invData } = await supabase
                .from('inventory')
                .select('quantity')
                .match({ product_id: tx.product_id, location_id: tx.to_location_id })
                .single()

            const currentQty = invData?.quantity || 0

            const { error: upsertError } = await supabase
                .from('inventory')
                .upsert({
                    product_id: tx.product_id,
                    location_id: tx.to_location_id,
                    quantity: currentQty + tx.quantity
                })
            if (upsertError) throw upsertError

            // 2. Update Transaction Status
            const { error: updateError } = await supabase
                .from('transactions')
                .update({ status: 'COMPLETED' })
                .eq('id', tx.id)

            if (updateError) throw updateError

            // 3. Log TRANSFER_IN (Optional, but good for history)
            await supabase.from('transactions').insert({
                type: 'TRANSFER_IN',
                product_id: tx.product_id,
                from_location_id: tx.from_location_id,
                to_location_id: tx.to_location_id,
                quantity: tx.quantity,
                status: 'COMPLETED'
            })

            fetchTransactions()
            alert('Stock Received Successfully!')
        } catch (err) {
            console.error(err)
            alert('Error receiving stock: ' + err.message)
        }
    }

    const canReceive = (tx) => {
        // Only allow receive if pending, user is not null, and user's assigned location matches the destination
        // OR if user is ADMIN, he can technically force receive, but logic says "Shop Manager sees pending..."
        if (tx.status !== 'PENDING') return false

        if (profile?.role === 'ADMIN') return true
        if (profile?.role === 'MANAGER' && profile?.assigned_location_id === tx.to_location_id) return true

        return false
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Stock Transfers</h1>
                    <p className="text-slate-500">Track movement of goods between warehouses and shops</p>
                </div>
                {profile?.role === 'ADMIN' && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
                    >
                        <Plus size={20} className="mr-2" />
                        New Transfer
                    </button>
                )}
            </div>

            <div className="flex space-x-2 border-b border-slate-200">
                <button
                    onClick={() => setFilter('ALL')}
                    className={clsx(
                        "px-4 py-2 text-sm font-medium",
                        filter === 'ALL' ? "text-primary border-b-2 border-primary" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    All History
                </button>
                <button
                    onClick={() => setFilter('PENDING')}
                    className={clsx(
                        "px-4 py-2 text-sm font-medium",
                        filter === 'PENDING' ? "text-primary border-b-2 border-primary" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    Pending Receive
                </button>
            </div>

            <div className="flex justify-end px-1">
                <div className="relative w-64">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search By Product or SKU..."
                        className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-full focus:ring-primary focus:border-primary"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">From</th>
                                <th className="px-6 py-4">To</th>
                                <th className="px-6 py-4">Product</th>
                                <th className="px-6 py-4 text-center">Qty</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="8" className="px-6 py-8 text-center text-slate-500">Loading transfers...</td></tr>
                            ) : transactions.length === 0 ? (
                                <tr><td colSpan="8" className="px-6 py-8 text-center text-slate-500">No transfers found.</td></tr>
                            ) : (
                                transactions
                                    .filter(tx => {
                                        if (!searchTerm) return true
                                        const term = searchTerm.toLowerCase()
                                        return (
                                            tx.product?.name?.toLowerCase().includes(term) ||
                                            tx.product?.sku?.toLowerCase().includes(term)
                                        )
                                    })
                                    .map((tx) => (
                                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 text-slate-500">
                                                {new Date(tx.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={clsx(
                                                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                                    tx.type === 'TRANSFER_OUT' ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
                                                )}>
                                                    {tx.type === 'TRANSFER_OUT' ? 'Dispatch' : 'Received'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-900">{tx.from_location?.name || '-'}</td>
                                            <td className="px-6 py-4 text-slate-900">{tx.to_location?.name || '-'}</td>
                                            <td className="px-6 py-4 font-medium">{tx.product?.name}</td>
                                            <td className="px-6 py-4 text-center font-bold">{tx.quantity}</td>
                                            <td className="px-6 py-4 text-center">
                                                {tx.status === 'PENDING' ? (
                                                    <span className="flex items-center justify-center text-amber-600 gap-1 text-xs">
                                                        <Clock size={16} /> Pending
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center justify-center text-green-600 gap-1 text-xs">
                                                        <CheckCircle size={16} /> Done
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {canReceive(tx) && (
                                                    <button
                                                        onClick={() => handleReceive(tx)}
                                                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                                                    >
                                                        Receive Stock
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <CreateTransferModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchTransactions}
            />
        </div>
    )
}
