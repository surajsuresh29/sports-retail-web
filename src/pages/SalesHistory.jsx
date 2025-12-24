import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuthStore } from '../store/authStore'
import { Search, Printer, Eye, Filter } from 'lucide-react'
import { InvoiceDisplay } from '../components/POS/InvoiceDisplay'

export default function SalesHistory() {
    const { profile } = useAuthStore()
    const [transactions, setTransactions] = useState([])
    const [invoices, setInvoices] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [locationFilter, setLocationFilter] = useState('')
    const [locations, setLocations] = useState([])

    // For printing
    const [selectedInvoice, setSelectedInvoice] = useState(null)
    const [showPrintPreview, setShowPrintPreview] = useState(false)

    useEffect(() => {
        fetchLocations()
        fetchTransactions()
    }, [])

    useEffect(() => {
        processInvoices()
    }, [transactions, search, locationFilter])

    const fetchLocations = async () => {
        const { data } = await supabase.from('locations').select('*').eq('type', 'STORE')
        if (data) setLocations(data)
    }

    const fetchTransactions = async () => {
        setLoading(true)
        // Fetch last 500 sales
        const { data, error } = await supabase
            .from('transactions')
            .select(`
                *,
                products (name, sku, price, hsn_code, gst_rate),
                locations:from_location_id (name)
            `)
            .eq('type', 'SALE')
            .order('created_at', { ascending: false })
            .limit(500)

        if (data) {
            setTransactions(data)
        }
        setLoading(false)
    }

    const processInvoices = () => {
        // Group by invoice_id
        const groups = {}

        transactions.forEach(tx => {
            // Fallback for legacy data without invoice_id: Group by timestamp approx? 
            // Or just ignore/treat as single items. 
            // For now, let's group by invoice_id if present, else separate.
            const key = tx.invoice_id || `legacy-${tx.id}`

            if (!groups[key]) {
                groups[key] = {
                    invoice_id: tx.invoice_id,
                    date: new Date(tx.created_at),
                    customer_name: tx.customer_name,
                    customer_phone: tx.customer_phone,
                    location_name: tx.locations?.name,
                    location_id: tx.from_location_id,
                    items: [],
                    totalAmount: 0,
                    totalQty: 0
                }
            }

            // Reconstruct Cart Item format
            const itemTotal = (tx.sale_price || 0) * tx.quantity
            groups[key].items.push({
                name: tx.products?.name || 'Unknown Product',
                qty: tx.quantity,
                price: tx.sale_price,
                hsn_code: tx.products?.hsn_code,
                gst_rate: tx.products?.gst_rate,
                // ... other needed fields for invoice
            })
            groups[key].totalAmount += itemTotal
            groups[key].totalQty += tx.quantity
        })

        // Convert to array and sort
        let result = Object.values(groups).sort((a, b) => b.date - a.date)

        // Filter
        if (locationFilter) {
            result = result.filter(inv => inv.location_id == locationFilter)
        }
        if (search) {
            const q = search.toLowerCase()
            result = result.filter(inv =>
                (inv.customer_name && inv.customer_name.toLowerCase().includes(q)) ||
                (inv.customer_phone && inv.customer_phone.includes(q)) ||
                (inv.invoice_id && inv.invoice_id.toLowerCase().includes(q))
            )
        }

        setInvoices(result)
    }

    const handlePrint = (invoice) => {
        setSelectedInvoice(invoice)
        // Need a slight delay for state to update and DOM to render the InvoiceDisplay
        setTimeout(() => {
            window.print()
        }, 100)
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Sales History</h1>
                <div className="flex gap-4">
                    <select
                        className="bg-white border text-sm rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                    >
                        <option value="">All Stores</option>
                        {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                    </select>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search Customer or Invoice..."
                            className="bg-white pl-10 pr-4 py-2 border rounded-md text-sm w-64 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan="6" className="px-6 py-4 text-center">Loading sales...</td></tr>
                        ) : invoices.length === 0 ? (
                            <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-500">No sales found</td></tr>
                        ) : (
                            invoices.map((inv, idx) => (
                                <tr key={inv.invoice_id || idx} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {inv.date.toLocaleDateString()} {inv.date.toLocaleTimeString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                                        {inv.invoice_id ? inv.invoice_id.slice(0, 8) + '...' : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {inv.location_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {inv.customer_name ? (
                                            <div>
                                                <div className="font-medium">{inv.customer_name}</div>
                                                <div className="text-xs text-gray-500">{inv.customer_phone}</div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 italic">Walk-in</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600">
                                        ₹{inv.totalAmount.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                        <button
                                            onClick={() => handlePrint(inv)}
                                            className="text-indigo-600 hover:text-indigo-900 flex items-center justify-center gap-1 mx-auto"
                                        >
                                            <Printer size={16} /> Print
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Hidden Printable Invoice */}
            {selectedInvoice && (
                <InvoiceDisplay
                    cart={selectedInvoice.items}
                    subtotal={selectedInvoice.totalAmount} // Simplified for history (assuming no separate subtotal/discount stored)
                    discount={{ type: 'FIXED', value: 0, amount: 0 }} // Legacy/Simplification: We didn't store discount in transactions? 
                    // Ah, slight issue: Transactions store 'sale_price' which is effective price. 
                    // So 'totalAmount' IS the final total.
                    // Subtotal vs Total reconstruction is tricky if we don't store them.
                    // For now, let's treat Subtotal = Total and Discount = 0 for reprinted bills unless we add columns.
                    total={selectedInvoice.totalAmount}
                    user={{}} // Not really needed for reprint
                    profile={{ role: 'Reprint' }}
                    locationName={selectedInvoice.location_name}
                    customerDetails={{ name: selectedInvoice.customer_name, phone: selectedInvoice.customer_phone }}
                />
            )}
        </div>
    )
}
