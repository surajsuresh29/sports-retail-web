import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuthStore } from '../store/authStore'
import { DollarSign, AlertTriangle, Activity, Package } from 'lucide-react'

export default function Dashboard() {
    const { user, profile } = useAuthStore()
    const [stats, setStats] = useState({
        salesToday: 0,
        salesCountToday: 0,
        lowStockItems: 0,
        pendingTransfers: 0,
        activeProducts: 0
    })
    const [recentTx, setRecentTx] = useState([])
    const [locationStats, setLocationStats] = useState([])
    const [loading, setLoading] = useState(true)

    // Low Stock Modal State
    const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false)
    const [lowStockProducts, setLowStockProducts] = useState([])

    // Sales Modal State
    const [isSalesModalOpen, setIsSalesModalOpen] = useState(false)
    const [todaysSales, setTodaysSales] = useState([])

    // Transfers Modal State
    const [isTransfersModalOpen, setIsTransfersModalOpen] = useState(false)
    const [pendingTransfersList, setPendingTransfersList] = useState([])

    const [allLocations, setAllLocations] = useState([])

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        setLoading(true)
        try {
            const today = new Date().toISOString().split('T')[0]

            // 1. Sales Today (Sum of transactions type=SALE created today)
            const { data: salesData, error: salesError } = await supabase
                .from('transactions')
                .select('*, product:products(name, price), from_location:from_location_id(name)') // Added from_location and name
                .eq('type', 'SALE')
                .gte('created_at', today)
                .order('created_at', { ascending: false })

            let totalSales = 0
            if (salesData) {
                totalSales = salesData.reduce((acc, tx) => acc + (tx.quantity * (tx.product?.price || 0)), 0)
                setTodaysSales(salesData)
            }

            // 2. Low Stock Items (Global count for Admin, or local?)
            // We'll Fetch Warehouse ID first to check Godown Stock specifically
            const { data: warehouse } = await supabase.from('locations').select('id').eq('type', 'WAREHOUSE').single()

            // Fetch all products + warehouse stock
            const { data: productsData } = await supabase
                .from('products')
                .select('*, inventory(quantity, location_id)')

            let lowStockCount = 0
            if (productsData && warehouse) {
                const lowStockList = productsData.filter(p => {
                    const warehouseInv = p.inventory.find(i => i.location_id === warehouse.id)
                    const stock = warehouseInv ? warehouseInv.quantity : 0
                    return stock <= p.min_stock_alert
                })
                lowStockCount = lowStockList.length
                setLowStockProducts(lowStockList)
            }

            // 3. Pending Transfers
            const { data: pendingData, count: pendingCount } = await supabase
                .from('transactions')
                .select('*, product:products(name, sku), from_location:from_location_id(name), to_location:to_location_id(name)', { count: 'exact' })
                .eq('status', 'PENDING')
                .eq('type', 'TRANSFER_OUT')

            if (pendingData) setPendingTransfersList(pendingData)

            setStats({
                salesToday: totalSales,
                salesCountToday: salesData?.length || 0,
                lowStockItems: lowStockCount,
                pendingTransfers: pendingCount || 0,
                activeProducts: productsData?.length || 0
            })

            // 4. Recent Transactions
            const { data: recents } = await supabase
                .from('transactions')
                .select('*, product:products(name), from_location:from_location_id(name), to_location:to_location_id(name)')
                .order('created_at', { ascending: false })
                .limit(5)

            // 5. Location Stats (Aggregated Stock)
            const { data: locations } = await supabase.from('locations').select('*').order('id')

            const locMap = {}
            if (locations && productsData) {
                setAllLocations(locations)
                // Initialize map
                locations.forEach(l => locMap[l.id] = { ...l, totalStock: 0, totalValue: 0 })

                // Aggregate
                productsData.forEach(p => {
                    p.inventory.forEach(i => {
                        if (locMap[i.location_id]) {
                            locMap[i.location_id].totalStock += i.quantity
                            locMap[i.location_id].totalValue += (i.quantity * p.price)
                        }
                    })
                })
            }
            setLocationStats(Object.values(locMap).sort((a, b) => a.type === 'WAREHOUSE' ? -1 : 1)) // Warehouse first

        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const StatCard = ({ title, value, sub, icon: Icon, color, onClick }) => (
        <div
            onClick={onClick}
            className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-500 font-medium text-sm">{title}</h3>
                <div className={`p-2 rounded-full ${color} bg-opacity-10`}>
                    <Icon size={20} className={color.replace('bg-', 'text-')} />
                </div>
            </div>
            <div className="text-2xl font-bold text-slate-800">{value}</div>
            <div className="text-xs text-slate-400 mt-1">{sub}</div>
        </div>
    )

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
                <p className="text-slate-500">Welcome back, {profile?.role || 'User'}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Sales Today"
                    value={`₹${stats.salesToday.toLocaleString()}`}
                    sub={`${stats.salesCountToday} transactions`}
                    icon={DollarSign}
                    color="text-green-600 bg-green-600"
                    onClick={() => setIsSalesModalOpen(true)}
                />
                <StatCard
                    title="Low Stock Alerts"
                    value={stats.lowStockItems}
                    sub="Products below min level"
                    icon={AlertTriangle}
                    color="text-red-500 bg-red-500"
                    onClick={() => setIsLowStockModalOpen(true)}
                />
                <StatCard
                    title="Pending Transfers"
                    value={stats.pendingTransfers}
                    sub="Waiting to be received"
                    icon={Activity}
                    color="text-amber-500 bg-amber-500"
                    onClick={() => setIsTransfersModalOpen(true)}
                />
                <StatCard
                    title="Active Products"
                    value={stats.activeProducts}
                    sub="In System"
                    icon={Package}
                    color="text-blue-500 bg-blue-500"
                />
            </div>

            {/* Location Overview Section */}
            <div>
                <h2 className="text-xl font-bold text-slate-800 mb-4">Live Inventory by Location</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {locationStats.map(loc => (
                        <div key={loc.id} className={`p-6 rounded-xl border ${loc.type === 'WAREHOUSE' ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-800 border-slate-200 shadow-sm'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-lg">{loc.name}</h3>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${loc.type === 'WAREHOUSE' ? 'bg-slate-600 text-slate-200' : 'bg-slate-100 text-slate-500'}`}>
                                        {loc.type}
                                    </span>
                                </div>
                                <Package size={24} className="opacity-50" />
                            </div>
                            <div className="mt-4">
                                <div className="text-3xl font-bold">{loc.totalStock}</div>
                                <div className={`text-xs ${loc.type === 'WAREHOUSE' ? 'text-slate-400' : 'text-slate-500'}`}>Units in Stock</div>
                            </div>
                            <div className="mt-2 text-sm opacity-80">
                                Value: ₹{loc.totalValue.toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                    <h3 className="font-bold text-slate-800">Recent Activity</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="px-6 py-3">Time</th>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3">Details</th>
                                <th className="px-6 py-3 text-right">Qty</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {recentTx.map((tx) => (
                                <tr key={tx.id}>
                                    <td className="px-6 py-3 text-slate-500">
                                        {new Date(tx.created_at).toLocaleTimeString()}
                                    </td>
                                    <td className="px-6 py-3 font-medium capitalize">{tx.type.replace('_', ' ').toLowerCase()}</td>
                                    <td className="px-6 py-3 text-slate-600">
                                        {tx.product?.name} ({tx.from_location?.name || 'Supplier'} {'->'} {tx.to_location?.name || 'Customer'})
                                    </td>
                                    <td className="px-6 py-3 text-right font-bold">{tx.quantity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Low Stock Filter Modal */}
            {isLowStockModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <AlertTriangle className="text-red-500" />
                                Low Stock Report
                            </h2>
                            <button
                                onClick={() => setIsLowStockModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-0 overflow-auto flex-1">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-700 font-bold sticky top-0">
                                    <tr>
                                        <th className="px-6 py-4 border-b">Product</th>
                                        <th className="px-6 py-4 border-b">Min Alert</th>
                                        {allLocations.map(loc => (
                                            <th key={loc.id} className="px-4 py-4 border-b text-center whitespace-nowrap">
                                                {loc.name}
                                                <span className="block text-xs font-normal text-slate-500">{loc.type}</span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {lowStockProducts.map(product => (
                                        <tr key={product.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-3 font-medium text-slate-900">
                                                {product.name}
                                                <div className="text-xs text-slate-500">{product.sku}</div>
                                            </td>
                                            <td className="px-6 py-3 text-red-600 font-bold">
                                                {product.min_stock_alert}
                                            </td>
                                            {allLocations.map(loc => {
                                                const stock = product.inventory.find(i => i.location_id === loc.id)?.quantity || 0
                                                const isExhausted = stock === 0
                                                const isLow = loc.type === 'WAREHOUSE' && stock <= product.min_stock_alert

                                                return (
                                                    <td key={loc.id} className={`px-4 py-3 text-center border-l border-slate-100 ${isLow ? 'bg-red-50 text-red-700 font-bold' : ''}`}>
                                                        {stock}
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    ))}
                                    {lowStockProducts.length === 0 && (
                                        <tr>
                                            <td colSpan={allLocations.length + 2} className="p-8 text-center text-slate-500">
                                                All products are well stocked!
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 border-t border-slate-200 bg-slate-50 text-right">
                            <button
                                onClick={() => setIsLowStockModalOpen(false)}
                                className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sales Details Modal */}
            {isSalesModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <DollarSign className="text-green-600" />
                                Today's Sales Details
                            </h2>
                            <button onClick={() => setIsSalesModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <div className="p-0 overflow-auto flex-1">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-700 font-bold sticky top-0">
                                    <tr>
                                        <th className="px-6 py-4 border-b">Time</th>
                                        <th className="px-6 py-4 border-b">Shop/Location</th>
                                        <th className="px-6 py-4 border-b">Product</th>
                                        <th className="px-6 py-4 border-b text-right">Qty</th>
                                        <th className="px-6 py-4 border-b text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {todaysSales.map(tx => (
                                        <tr key={tx.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-3 text-slate-500">{new Date(tx.created_at).toLocaleTimeString()}</td>
                                            <td className="px-6 py-3 text-slate-900">{tx.from_location?.name}</td>
                                            <td className="px-6 py-3 font-medium">{tx.product?.name}</td>
                                            <td className="px-6 py-3 text-right font-bold">{tx.quantity}</td>
                                            <td className="px-6 py-3 text-right text-green-700 font-bold">₹{(tx.quantity * (tx.sale_price || tx.product?.price || 0)).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                    {todaysSales.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-slate-500">No sales yet today.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t border-slate-200 bg-slate-50 text-right">
                            <button onClick={() => setIsSalesModalOpen(false)} className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pending Transfers Modal */}
            {isTransfersModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Activity className="text-amber-500" />
                                Pending Stock Transfers
                            </h2>
                            <button onClick={() => setIsTransfersModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <div className="p-0 overflow-auto flex-1">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-700 font-bold sticky top-0">
                                    <tr>
                                        <th className="px-6 py-4 border-b">Date</th>
                                        <th className="px-6 py-4 border-b">From</th>
                                        <th className="px-6 py-4 border-b">To</th>
                                        <th className="px-6 py-4 border-b">Product</th>
                                        <th className="px-6 py-4 border-b text-center">Qty</th>
                                        <th className="px-6 py-4 border-b text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {pendingTransfersList.map(tx => (
                                        <tr key={tx.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-3 text-slate-500">{new Date(tx.created_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-3 text-slate-900">{tx.from_location?.name}</td>
                                            <td className="px-6 py-3 text-slate-900">{tx.to_location?.name}</td>
                                            <td className="px-6 py-3 font-medium">{tx.product?.name}</td>
                                            <td className="px-6 py-3 text-center font-bold">{tx.quantity}</td>
                                            <td className="px-6 py-3 text-center">
                                                <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-bold">PENDING</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {pendingTransfersList.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-500">No pending transfers.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t border-slate-200 bg-slate-50 text-right">
                            <button onClick={() => setIsTransfersModalOpen(false)} className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
