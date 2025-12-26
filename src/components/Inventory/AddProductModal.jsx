import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { X, Plus, Trash2 } from 'lucide-react'

export default function AddProductModal({ isOpen, onClose, onProductAdded, productToEdit = null }) {
    const [formData, setFormData] = useState({
        sku: productToEdit?.sku || '',
        name: productToEdit?.name || '',
        description: productToEdit?.description || '',
        price: productToEdit?.price || '',
        cost_price: productToEdit?.cost_price || '',
        category: productToEdit?.category || '',
        min_stock_alert: productToEdit?.min_stock_alert || 10,
        hsn_code: productToEdit?.hsn_code || '',
        gst_rate: productToEdit?.gst_rate || 0,
        // Single product fields
        size: productToEdit?.size || '',
        color: productToEdit?.color || ''
    })

    const [hasVariants, setHasVariants] = useState(false)
    const [variants, setVariants] = useState([
        { sku: '', size: '', color: '' }
    ])

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (isOpen) {
            if (productToEdit) {
                setFormData({
                    sku: productToEdit.sku || '',
                    name: productToEdit.name || '',
                    description: productToEdit.description || '',
                    price: productToEdit.price || '',
                    cost_price: productToEdit.cost_price || '',
                    category: productToEdit.category || '',
                    min_stock_alert: productToEdit.min_stock_alert || 10,
                    hsn_code: productToEdit.hsn_code || '',
                    gst_rate: productToEdit.gst_rate || 0,
                    size: productToEdit.size || '',
                    color: productToEdit.color || ''
                })
                setHasVariants(false)
            } else {
                setFormData({
                    sku: '',
                    name: '',
                    description: '',
                    price: '',
                    cost_price: '',
                    category: '',
                    min_stock_alert: 10,
                    hsn_code: '',
                    gst_rate: 0,
                    size: '',
                    color: ''
                })
                setHasVariants(false)
                setVariants([{ sku: '', size: '', color: '' }])
            }
        }
    }, [productToEdit, isOpen])

    if (!isOpen) return null

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleVariantChange = (index, field, value) => {
        const newVariants = [...variants]
        newVariants[index][field] = value
        setVariants(newVariants)
    }

    const addVariantRow = () => {
        setVariants([...variants, { sku: '', size: '', color: '' }])
    }

    const removeVariantRow = (index) => {
        if (variants.length > 1) {
            setVariants(variants.filter((_, i) => i !== index))
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const productsToInsert = []

            // If editing existing product, we treat it as simple update for now (or single product)
            if (productToEdit) {
                await supabase
                    .from('products')
                    .update(formData)
                    .eq('id', productToEdit.id)
            } else {
                // New Product Creation
                if (hasVariants) {
                    const groupId = crypto.randomUUID()

                    variants.forEach(v => {
                        productsToInsert.push({
                            ...formData, // Base details
                            sku: v.sku,  // Override SKU
                            size: v.size,
                            color: v.color,
                            group_id: groupId
                        })
                    })
                } else {
                    // Single Product
                    productsToInsert.push(formData)
                }

                if (productsToInsert.length > 0) {
                    const { error } = await supabase.from('products').insert(productsToInsert)
                    if (error) throw error
                }
            }

            onProductAdded()
            onClose()
        } catch (err) {
            console.error(err)
            setError(err.message || "Failed to save product")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-bold text-slate-800">
                        {productToEdit ? 'Edit Product' : 'Add New Product'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>}

                    {/* Common Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700">Product Name</label>
                            <input
                                type="text"
                                name="name"
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g., Nike Air Zoom"
                            />
                        </div>

                        {!hasVariants && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700">SKU / Barcode</label>
                                <input
                                    type="text"
                                    name="sku"
                                    required={!hasVariants}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                                    value={formData.sku}
                                    onChange={handleChange}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Category</label>
                            <select
                                name="category"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                                value={formData.category}
                                onChange={handleChange}
                            >
                                <option value="">Select Category</option>
                                {['Cricket', 'Football', 'Badminton', 'Tennis', 'Swimming', 'Fitness', 'Apparel', 'Footwear', 'Accessories', 'Others'].map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700">Description</label>
                            <textarea name="description" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" rows={2} value={formData.description} onChange={handleChange} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Selling Price (₹)</label>
                            <input type="number" name="price" required step="0.01" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" value={formData.price} onChange={handleChange} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Cost Price (₹)</label>
                            <input type="number" name="cost_price" required step="0.01" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" value={formData.cost_price} onChange={handleChange} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Low Stock Alert</label>
                            <input type="number" name="min_stock_alert" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" value={formData.min_stock_alert} onChange={handleChange} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">HSN Code</label>
                            <input type="text" name="hsn_code" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" value={formData.hsn_code} onChange={handleChange} placeholder="Optional" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">GST Rate (%)</label>
                            <select name="gst_rate" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" value={formData.gst_rate} onChange={handleChange}>
                                <option value="0">0%</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                            </select>
                        </div>
                    </div>

                    {/* Single Product Specifics */}
                    {!hasVariants && !productToEdit && (
                        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded border border-slate-200">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 uppercase">Size (Optional)</label>
                                <input type="text" name="size" className="mt-1 block w-full rounded border-gray-300 text-sm border p-1" value={formData.size} onChange={handleChange} placeholder="e.g. XL, 10" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 uppercase">Color (Optional)</label>
                                <input type="text" name="color" className="mt-1 block w-full rounded border-gray-300 text-sm border p-1" value={formData.color} onChange={handleChange} placeholder="e.g. Red, Blue" />
                            </div>
                        </div>
                    )}

                    {/* Variant Toggle */}
                    {!productToEdit && (
                        <div className="flex items-center gap-2 pt-2 border-t mt-4">
                            <input
                                type="checkbox"
                                id="hasVariants"
                                checked={hasVariants}
                                onChange={(e) => setHasVariants(e.target.checked)}
                                className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                            />
                            <label htmlFor="hasVariants" className="font-medium text-slate-700">This product has multiple options (Size, Color, etc.)</label>
                        </div>
                    )}

                    {/* Variants Table */}
                    {hasVariants && !productToEdit && (
                        <div className="space-y-3 bg-slate-50 p-4 rounded border border-slate-200">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-sm text-slate-700">Product Variants</h3>
                            </div>

                            {variants.map((variant, idx) => (
                                <div key={idx} className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <label className="text-xs text-slate-500">SKU / Barcode</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Unique SKU"
                                            className="w-full text-sm p-2 border border-slate-300 rounded"
                                            value={variant.sku}
                                            onChange={(e) => handleVariantChange(idx, 'sku', e.target.value)}
                                        />
                                    </div>
                                    <div className="w-24">
                                        <label className="text-xs text-slate-500">Size</label>
                                        <input
                                            type="text"
                                            placeholder="Size"
                                            className="w-full text-sm p-2 border border-slate-300 rounded"
                                            value={variant.size}
                                            onChange={(e) => handleVariantChange(idx, 'size', e.target.value)}
                                        />
                                    </div>
                                    <div className="w-24">
                                        <label className="text-xs text-slate-500">Color</label>
                                        <input
                                            type="text"
                                            placeholder="Color"
                                            className="w-full text-sm p-2 border border-slate-300 rounded"
                                            value={variant.color}
                                            onChange={(e) => handleVariantChange(idx, 'color', e.target.value)}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeVariantRow(idx)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                                        disabled={variants.length === 1}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={addVariantRow}
                                className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium mt-2"
                            >
                                <Plus size={16} className="mr-1" /> Add Another Option
                            </button>
                        </div>
                    )}

                    <div className="flex justify-end pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="mr-3 px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : (productToEdit ? 'Update Product' : 'Create Product')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
