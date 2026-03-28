const STATUS_STYLES = {
  new: 'bg-gray-100 text-gray-700',
  label_generated: 'bg-blue-100 text-blue-700',
  inventory_ordered: 'bg-yellow-100 text-yellow-700',
  packed: 'bg-orange-100 text-orange-700',
  ready: 'bg-purple-100 text-purple-700',
  shipped: 'bg-green-100 text-green-700',
}

const STATUS_LABELS = {
  new: 'New',
  label_generated: 'Label Generated',
  inventory_ordered: 'Inventory Ordered',
  packed: 'Packed',
  ready: 'Ready',
  shipped: 'Shipped',
}

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-700'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}
