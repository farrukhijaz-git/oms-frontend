import { useState } from 'react'
import { useUsers, useCreateUser, useUpdateUser } from '../hooks/useUsers'
import { useAuth } from '../context/AuthContext'
import {
  Topbar, Panel, PanelHeader, PanelTitle,
  BtnPrimary, BtnSecondary, BtnDanger,
  Modal, ModalActions, FormField, Select, TableSkeleton, useToast,
} from '../components.jsx'

function InviteModal({ onClose }) {
  const toast = useToast()
  const mutation = useCreateUser()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('staff')

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await mutation.mutateAsync({ google_email: email, role })
      toast.success('User invited')
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to invite user')
    }
  }

  return (
    <Modal title="Invite User" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormField label="Google Email">
            <input
              type="email" required className="oms-input"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </FormField>
          <FormField label="Role">
            <Select value={role} onChange={setRole}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </Select>
          </FormField>
        </div>
        <ModalActions>
          <BtnSecondary onClick={onClose}>Cancel</BtnSecondary>
          <BtnPrimary loading={mutation.isPending}>
            {mutation.isPending ? 'Inviting…' : 'Invite'}
          </BtnPrimary>
        </ModalActions>
      </form>
    </Modal>
  )
}

export default function AdminUsersPage() {
  const toast = useToast()
  const { data, isLoading } = useUsers()
  const { user: currentUser } = useAuth()
  const updateMutation = useUpdateUser()
  const [showInvite, setShowInvite] = useState(false)

  const users = data?.users || []

  const toggle = async (u) => {
    if (u.id === currentUser?.id) { toast.error('Cannot deactivate yourself'); return }
    try {
      await updateMutation.mutateAsync({ id: u.id, is_active: !u.is_active })
      toast.success(`User ${u.is_active ? 'deactivated' : 'activated'}`)
    } catch {
      toast.error('Failed to update user')
    }
  }

  const changeRole = async (u, role) => {
    try {
      await updateMutation.mutateAsync({ id: u.id, role })
      toast.success('Role updated')
    } catch {
      toast.error('Failed to update role')
    }
  }

  return (
    <div className="oms-main">

      <Topbar title="Users">
        <BtnPrimary size="sm" onClick={() => setShowInvite(true)}>+ Invite User</BtnPrimary>
      </Topbar>

      <div className="oms-content">
        <Panel>
          {isLoading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="oms-table" style={{ minWidth: 600 }}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{u.display_name || u.google_email}</div>
                        <div className="oms-text-muted" style={{ fontSize: 11 }}>{u.google_email}</div>
                      </td>
                      <td>
                        <Select
                          value={u.role}
                          onChange={v => changeRole(u, v)}
                          disabled={u.id === currentUser?.id}
                        >
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </Select>
                      </td>
                      <td>
                        <span
                          className="oms-status"
                          style={u.is_active
                            ? { color: 'var(--oms-label-text)', background: 'var(--oms-label-bg)' }
                            : { color: 'var(--oms-text-muted)', background: 'var(--oms-page-bg)' }
                          }
                        >
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="oms-text-muted" style={{ fontSize: 12 }}>
                        {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}
                      </td>
                      <td>
                        {u.id !== currentUser?.id && (
                          u.is_active ? (
                            <BtnDanger size="sm" onClick={() => toggle(u)}>Deactivate</BtnDanger>
                          ) : (
                            <BtnSecondary size="sm" onClick={() => toggle(u)}>Activate</BtnSecondary>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  )
}
