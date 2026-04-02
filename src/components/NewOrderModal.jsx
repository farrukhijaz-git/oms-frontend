import { useState } from 'react'
import { useCreateOrder } from '../hooks/useOrders'
import { showToast } from './Toast'

export default function NewOrderModal({ onClose }) {
  const mutation = useCreateOrder()
  const [form, setForm] = useState({
    customer_name: '', address_line1: '', city: '', state: '', zip: '',
    platform: 'manual', notes: '',
  })
  const [items, setItems] = useState([{ name: '', quantity: 1, unit_price: '' }])
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await mutation.mutateAsync({ ...form, items: items.filter(i => i.name) })
      showToast('Order created')
      onClose()
    } catch {
      showToast('Failed to create order', 'error')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="font-semibold text-gray-900 mb-4">New Order</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required value={form.customer_name} onChange={e => set('customer_name', e.target.value)}
            placeholder="Customer Name"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input required value={form.address_line1} onChange={e => set('address_line1', e.target.value)}
            placeholder="Address"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <div className="grid grid-cols-3 gap-2">
            <input required value={form.city} onChange={e => set('city', e.target.value)}
              placeholder="City" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input required value={form.state} onChange={e => set('state', e.target.value)}
              placeholder="State" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input required value={form.zip} onChange={e => set('zip', e.target.value)}
              placeholder="ZIP" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Items</p>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                <input value={item.name} onChange={e => {
                  const next = [...items]; next[i].name = e.target.value; setItems(next)
                }} placeholder="Item name"
                  className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input type="number" value={item.quantity} min={1} onChange={e => {
                  const next = [...items]; next[i].quantity = parseInt(e.target.value); setItems(next)
                }} placeholder="Qty"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            ))}
            <button type="button" onClick={() => setItems([...items, { name: '', quantity: 1, unit_price: '' }])}
              className="text-xs text-blue-600 hover:underline">
              + Add item
            </button>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 px-4 py-2 bg-navy text-white rounded-lg text-sm hover:bg-navy-hover disabled:opacity-50">
              {mutation.isPending ? 'Creating…' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
