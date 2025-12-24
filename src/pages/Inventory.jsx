import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Plus, Download, Edit, AlertCircle, Search } from 'lucide-react'
import AddProductModal from '../components/Inventory/AddProductModal'
import StockInwardModal from '../components/Inventory/StockInwardModal'

export default function Inventory() {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isInwardModalOpen, setIsInwardModalOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')

    const fetchInventory = async () => {
        setLoading(true)
        try {
            // Fetch products with their warehouse inventory
            // We need to join with inventory. 
            // Supabase join syntax: products(*, inventory(quantity, location_id)) 
            // But we strictly want Warehouse quantity.
            // Let's first get the warehouse ID.
            const { data: warehouse } = await supabase.from('locations').select('id').eq('type', 'WAREHOUSE').single()

            const { data: productsData, error } = await supabase
                .from('products')
                .select(`
          *,
          inventory (
            quantity,
            location_id
          )
        `)
                .order('name')

            if (error) throw error

            // Process data to attach 'warehouse_stock'
            const processed = productsData.map(p => {
                const warehouseRec = p.inventory.find(i => i.location_id === warehouse?.id)
                return {
                    ...p,
                    warehouse_stock: warehouseRec ? warehouseRec.quantity : 0
                }
            })

            setProducts(processed)
        } catch (error) {
            console.error('Error fetching inventory:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchInventory()
    }, [])

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Master Inventory</h1>
                    <p className="text-slate-500">Manage products and Godown stock levels</p>
                </div>
                <div className="flex gap-3 items-center">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search Name or SKU..."
                            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-primary focus:border-primary w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setIsInwardModalOpen(true)}
                        className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                    >
                        <Download size={20} className="mr-2" />
                        Stock Inward
                    </button>
                    <button
                        onClick={() => { setEditingProduct(null); setIsAddModalOpen(true) }}
                        className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
                    >
                        <Plus size={20} className="mr-2" />
                        Add Product
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Product Name</th>
                                <th className="px-6 py-4">Variant (Size/Color)</th>
                                <th className="px-6 py-4">SKU</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4 text-right">Cost Price</th>
                                <th className="px-6 py-4 text-right">Selling Price</th>
                                <th className="px-6 py-4 text-center">Godown Stock</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="8" className="px-6 py-8 text-center text-slate-500">Loading inventory...</td></tr>
                            ) : products.length === 0 ? (
                                <tr><td colSpan="8" className="px-6 py-8 text-center text-slate-500">No products found. Add one to get started.</td></tr>
                            ) : (
                                products
                                    .filter(p =>
                                        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
                                    )
                                    .map((product) => (
                                        <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-900">{product.name}</td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {(product.size || product.color) ? (
                                                    <span className="inline-flex gap-1">
                                                        {product.size && <span className="bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-300 shadow-sm">{product.size}</span>}
                                                        {product.color && <span className="bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-300 shadow-sm">{product.color}</span>}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 italic text-xs">Base</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">{product.sku}</td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                                    {product.category || 'Uncategorized'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-600">₹{product.cost_price}</td>
                                            <td className="px-6 py-4 text-right text-slate-900">₹{product.price}</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className={`font-semibold ${product.warehouse_stock <= product.min_stock_alert ? 'text-red-600' : 'text-slate-900'}`}>
                                                        {product.warehouse_stock}
                                                    </span>
                                                    {product.warehouse_stock <= product.min_stock_alert && (
                                                        <AlertCircle size={16} className="text-red-500" title="Low Stock" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => { setEditingProduct(product); setIsAddModalOpen(true) }}
                                                    className="text-slate-400 hover:text-primary transition-colors"
                                                    title="Edit Product"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AddProductModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onProductAdded={fetchInventory}
                productToEdit={editingProduct}
            />

            <StockInwardModal
                isOpen={isInwardModalOpen}
                onClose={() => setIsInwardModalOpen(false)}
                onSuccess={fetchInventory}
            />
        </div>
    )
}
