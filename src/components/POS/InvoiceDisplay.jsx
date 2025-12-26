import { Dumbbell } from 'lucide-react'

// Simple functional component that we can render invisible
// or use a specific print route. For simplicity in SPA, we'll put it in the DOM but hidden until print.

const LOCATION_ADDRESSES = {
    'Main Branch': {
        line1: '123, Stadium Road, Sports Complex',
        line2: 'New Delhi, India - 110001',
    },
    'City Center': {
        line1: '45, High Street Market',
        line2: 'Mumbai, India - 400050',
    },
    'default': {
        line1: 'Registered Retail Outlet',
        line2: 'India',
    }
}

export const InvoiceDisplay = ({ cart, subtotal, discount, total, user, profile, locationName, customerDetails }) => {
    if (!cart || cart.length === 0) return null

    const address = LOCATION_ADDRESSES[locationName] || LOCATION_ADDRESSES['default']

    return (
        <div id="printable-invoice" className="hidden print:block bg-white text-black font-sans text-xs leading-tight">
            <div className="w-[80mm] mx-auto p-2">
                {/* HEADERR */}
                <div className="text-center mb-4 border-b-2 border-dashed border-black pb-3">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <Dumbbell size={20} className="text-black fill-black" strokeWidth={3} />
                        <h1 className="text-2xl font-black uppercase tracking-tight">SPORTS MART</h1>
                    </div>
                    <p className="font-semibold text-sm uppercase -mt-1 mb-2">{locationName || 'Retail Store'}</p>

                    <div className="space-y-0.5 text-[10px] font-mono">
                        <p>{address.line1}</p>
                        <p>{address.line2}</p>
                        <p>Tel: +91 98765 43210</p>
                        <p>www.sportsmart.com | support@sportsmart.com</p>
                    </div>

                    <div className="mt-3 text-[10px] font-mono flex justify-between border-t border-black pt-1">
                        <span>{new Date().toLocaleDateString()}</span>
                        <span>{new Date().toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[10px] font-mono text-left">Inv #: {Math.floor(Math.random() * 100000)}</p>
                </div>

                {/* CUSTOMER INFO */}
                <div className="mb-4 text-[11px] font-mono border-b border-black pb-2">
                    <p>Bill To: <span className="font-bold">{customerDetails?.name || 'Walk-in Customer'}</span></p>
                    {customerDetails?.phone && <p>Ph: {customerDetails.phone}</p>}
                    <p className="mt-1">Cashier: {profile?.role || 'Staff'}</p>
                </div>

                {/* ITEMS TABLE */}
                <table className="w-full mb-4 text-[11px] font-mono">
                    <thead>
                        <tr className="border-b border-black">
                            <th className="text-left py-1 w-[40%]">ITEM</th>
                            <th className="text-center py-1 w-[10%]">QTY</th>
                            <th className="text-right py-1 w-[15%]">PRICE</th>
                            <th className="text-right py-1 w-[10%]">DISC</th>
                            <th className="text-right py-1 w-[25%]">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cart.map((item, idx) => {
                            const baseTotal = item.price * item.qty
                            let discountAmt = 0
                            if (item.discount) {
                                discountAmt = item.discount.type === 'FIXED'
                                    ? Number(item.discount.value)
                                    : baseTotal * (Number(item.discount.value) / 100)
                            }
                            const finalTotal = Math.max(0, baseTotal - discountAmt)

                            return (
                                <tr key={idx} className="border-b border-dashed border-gray-300">
                                    <td className="py-1 pr-1">
                                        <div className="font-bold truncate max-w-[30mm]">{item.name}</div>
                                        {item.hsn_code && <div className="text-[9px] text-gray-500">HSN: {item.hsn_code}</div>}
                                    </td>
                                    <td className="text-center py-1 align-top">{item.qty}</td>
                                    <td className="text-right py-1 align-top">{item.price}</td>
                                    <td className="text-right py-1 align-top text-gray-600">
                                        {discountAmt > 0 && `-${discountAmt.toFixed(0)}`}
                                    </td>
                                    <td className="text-right py-1 align-top font-bold">{finalTotal.toFixed(2)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>

                {/* GST BREAKDOWN */}
                <div className="mb-4 text-[10px] font-mono border-b border-dashed border-black pb-2">
                    <div className="flex justify-between font-bold border-b border-black mb-1">
                        <span className="w-1/4">GST %</span>
                        <span className="w-1/4 text-right">Taxable</span>
                        <span className="w-1/4 text-right">GST Amt</span>
                        <span className="w-1/4 text-right">Total</span>
                    </div>
                    {Object.entries(
                        cart.reduce((acc, item) => {
                            const rate = item.gst_rate || 0
                            const baseTotal = item.price * item.qty
                            let discountAmt = 0
                            if (item.discount) {
                                discountAmt = item.discount.type === 'FIXED'
                                    ? Number(item.discount.value)
                                    : baseTotal * (Number(item.discount.value) / 100)
                            }
                            const itemTotal = Math.max(0, baseTotal - discountAmt)
                            const taxable = itemTotal / (1 + rate / 100)
                            const gst = itemTotal - taxable

                            if (!acc[rate]) acc[rate] = { taxable: 0, gst: 0, total: 0 }
                            acc[rate].taxable += taxable
                            acc[rate].gst += gst
                            acc[rate].total += itemTotal
                            return acc
                        }, {})
                    ).map(([rate, data]) => (
                        <div key={rate} className="flex justify-between">
                            <span className="w-1/4">{rate}%</span>
                            <span className="w-1/4 text-right">{data.taxable.toFixed(2)}</span>
                            <span className="w-1/4 text-right">{data.gst.toFixed(2)}</span>
                            <span className="w-1/4 text-right">{data.total.toFixed(2)}</span>
                        </div>
                    ))}
                </div>

                {/* TOTALS */}
                <div className="flex justify-end mb-6 text-[11px] font-mono">
                    <div className="w-full space-y-1">
                        <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>₹{subtotal.toFixed(2)}</span>
                        </div>

                        {discount.amount > 0 && (
                            <div className="flex justify-between">
                                <span>Bill Disc:</span>
                                <span>-₹{discount.amount.toFixed(2)}</span>
                            </div>
                        )}

                        <div className="flex justify-between font-bold text-sm border-t-2 border-black pt-1 mt-1">
                            <span>TOTAL:</span>
                            <span>₹{total.toFixed(2)}</span>
                        </div>
                        <div className="text-[9px] text-right text-gray-500 italic">
                            (Inclusive of all taxes)
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="text-center text-[10px] mt-8">
                    <p className="font-bold mb-1">Thank you for shopping with us!</p>
                    <p className="mb-4">No returns/exchange after 7 days.</p>

                    {/* FAKE BARCODE - Using Borders for better print compatibility */}
                    <div className="h-10 flex justify-center items-end gap-[2px] mb-2 overflow-hidden">
                        {Array.from({ length: 40 }).map((_, i) => (
                            <div
                                key={i}
                                className="border-l-2 border-black"
                                style={{
                                    height: `${Math.random() * 50 + 50}%`,
                                    borderLeftWidth: Math.random() > 0.5 ? '2px' : '1px'
                                }}
                            ></div>
                        ))}
                    </div>
                    <p className="text-[8px] font-mono tracking-widest">{Math.floor(Math.random() * 1000000000)}</p>
                </div>
            </div>
        </div>
    )
}
