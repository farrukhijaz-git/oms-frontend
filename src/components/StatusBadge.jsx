// Central status color registry — imported by badges, dots, filters, and cards
export const STATUS_CONFIG = {
  new:               { label: 'New',               color: '#378ADD', bg: '#E6F1FB' },
  label_generated:   { label: 'Label Generated',   color: '#639922', bg: '#EAF3DE' },
  inventory_ordered: { label: 'Inventory Ordered', color: '#BA7517', bg: '#FAEEDA' },
  packed:            { label: 'Packed',            color: '#534AB7', bg: '#EEEDFE' },
  ready:             { label: 'Ready',             color: '#993556', bg: '#FBEAF0' },
  shipped:           { label: 'Shipped',           color: '#6B7280', bg: '#F3F4F6' },
}

export const STATUS_ORDER = ['new', 'label_generated', 'inventory_ordered', 'packed', 'ready', 'shipped']

/** Small filled dot matching the status color */
export function StatusDot({ status, size = 8 }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.shipped
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{ width: size, height: size, background: cfg.color }}
    />
  )
}

/** Pill badge with colored background and dot */
export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || {
    label: status?.replace(/_/g, ' ') || '—',
    color: '#6B7280',
    bg: '#F3F4F6',
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  )
}

/** Platform pill — walmart=amber, manual/other=gray */
export function PlatformBadge({ platform }) {
  const isWalmart = platform?.toLowerCase() === 'walmart'
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize"
      style={
        isWalmart
          ? { color: '#BA7517', background: '#FAEEDA' }
          : { color: '#6B7280', background: '#F3F4F6' }
      }
    >
      {platform || 'manual'}
    </span>
  )
}
