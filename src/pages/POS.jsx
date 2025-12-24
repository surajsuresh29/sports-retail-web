import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuthStore } from '../store/authStore'
import { useUIStore } from '../store/uiStore'
import ProductSearch from '../components/POS/ProductSearch'
import { InvoiceDisplay } from '../components/POS/InvoiceDisplay'
import { Trash2, ShoppingCart, Printer, CheckCircle, ScanBarcode, User, X } from 'lucide-react'

export default function POS() {
    console.log("POS Component Rendering")
    const { user, profile } = useAuthStore()
    const { addToast } = useUIStore()
    const [cart, setCart] = useState([])
    const [customer, setCustomer] = useState({ name: '', phone: '', title: 'Mr.', countryCode: '+91' })
    const [discount, setDiscount] = useState({ type: 'FIXED', value: 0, applyToDiscountedItems: false })

    // Location Management
    const [selectedLocationId, setSelectedLocationId] = useState(null)
    const [availableLocations, setAvailableLocations] = useState([])
    const [locationName, setLocationName] = useState('Loading...')

    const [loading, setLoading] = useState(false)
    const [lastOrderSuccess, setLastOrderSuccess] = useState(false)
    const [showPreview, setShowPreview] = useState(false)

    const [orderId] = useState(`#${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`)

    const [currentTime, setCurrentTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        const fetchLocations = async () => {
            const { data } = await supabase.from('locations').select('*').order('id')
            if (data) setAvailableLocations(data)
        }
        fetchLocations()
    }, [])

    useEffect(() => {
        if (profile?.assigned_location_id) {
            setSelectedLocationId(profile.assigned_location_id)
        }
    }, [profile])

    useEffect(() => {
        if (selectedLocationId && availableLocations.length > 0) {
            const loc = availableLocations.find(l => l.id == selectedLocationId)
            setLocationName(loc ? loc.name : 'Unknown Location')
        }
    }, [selectedLocationId, availableLocations])

    // --- Actions ---

    const addToCart = async (product) => {
        setLastOrderSuccess(false)

        if (!selectedLocationId) {
            addToast("Please select a billing location first", "warning")
            return
        }

        // 1. Check if product already in cart to check TOTAL quantity against stock
        const existingItem = cart.find(i => i.id === product.id)
        const currentCartQty = existingItem ? existingItem.qty : 0
        const requestedQty = currentCartQty + 1

        // 2. LIVE Check against database
        const { data: inv } = await supabase
            .from('inventory')
            .select('quantity')
            .match({ product_id: product.id, location_id: selectedLocationId })
            .single()

        const availableStock = inv ? inv.quantity : 0

        if (requestedQty > availableStock) {
            addToast(`Insufficient Stock! Requested: ${requestedQty}, Available: ${availableStock}`, "error")
            return
        }

        if (!existingItem) {
            addToast("Item added to cart", "success")
        }

        setCart(prev => {
            if (existingItem) {
                return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
            } else {
                return [...prev, { ...product, qty: 1, discount: { type: 'FIXED', value: 0 } }]
            }
        })
    }

    const updateQuantity = async (productId, delta) => {
        setLastOrderSuccess(false)
        const item = cart.find(i => i.id === productId)
        if (!item) return

        const newQty = item.qty + delta
        if (newQty <= 0) {
            setCart(prev => prev.filter(i => i.id !== productId))
            addToast("Item removed from cart", "info")
            return
        }

        // Check stock if increasing
        if (delta > 0) {
            const { data: inv } = await supabase
                .from('inventory')
                .select('quantity')
                .match({ product_id: productId, location_id: selectedLocationId })
                .single()

            if (!inv || newQty > inv.quantity) {
                addToast(`Insufficient Stock! Requested: ${newQty}, Available: ${inv?.quantity || 0}`, "error")
                return
            }
        }

        setCart(prev => prev.map(i => i.id === productId ? { ...i, qty: newQty } : i))
    }

    const updateItemDiscount = (id, field, value) => {
        setCart(prev => prev.map(item => {
            if (item.id !== id) return item
            return {
                ...item,
                discount: { ...item.discount, [field]: value }
            }
        }))
    }

    const calculateItemTotal = (item) => {
        const baseTotal = item.price * item.qty
        const discountVal = Number(item.discount?.value || 0)

        let final = baseTotal
        if (item.discount?.type === 'FIXED') {
            final = baseTotal - discountVal
        } else {
            final = baseTotal - (baseTotal * (discountVal / 100))
        }
        return Math.max(0, final)
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0)

    // 1. Calculate total after item-level discounts
    const postItemDiscountTotal = cart.reduce((sum, item) => sum + calculateItemTotal(item), 0)

    // 2. Calculate Base for Global Discount
    const globalDiscountBase = cart.reduce((sum, item) => {
        const itemTotal = calculateItemTotal(item)
        const hasItemDiscount = item.discount && Number(item.discount.value) > 0

        if (discount.applyToDiscountedItems) return sum + itemTotal
        return hasItemDiscount ? sum : sum + itemTotal
    }, 0)

    // 3. Calculate Global Discount Amount
    const globalDiscountAmount = discount.type === 'PERCENTAGE'
        ? (globalDiscountBase * (discount.value / 100))
        : Number(discount.value)

    const finalTotal = Math.max(0, postItemDiscountTotal - globalDiscountAmount)
    const totalDiscountAmount = subtotal - finalTotal

    const executeCheckout = async () => {
        setShowPreview(false) // Close modal
        if (cart.length === 0) return
        if (!selectedLocationId) {
            addToast("Please select a billing location before checkout", "warning")
            return
        }

        setLoading(true)
        try {
            const invoiceId = crypto.randomUUID()

            // Process each item
            for (const item of cart) {
                // 1. Get current stock
                const { data: inv } = await supabase
                    .from('inventory')
                    .select('quantity')
                    .match({ product_id: item.id, location_id: selectedLocationId })
                    .single()

                // 2. Decrement
                const newQty = (inv?.quantity || 0) - item.qty
                if (newQty < 0) throw new Error(`Stock mismatch for ${item.name}. Available: ${inv?.quantity || 0}`)

                await supabase
                    .from('inventory')
                    .update({ quantity: newQty })
                    .match({ product_id: item.id, location_id: selectedLocationId })

                // 3. Record Transaction with Pro-Rated Discount
                const itemTotalAfterDisc = calculateItemTotal(item)
                const hasItemDiscount = item.discount && Number(item.discount.value) > 0

                let itemGlobalDiscShare = 0

                // Only share global discount if eligible
                const isEligible = discount.applyToDiscountedItems || !hasItemDiscount

                if (isEligible && globalDiscountBase > 0) {
                    const itemShareRatio = itemTotalAfterDisc / globalDiscountBase
                    itemGlobalDiscShare = globalDiscountAmount * itemShareRatio
                }

                const finalItemTotal = Math.max(0, itemTotalAfterDisc - itemGlobalDiscShare)

                const effectiveUnitPrice = finalItemTotal / item.qty

                await supabase.from('transactions').insert({
                    product_id: item.id,
                    type: 'SALE',
                    quantity: item.qty,
                    from_location_id: selectedLocationId,
                    to_location_id: null,
                    status: 'COMPLETED',
                    customer_name: customer.name || null,
                    customer_phone: customer.phone || null,
                    sale_price: effectiveUnitPrice,
                    invoice_id: invoiceId
                })
            }

            setLastOrderSuccess(true)
            addToast("Order processed successfully!", "success")

            setTimeout(() => {
                window.print()
                setCart([])
                setCustomer({ name: '', phone: '' })
                setDiscount({ type: 'FIXED', value: 0 })
            }, 500)

        } catch (err) {
            console.error(err)
            addToast(`Checkout Failed: ${err.message}`, "error")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="h-[85vh] grid grid-cols-12 gap-0 overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-2xl ring-1 ring-slate-900/5">
            {/* Left Panel: Product Selection */}
            <div className="col-span-7 bg-slate-50/50 h-full flex flex-col relative z-0 p-6 overflow-y-auto">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">New Sale</h1>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <select
                                    className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer"
                                    value={selectedLocationId || ''}
                                    onChange={(e) => setSelectedLocationId(e.target.value)}
                                >
                                    <option value="" disabled>Select Location</option>
                                    {availableLocations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-semibold text-slate-500 mb-0.5">
                            {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="font-mono text-2xl font-black text-slate-900 tracking-tight">
                            {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </div>
                    </div>
                </div>

                <div className="flex-1">
                    <ProductSearch onSelectLineItem={addToCart} />
                </div>
            </div>

            {/* Right Panel: Current Order (Dark/Antigravity) */}
            <div className="col-span-5 bg-[#0B1120] h-full flex flex-col overflow-hidden text-slate-100 relative z-10 shadow-2xl border-l border-slate-800">
                {/* 1. Header (Fixed) */}
                <div className="flex-none p-4 bg-[#0F172A] border-b border-slate-800/80 flex items-center justify-between shadow-md relative z-20">
                    <div className="flex items-center gap-3">
                        <div className="bg-brand p-2 rounded-lg shadow-lg shadow-brand/20">
                            <ShoppingCart size={20} className="text-slate-900" />
                        </div>
                        <div>
                            <h2 className="font-bold text-base text-white leading-none tracking-tight">Current Order</h2>
                            <p className="text-[10px] text-slate-400 font-mono mt-1 opacity-80">ID: {orderId}</p>
                        </div>
                    </div>
                    <span className="bg-slate-800/50 px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-300 border border-slate-700/50">
                        {cart.length} Items
                    </span>
                </div>

                {/* 2. Cart Items List (Scrollable - Flex Grow) */}
                <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500/50 space-y-4">
                            <div className="w-16 h-16 bg-slate-800/30 rounded-full flex items-center justify-center border-2 border-dashed border-slate-700/50">
                                <ShoppingCart size={24} />
                            </div>
                            <div className="text-center">
                                <p className="font-medium text-base text-slate-400">Cart is empty</p>
                                <p className="text-[10px] text-slate-600 mt-1">Scan or select items</p>
                            </div>
                        </div>
                    ) : (
                        cart.map((item) => (
                            <div key={item.id} className="bg-[#1e293b]/80 backdrop-blur-sm border border-slate-700/50 py-3 px-3 rounded-xl shadow-sm hover:border-slate-600 transition-all group relative overflow-hidden">
                                {/* Decorator Line */}
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                {/* Row 1: Header */}
                                <div className="flex justify-between items-start gap-2 mb-2">
                                    <div>
                                        <h3 className="font-semibold text-slate-100 text-sm leading-tight line-clamp-1">{item.name}</h3>
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            <span className="text-[9px] font-bold text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-700/50 tracking-wider">SKU: {item.sku}</span>
                                            {item.size && <span className="text-[9px] font-bold text-slate-900 bg-brand px-1.5 py-0.5 rounded border border-brand/50">{item.size}</span>}
                                            {item.color && <span className="text-[9px] font-bold text-purple-300 bg-purple-900/20 px-1.5 py-0.5 rounded border border-purple-500/20">{item.color}</span>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setCart(prev => prev.filter(i => i.id !== item.id))}
                                        className="text-slate-600 hover:text-red-400 p-1 rounded-md hover:bg-red-900/20 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                {/* Row 2: Controls & Price */}
                                <div className="flex items-center justify-between pb-2 border-b border-slate-700/30">
                                    <div className="flex items-center bg-[#0F172A] rounded-md p-0.5 border border-slate-700/50 shadow-inner">
                                        <button
                                            onClick={() => updateQuantity(item.id, -1)}
                                            className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all active:scale-95 text-xs"
                                        >
                                            -
                                        </button>
                                        <span className="w-9 text-center font-bold text-white text-xs">{item.qty}</span>
                                        <button
                                            onClick={() => updateQuantity(item.id, 1)}
                                            className="w-7 h-7 flex items-center justify-center rounded-md bg-brand hover:bg-yellow-400 text-slate-900 shadow-lg shadow-brand/20 transition-all active:scale-95 text-xs font-bold"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[9px] text-slate-500 font-mono mb-0.5">₹{item.price}</div>
                                        <div className="font-bold text-base text-emerald-400 tracking-tight">₹{calculateItemTotal(item).toFixed(2)}</div>
                                    </div>
                                </div>

                                {/* Row 3: Discount Check */}
                                <div className="mt-2 flex items-center justify-between gap-2">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Discount</span>
                                    <div className="flex items-center gap-2">
                                        <div className="flex bg-[#0F172A] rounded-md border border-slate-700/50 p-0.5">
                                            <button
                                                onClick={() => updateItemDiscount(item.id, 'type', 'FIXED')}
                                                className={`px-1.5 py-0.5 text-[8px] font-bold rounded-sm transition-all ${item.discount?.type === 'FIXED' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                            >₹</button>
                                            <button
                                                onClick={() => updateItemDiscount(item.id, 'type', 'PERCENTAGE')}
                                                className={`px-1.5 py-0.5 text-[8px] font-bold rounded-sm transition-all ${item.discount?.type === 'PERCENTAGE' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                            >%</button>
                                        </div>
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-14 h-6 bg-[#0F172A] border border-slate-700/50 rounded-md text-[10px] text-right text-white px-1.5 outline-none focus:border-brand transition-colors placeholder:text-slate-700"
                                            placeholder="0"
                                            value={item.discount?.value || ''}
                                            onChange={(e) => {
                                                if (e.target.value < 0) return
                                                updateItemDiscount(item.id, 'value', e.target.value)
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* 3. Footer (Fixed) */}
                <div className="flex-none bg-[#0F172A] border-t border-slate-800 p-4 space-y-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)] z-20">
                    <div className="flex flex-col gap-3">
                        {/* Customer */}
                        <div className="space-y-2">
                            <label className="text-[9px] uppercase font-bold text-slate-500 tracking-widest pl-1">Customer Details</label>

                            {/* Row 1: Title & Name */}
                            <div className="flex gap-2">
                                <select
                                    className="w-24 h-9 bg-[#1e293b] border border-slate-700/50 rounded-lg px-1 text-sm text-white focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all cursor-pointer"
                                    value={customer.title || 'Mr.'}
                                    onChange={e => setCustomer({ ...customer, title: e.target.value })}
                                >
                                    <option value="Mr.">Mr.</option>
                                    <option value="Mrs.">Mrs.</option>
                                    <option value="Ms.">Ms.</option>
                                    <option value="Dr.">Dr.</option>
                                    <option value="M/s">M/s</option>
                                </select>
                                <input
                                    type="text"
                                    placeholder="Customer Name"
                                    className="flex-1 min-w-0 h-9 bg-[#1e293b] border border-slate-700/50 rounded-lg px-3 text-sm text-white focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all placeholder:text-slate-600"
                                    value={customer.name}
                                    onChange={e => {
                                        if (/^[a-zA-Z\s]*$/.test(e.target.value)) {
                                            setCustomer({ ...customer, name: e.target.value })
                                        }
                                    }}
                                />
                            </div>

                            {/* Row 2: ISD & Phone */}
                            <div className="flex gap-2">
                                <select
                                    className="w-24 h-9 bg-[#1e293b] border border-slate-700/50 rounded-lg px-2 text-sm text-white focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all cursor-pointer font-mono"
                                    value={customer.countryCode || '+91'}
                                    onChange={e => setCustomer({ ...customer, countryCode: e.target.value })}
                                >
                                    <option value="+91">+91 🇮🇳</option>
                                    <option value="+1">+1 🇺🇸</option>
                                    <option value="+44">+44 🇬🇧</option>
                                    <option value="+971">+971 🇦🇪</option>
                                    <option value="+61">+61 🇦🇺</option>
                                </select>
                                <input
                                    type="text"
                                    placeholder="Phone"
                                    className="flex-1 min-w-0 h-9 bg-[#1e293b] border border-slate-700/50 rounded-lg px-3 text-sm text-white focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all placeholder:text-slate-600"
                                    value={customer.phone}
                                    onChange={e => {
                                        if (/^\d*$/.test(e.target.value)) {
                                            setCustomer({ ...customer, phone: e.target.value })
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Bill Discount */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center pl-1 pr-1">
                                <label className="text-[9px] uppercase font-bold text-slate-500 tracking-widest">Bill Discount</label>
                                <label className="flex items-center gap-1.5 cursor-pointer group">
                                    <div className={`w-3 h-3 rounded border flex items-center justify-center transition-colors ${discount.applyToDiscountedItems ? 'bg-brand border-brand' : 'border-slate-600 bg-transparent group-hover:border-slate-500'}`}>
                                        {discount.applyToDiscountedItems && <div className="w-1.5 h-1.5 bg-slate-900 rounded-full"></div>}
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={!!discount.applyToDiscountedItems}
                                        onChange={e => setDiscount(prev => ({ ...prev, applyToDiscountedItems: e.target.checked }))}
                                    />
                                    <span className={`text-[9px] font-bold transition-colors ${discount.applyToDiscountedItems ? 'text-brand' : 'text-slate-500 group-hover:text-slate-400'}`}>Incl. Discounted</span>
                                </label>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex w-24 bg-[#1e293b] rounded-lg border border-slate-700/50 p-1">
                                    <button
                                        onClick={() => setDiscount({ ...discount, type: 'FIXED' })}
                                        className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all ${discount.type === 'FIXED' ? 'bg-brand text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                    >₹</button>
                                    <button
                                        onClick={() => setDiscount({ ...discount, type: 'PERCENTAGE' })}
                                        className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all ${discount.type === 'PERCENTAGE' ? 'bg-brand text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                    >%</button>
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    className="flex-1 h-9 bg-[#1e293b] border border-slate-700/50 rounded-lg px-3 text-sm text-white focus:ring-1 focus:ring-brand outline-none font-mono text-right"
                                    value={discount.value}
                                    onChange={e => setDiscount({ ...discount, value: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Totals & Action */}
                    <div className="pt-3 border-t border-slate-700/50 space-y-2">
                        <div className="flex justify-between text-xs text-slate-400 font-medium">
                            <span>Subtotal</span>
                            <span>₹{subtotal.toFixed(2)}</span>
                        </div>
                        {totalDiscountAmount > 0 && (
                            <div className="flex justify-between text-xs text-emerald-400 font-medium">
                                <span>Savings</span>
                                <span>-₹{totalDiscountAmount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-end">
                            <span className="text-base font-bold text-white">Total</span>
                            <span className="text-2xl font-extrabold text-white tracking-tight leading-none">₹{finalTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    <button
                        disabled={cart.length === 0 || loading}
                        onClick={() => {
                            if (cart.length === 0) return
                            if (!selectedLocationId) {
                                addToast("Please select a billing location before checkout", "warning")
                                return
                            }
                            setShowPreview(true)
                        }}
                        className="w-full group relative overflow-hidden py-3.5 bg-gradient-to-r from-brand via-yellow-400 to-brand hover:from-yellow-400 hover:to-yellow-300 text-slate-900 font-bold rounded-xl shadow-lg shadow-brand/20 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed text-base"
                    >
                        <div className="relative z-10 flex items-center justify-center gap-2">
                            {loading ? (
                                <span className="animate-pulse">Processing...</span>
                            ) : (
                                <>
                                    <span>Complete Order</span>
                                    <Printer size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </div>
                    </button>

                    {lastOrderSuccess && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-500/90 backdrop-blur text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 text-sm font-bold animate-in fade-in slide-in-from-top-4 border border-emerald-400/50 z-50">
                            <CheckCircle size={16} /> Order Completed!
                        </div>
                    )}
                </div>
            </div>

            {/* Order Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-slate-900/5">
                        {/* Header */}
                        <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-900">Confirm Order</h3>
                            <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-600 transition-colors bg-white p-1 rounded-full border border-slate-200 shadow-sm"><X size={18} /></button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Customer */}
                            <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-brand border border-slate-100 shadow-sm">
                                    <User size={24} className="fill-brand/20" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">{customer.title} {customer.name || 'Guest Customer'}</p>
                                    <p className="text-xs text-slate-500 font-mono mt-0.5">{customer.countryCode} {customer.phone || 'No Phone'}</p>
                                </div>
                            </div>

                            {/* Items Summary */}
                            <div>
                                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Items ({cart.length})</div>
                                <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                                    {cart.map(item => (
                                        <div key={item.id} className="flex justify-between items-center py-2 px-2 hover:bg-slate-50 rounded-lg group transition-colors">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <p className="text-sm font-medium text-slate-700 truncate">{item.name}</p>
                                                <p className="text-[10px] text-slate-400">{item.qty} x ₹{item.price}</p>
                                            </div>
                                            <span className="font-bold text-slate-900 font-mono">₹{calculateItemTotal(item).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="pt-4 border-t border-slate-100 space-y-1.5">
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>Subtotal</span>
                                    <span>₹{subtotal.toFixed(2)}</span>
                                </div>
                                {totalDiscountAmount > 0 && (
                                    <div className="flex justify-between text-sm text-emerald-600 font-medium">
                                        <span>Savings</span>
                                        <span>-₹{totalDiscountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-2xl font-black text-slate-900 mt-2 bg-slate-50 -mx-6 -mb-6 px-6 py-4 border-t border-dashed border-slate-200">
                                    <span>Total</span>
                                    <span>₹{finalTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
                            <button
                                onClick={() => setShowPreview(false)}
                                className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-sm"
                            >
                                Back
                            </button>
                            <button
                                onClick={executeCheckout}
                                disabled={loading}
                                className="flex-[2] py-3.5 bg-brand text-slate-900 font-bold rounded-xl shadow-lg shadow-brand/20 hover:bg-yellow-400 transition-all flex items-center justify-center gap-2 text-sm transform active:scale-[0.98]"
                            >
                                {loading ? 'Processing...' : <><Printer size={18} /> Confirm & Print</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Invoice */}
            <InvoiceDisplay
                cart={cart}
                subtotal={subtotal}
                discount={{ ...discount, amount: globalDiscountAmount }}
                total={finalTotal}
                user={user}
                profile={profile}
                locationName={locationName}
                customerDetails={customer}
            />
        </div>
    )
}
