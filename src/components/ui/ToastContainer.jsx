import { useUIStore } from '../../store/uiStore'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

export const ToastContainer = () => {
    const { toasts, removeToast } = useUIStore()

    if (toasts.length === 0) return null

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`
                        min-w-[300px] p-4 rounded-lg shadow-xl text-white flex items-center justify-between animate-in slide-in-from-top-full pointer-events-auto
                        ${toast.type === 'success' ? 'bg-green-600' : ''}
                        ${toast.type === 'error' ? 'bg-red-600' : ''}
                        ${toast.type === 'info' ? 'bg-slate-800' : ''}
                        ${toast.type === 'warning' ? 'bg-amber-500' : ''}
                    `}
                >
                    <div className="flex items-center gap-3">
                        {toast.type === 'success' && <CheckCircle size={20} />}
                        {toast.type === 'error' && <AlertCircle size={20} />}
                        {toast.type === 'info' && <Info size={20} />}
                        {toast.type === 'warning' && <AlertCircle size={20} />}
                        <span className="font-medium text-sm">{toast.message}</span>
                    </div>
                    <button onClick={() => removeToast(toast.id)} className="opacity-70 hover:opacity-100 ml-4">
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    )
}
