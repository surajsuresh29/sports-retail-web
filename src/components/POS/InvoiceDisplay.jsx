
// Simple functional component that we can render invisible
// or use a specific print route. For simplicity in SPA, we'll put it in the DOM but hidden until print.

export const InvoiceDisplay = ({ cart, subtotal, discount, total, user, profile, locationName, customerDetails }) => {
    if (!cart || cart.length === 0) return null

    return (
        <div id="printable-invoice" className="hidden print:block bg-white text-black font-sans text-xs leading-tight">
            <div className="w-[80mm] mx-auto p-2">
                <div className="text-center mb-4 border-b border-black pb-2">
                    <h1 className="text-lg font-bold uppercase mb-1">Sports Retail Hub</h1>
                    <p className="font-semibold">{locationName || 'Retail Store'}</p>
                    <p className="text-[10px]">Tel: +91 98765 43210</p>
                    <p className="text-[10px] mt-1">{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                    <p className="text-[10px]">Inv #: {Math.floor(Math.random() * 100000)}</p>
                </div>

                <div className="mb-4 text-[11px]">
                    <p><span className="font-bold">Bill To:</span> {customerDetails?.name || 'Walk-in Customer'}</p>
                    {customerDetails?.phone && <p>Ph: {customerDetails.phone}</p>}
                    <p className="mt-1">Cashier: {profile?.role || 'Staff'}</p>
                </div>

                <table className="w-full mb-4 text-[11px]">
                    <thead>
                        <tr className="border-b border-black">
                            <th className="text-left py-1 w-[35%]">Item</th>
                            <th className="text-center py-1 w-[10%]">Qty</th>
                            <th className="text-right py-1 w-[15%]">Price</th>
                            <th className="text-right py-1 w-[15%]">Disc</th>
                            <th className="text-right py-1 w-[25%]">Total</th>
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
                                <tr key={idx} className="border-b border-dashed border-gray-400">
                                    <td className="py-1 pr-1 truncate max-w-[30mm]">
                                        <div className="font-bold">{item.name}</div>
                                        {item.hsn_code && <div className="text-[9px] text-gray-600">HSN: {item.hsn_code}</div>}
                                    </td>
                                    <td className="text-center py-1 align-top">{item.qty}</td>
                                    <td className="text-right py-1 align-top">{item.price}</td>
                                    <td className="text-right py-1 align-top text-gray-600">
                                        {discountAmt > 0 && `-${discountAmt.toFixed(2)}`}
                                    </td>
                                    <td className="text-right py-1 align-top font-bold">{finalTotal.toFixed(2)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>

                {/* Tax Breakdown */}
                <div className="mb-4 text-[10px]">
                    <div className="font-bold border-b border-black mb-1">Tax Summary</div>
                    <div className="flex justify-between font-bold">
                        <span className="w-1/4">Rate</span>
                        <span className="w-1/4 text-right">Taxable</span>
                        <span className="w-1/4 text-right">GST</span>
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

                <div className="flex justify-end mb-4 text-[11px]">
                    <div className="w-full space-y-1">
                        <div className="flex justify-between">
                            <span>Subtotal (Gross):</span>
                            <span>₹{subtotal.toFixed(2)}</span>
                        </div>

                        {/* Calculate Item Savings locally for display */}
                        {(() => {
                            const postItemDiscountTotal = cart.reduce((sum, item) => {
                                const baseTotal = item.price * item.qty
                                let discountAmt = 0
                                if (item.discount) {
                                    discountAmt = item.discount.type === 'FIXED'
                                        ? Number(item.discount.value)
                                        : baseTotal * (Number(item.discount.value) / 100)
                                }
                                return sum + Math.max(0, baseTotal - discountAmt)
                            }, 0)
                            const itemSavings = subtotal - postItemDiscountTotal

                            return (
                                <>
                                    {itemSavings > 0 && (
                                        <div className="flex justify-between">
                                            <span>Item Savings:</span>
                                            <span>-₹{itemSavings.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {discount.amount > 0 && (
                                        <div className="flex justify-between">
                                            <span>Bill Disc ({discount.type === 'PERCENTAGE' ? `${discount.value}%` : 'Flat'}):</span>
                                            <span>-₹{discount.amount.toFixed(2)}</span>
                                        </div>
                                    )}
                                </>
                            )
                        })()}

                        <div className="flex justify-between font-bold text-sm border-t border-black pt-1 mt-1">
                            <span>Total:</span>
                            <span>₹{total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="text-center text-[10px] border-t border-black pt-2">
                    <p className="font-bold">Thank you for visiting!</p>
                    <p>No Returns / Exchange within 7 days.</p>
                </div>
            </div>
        </div>
    )
}
