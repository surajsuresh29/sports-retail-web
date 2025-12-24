import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { X, Search } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

export default function StockInwardModal({ isOpen, onClose, onSuccess }) {
    const { user } = useAuthStore()
    const [products, setProducts] = useState([])
    const [search, setSearch] = useState('')
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [quantity, setQuantity] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (isOpen) {
            fetchProducts()
        }
    }, [isOpen])

    const fetchProducts = async () => {
        const { data } = await supabase
            .from('products')
            .select('id, name, sku')
            .or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
            .limit(10)
        if (data) setProducts(data)
    }

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(fetchProducts, 500)
        return () => clearTimeout(timer)
    }, [search])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!selectedProduct) return
        setLoading(true)
        setError(null)

        try {
            // 1. Get Warehouse Location ID (Assuming ID 1 is warehouse based on seed, 
            //    or we could fetch it dynamically. For safety, let's fetch it.)
            const { data: warehouse, error: locError } = await supabase
                .from('locations')
                .select('id')
                .eq('type', 'WAREHOUSE')
                .single()

            if (locError) throw new Error("Warehouse location not found")

            // 2. Call RPC or perform transaction. Since Supabase-js doesn't support complex transactions easily without RPC,
            // we will do it in two steps (not atomic, but fine for this MVP level).
            // Ideally, use a PostgreSQL function.

            // Step A: Update Inventory (Upsert)
            // Check if row exists
            const { data: existingInv } = await supabase
                .from('inventory')
                .select('quantity')
                .match({ product_id: selectedProduct.id, location_id: warehouse.id })
                .single()

            const newQty = (existingInv?.quantity || 0) + parseInt(quantity)

            const { error: invError } = await supabase
                .from('inventory')
                .upsert({
                    product_id: selectedProduct.id,
                    location_id: warehouse.id,
                    quantity: newQty
                })

            if (invError) throw invError

            // Step B: Log Transaction
            const { error: txError } = await supabase
                .from('transactions')
                .insert({
                    type: 'PURCHASE',
                    product_id: selectedProduct.id,
                    to_location_id: warehouse.id,
                    quantity: parseInt(quantity),
                    // from_location_id is null for purchase (from supplier)
                })

            if (txError) throw txError

            onSuccess()
            onClose()
        } catch (err) {
            console.error(err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-bold text-slate-800">Stock Inward (Purchase)</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Search Product</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by Name or SKU..."
                                className="pl-10 block w-full rounded-md border-gray-300 border p-2"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        {/* Dropdown results */}
                        {products.length > 0 && !selectedProduct && search && (
                            <div className="absolute z-10 w-[90%] md:w-[24rem] bg-white border shadow-lg max-h-40 overflow-auto mt-1 rounded-md">
                                {products.map(p => (
                                    <div
                                        key={p.id}
                                        className="p-2 hover:bg-slate-100 cursor-pointer"
                                        onClick={() => {
                                            setSelectedProduct(p)
                                            setSearch(p.name)
                                        }}
                                    >
                                        <div className="font-medium">{p.name}</div>
                                        <div className="text-xs text-slate-500">{p.sku}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {selectedProduct && (
                            <div className="mt-2 text-sm bg-blue-50 text-blue-700 p-2 rounded flex justify-between items-center">
                                <span>Selected: <strong>{selectedProduct.name}</strong></span>
                                <button
                                    type="button"
                                    onClick={() => { setSelectedProduct(null); setSearch('') }}
                                    className="text-xs underline"
                                >
                                    Change
                                </button>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Quantity</label>
                        <input
                            type="number"
                            required
                            min="1"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary border p-2"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="mr-3 px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !selectedProduct}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : 'Add Stock'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
