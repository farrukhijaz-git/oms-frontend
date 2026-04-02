import { useState } from 'react'
import { useCreateOrder } from '../hooks/useOrders'
import { Modal, ModalActions, BtnPrimary, BtnSecondary, FormField, Input, Select, useToast } from '../components.jsx'

export default function NewOrderModal({ onClose }) {
  const toast = useToast()
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
      toast.success('Order created')
      onClose()
    } catch {
      toast.error('Failed to create order')
    }
  }

  return (
    <Modal title="New Order" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '70vh', overflowY: 'auto' }}>
          <FormField label="Customer Name">
            <Input required value={form.customer_name} onChange={v => set('customer_name', v)} placeholder="Customer Name" />
          </FormField>
          <FormField label="Address">
            <Input required value={form.address_line1} onChange={v => set('address_line1', v)} placeholder="Address" />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <FormField label="City">
              <Input required value={form.city} onChange={v => set('city', v)} placeholder="City" />
            </FormField>
            <FormField label="State">
              <Input required value={form.state} onChange={v => set('state', v)} placeholder="State" />
            </FormField>
            <FormField label="ZIP">
              <Input required value={form.zip} onChange={v => set('zip', v)} placeholder="ZIP" />
            </FormField>
          </div>
          <div>
            <div className="oms-label" style={{ marginBottom: 8 }}>Items</div>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 8 }}>
                <input
                  className="oms-input"
                  style={{ gridColumn: 'span 1' }}
                  value={item.name}
                  onChange={e => { const next = [...items]; next[i].name = e.target.value; setItems(next) }}
                  placeholder="Item name"
                />
                <input
                  className="oms-input"
                  type="number"
                  value={item.quantity}
                  min={1}
                  onChange={e => { const next = [...items]; next[i].quantity = parseInt(e.target.value); setItems(next) }}
                  placeholder="Qty"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setItems([...items, { name: '', quantity: 1, unit_price: '' }])}
              style={{ fontSize: 12, color: 'var(--oms-navy-mid)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              + Add item
            </button>
          </div>
        </div>
        <ModalActions>
          <BtnSecondary onClick={onClose}>Cancel</BtnSecondary>
          <BtnPrimary loading={mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create Order'}
          </BtnPrimary>
        </ModalActions>
      </form>
    </Modal>
  )
}
