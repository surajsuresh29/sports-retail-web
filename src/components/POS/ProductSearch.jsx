import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabaseClient'
import { Search, ScanBarcode } from 'lucide-react'

export default function ProductSearch({ onSelectLineItem }) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [isFocused, setIsFocused] = useState(false)
    const inputRef = useRef(null)

    // Auto-focus input on mount
    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    useEffect(() => {
        const fetchProducts = async () => {
            if (!query) {
                setResults([])
                return
            }

            // Search by name OR SKU
            const { data } = await supabase
                .from('products')
                .select('id, name, sku, price, size, color, gst_rate, hsn_code')
                .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
                .limit(10)

            setResults(data || [])
        }

        const timer = setTimeout(fetchProducts, 300)
        return () => clearTimeout(timer)
    }, [query])

    const handleSelect = (product) => {
        onSelectLineItem(product)
        setQuery('')
        setResults([])
        inputRef.current?.focus()
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && results.length > 0) {
            handleSelect(results[0])
        }
    }

    return (
        <div className="relative w-full max-w-2xl mx-auto mb-8">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-6 w-6 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    className="block w-full pl-12 pr-12 py-4 border-0 rounded-full leading-5 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-xl shadow-slate-200/50 sm:text-lg font-bold tracking-tight transition-all placeholder:font-medium"
                    placeholder="Scan Barcode or Search Product..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    onKeyDown={handleKeyDown}
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <ScanBarcode className="h-6 w-6 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
            </div>

            {/* Results Dropdown */}
            {isFocused && results.length > 0 && (
                <div className="absolute mt-2 w-full bg-white/90 backdrop-blur-xl shadow-2xl max-h-[60vh] rounded-2xl py-2 ring-1 ring-slate-200 overflow-hidden sm:text-sm z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                        Search Results
                    </div>
                    {results.map((product) => (
                        <div
                            key={product.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelect(product)}
                            className="cursor-pointer select-none relative py-3 pl-4 pr-4 hover:bg-slate-50 flex justify-between items-center border-b border-slate-100 last:border-0 group transition-colors"
                        >
                            <div className="flex flex-col">
                                <span className="font-bold text-slate-800 text-base group-hover:text-indigo-600 transition-colors">
                                    {product.name}
                                    {(product.size || product.color) && <span className="text-sm font-medium text-slate-500 ml-2">({product.size} {product.color})</span>}
                                </span>
                                <span className="text-slate-400 text-xs font-mono mt-0.5">SKU: {product.sku}</span>
                            </div>
                            <span className="font-extrabold text-emerald-500 text-lg">₹{product.price}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
