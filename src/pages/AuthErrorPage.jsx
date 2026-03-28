import { useSearchParams, Link } from 'react-router-dom'

const REASONS = {
  not_approved: 'Your account has not been approved yet.',
  oauth_failed: 'Google sign-in failed. Please try again.',
  no_token: 'Authentication token missing.',
  invalid_token: 'Authentication token is invalid.',
}

export default function AuthErrorPage() {
  const [params] = useSearchParams()
  const reason = params.get('reason') || 'unknown'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-red-600 text-2xl">✕</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 text-sm mb-6">{REASONS[reason] || 'An error occurred.'}</p>
        {reason === 'not_approved' && (
          <p className="text-sm text-gray-500 mb-6">Please contact your administrator to request access.</p>
        )}
        <Link to="/login" className="text-blue-600 text-sm hover:underline">Back to login</Link>
      </div>
    </div>
  )
}
