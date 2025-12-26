import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { X, Search } from 'lucide-react'

export default function CreateTransferModal({ isOpen, onClose, onSuccess }) {
    const [locations, setLocations] = useState([])
    const [products, setProducts] = useState([])
    const [search, setSearch] = useState('')
    const [selectedProduct, setSelectedProduct] = useState(null)

    const [fromLocationId, setFromLocationId] = useState('')
    const [toLocationId, setToLocationId] = useState('')
    const [quantity, setQuantity] = useState('')
    const [autoReceive, setAutoReceive] = useState(false)

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [warehouseStock, setWarehouseStock] = useState(0)

    useEffect(() => {
        if (isOpen) {
            fetchLocations()
            fetchProducts()
        }
    }, [isOpen])

    const fetchLocations = async () => {
        const { data } = await supabase.from('locations').select('*')
        if (data) {
            setLocations(data)
            const warehouse = data.find(l => l.type === 'WAREHOUSE')
            if (warehouse) setFromLocationId(warehouse.id)
        }
    }

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

    // Fetch warehouse stock when product is selected
    useEffect(() => {
        if (selectedProduct && fromLocationId) {
            checkStock(selectedProduct.id, fromLocationId)
        }
    }, [selectedProduct, fromLocationId])

    const checkStock = async (prodId, locId) => {
        const { data } = await supabase
            .from('inventory')
            .select('quantity')
            .match({ product_id: prodId, location_id: locId })
            .single()
        setWarehouseStock(data?.quantity || 0)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!selectedProduct || !toLocationId) return
        if (parseInt(quantity) > warehouseStock) {
            setError(`Insufficient stock. Available: ${warehouseStock}`)
            return
        }

        setLoading(true)
        setError(null)

        try {
            // 1. Decrement Source Inventory
            const { error: invError } = await supabase
                .from('inventory')
                .upsert({
                    product_id: selectedProduct.id,
                    location_id: fromLocationId,
                    quantity: warehouseStock - parseInt(quantity)
                })

            if (invError) throw invError

            // 2. Handle Transaction & Destination Stock based on Auto Receive
            if (autoReceive) {
                // A. Increment Destination Inventory
                const { data: destInv } = await supabase
                    .from('inventory')
                    .select('quantity')
                    .match({ product_id: selectedProduct.id, location_id: toLocationId })
                    .single()

                const currentDestQty = destInv?.quantity || 0

                const { error: destError } = await supabase
                    .from('inventory')
                    .upsert({
                        product_id: selectedProduct.id,
                        location_id: toLocationId,
                        quantity: currentDestQty + parseInt(quantity)
                    })

                if (destError) throw destError

                // B. Create COMPLETED Transactions (OUT and IN)
                const { error: txOutError } = await supabase
                    .from('transactions')
                    .insert({
                        type: 'TRANSFER_OUT',
                        product_id: selectedProduct.id,
                        from_location_id: fromLocationId,
                        to_location_id: toLocationId,
                        quantity: parseInt(quantity),
                        status: 'COMPLETED'
                    })
                if (txOutError) throw txOutError

                const { error: txInError } = await supabase
                    .from('transactions')
                    .insert({
                        type: 'TRANSFER_IN',
                        product_id: selectedProduct.id,
                        from_location_id: fromLocationId,
                        to_location_id: toLocationId,
                        quantity: parseInt(quantity),
                        status: 'COMPLETED'
                    })
                if (txInError) throw txInError

            } else {
                // Standard Flow: Create PENDING Transaction
                const { error: txError } = await supabase
                    .from('transactions')
                    .insert({
                        type: 'TRANSFER_OUT',
                        product_id: selectedProduct.id,
                        from_location_id: fromLocationId,
                        to_location_id: toLocationId,
                        quantity: parseInt(quantity),
                        status: 'PENDING'
                    })

                if (txError) throw txError
            }

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

    const shopLocations = locations.filter(l => l.type === 'STORE')

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-bold text-slate-800">New Internal Transfer</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>}

                    {/* Source Check: Read Only usually */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700">From (Source)</label>
                        <select
                            disabled
                            className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 border p-2 text-slate-500"
                            value={fromLocationId}
                        >
                            {locations.filter(l => l.type === 'WAREHOUSE').map(l => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">To (Destination Shop)</label>
                        <select
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 border p-2"
                            value={toLocationId}
                            onChange={(e) => setToLocationId(e.target.value)}
                        >
                            <option value="">Select Shop...</option>
                            {shopLocations.map(l => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Product</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search Name or SKU..."
                                className="pl-10 block w-full rounded-md border-gray-300 border p-2"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            {products.length > 0 && !selectedProduct && search && (
                                <div className="absolute z-10 w-full bg-white border shadow-lg max-h-40 overflow-auto mt-1 rounded-md">
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
                        </div>

                        {selectedProduct && (
                            <div className="mt-2 text-sm bg-blue-50 text-blue-700 p-2 rounded flex justify-between items-center">
                                <span>{selectedProduct.name} (Stock: {warehouseStock})</span>
                                <button type="button" onClick={() => { setSelectedProduct(null); setSearch('') }} className="text-xs underline">Change</button>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Quantity</label>
                        <input
                            type="number"
                            required
                            min="1"
                            max={warehouseStock}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary border p-2"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="autoReceive"
                            checked={autoReceive}
                            onChange={(e) => setAutoReceive(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="autoReceive" className="text-sm font-medium text-slate-700">Auto Receive at Destination</label>
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
                            disabled={loading || !selectedProduct || !toLocationId}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Dispatching...' : 'Dispatch Stock'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
