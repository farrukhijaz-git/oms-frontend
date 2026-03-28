import { useState } from 'react'
import { useUsers, useCreateUser, useUpdateUser } from '../hooks/useUsers'
import { useAuth } from '../context/AuthContext'
import { showToast } from '../components/Toast'

function InviteModal({ onClose }) {
  const mutation = useCreateUser()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('staff')

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await mutation.mutateAsync({ google_email: email, role })
      showToast('User invited')
      onClose()
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to invite user', 'error')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Invite User</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Google email address"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <select value={role} onChange={e => setRole(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
              {mutation.isPending ? 'Inviting...' : 'Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminUsersPage() {
  const { data, isLoading } = useUsers()
  const { user: currentUser } = useAuth()
  const updateMutation = useUpdateUser()
  const [showInvite, setShowInvite] = useState(false)

  const users = data?.users || []

  const toggle = async (u) => {
    if (u.id === currentUser?.id) { showToast('Cannot deactivate yourself', 'error'); return }
    try {
      await updateMutation.mutateAsync({ id: u.id, is_active: !u.is_active })
      showToast(`User ${u.is_active ? 'deactivated' : 'activated'}`)
    } catch {
      showToast('Failed to update user', 'error')
    }
  }

  const changeRole = async (u, role) => {
    try {
      await updateMutation.mutateAsync({ id: u.id, role })
      showToast('Role updated')
    } catch {
      showToast('Failed to update role', 'error')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <button onClick={() => setShowInvite(true)}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          + Invite User
        </button>
      </div>

      {isLoading ? <div className="text-gray-400">Loading...</div> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Last Login</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{u.display_name || u.google_email}</p>
                    <p className="text-xs text-gray-400">{u.google_email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select value={u.role} onChange={e => changeRole(u, e.target.value)}
                      disabled={u.id === currentUser?.id}
                      className="border border-gray-300 rounded px-2 py-1 text-sm disabled:opacity-50">
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    {u.id !== currentUser?.id && (
                      <button onClick={() => toggle(u)}
                        className={`px-2 py-1 rounded text-xs ${u.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  )
}
