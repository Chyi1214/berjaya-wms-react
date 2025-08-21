import { useState, useEffect, memo } from 'react';
import { UserRecord, UserRole } from '../../types';

interface UserFormModalProps {
  user?: UserRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: { email: string; role: UserRole; zone?: number; isActive?: boolean }) => Promise<void>;
}

export const UserFormModal = memo(function UserFormModal({ user, isOpen, onClose, onSave }: UserFormModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.VIEWER);
  const [zone, setZone] = useState<number | ''>('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with existing user data
  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setRole(user.role);
      setZone(user.zone || '');
      setIsActive(user.isActive);
    } else {
      // Reset form for new user
      setEmail('');
      setRole(UserRole.VIEWER);
      setZone('');
      setIsActive(true);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!email.trim()) {
      alert('Email is required');
      return;
    }
    
    if (!email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    if ((role === UserRole.LOGISTICS || role === UserRole.PRODUCTION) && !zone) {
      alert('Zone is required for Logistics and Production workers');
      return;
    }

    setIsSubmitting(true);
    
    const userData = {
      email: email.trim().toLowerCase(),
      role,
      zone: zone === '' ? undefined : Number(zone),
      isActive
    };

    try {
      await onSave(userData);
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {user ? 'Edit User' : 'Add New User'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!user} // Can't change email when editing
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="user@company.com"
              required
            />
            {user && (
              <p className="text-xs text-gray-500 mt-1">
                Email cannot be changed when editing existing user
              </p>
            )}
          </div>

          {/* Role Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value={UserRole.VIEWER}>👁️ Viewer - Read-only access</option>
              <option value={UserRole.LOGISTICS}>📦 Logistics - Warehouse operations</option>
              <option value={UserRole.PRODUCTION}>🔧 Production - Manufacturing floor</option>
              <option value={UserRole.SUPERVISOR}>👨‍💼 Supervisor - Team management</option>
              <option value={UserRole.MANAGER}>📊 Manager - Full department access</option>
            </select>
          </div>

          {/* Zone Field */}
          {(role === UserRole.LOGISTICS || role === UserRole.PRODUCTION) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zone * (Required for {role} workers)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={zone}
                onChange={(e) => setZone(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="1-30"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Assign worker to specific zone (1-30)
              </p>
            </div>
          )}

          {/* Active Status */}
          {user && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                Account is active
              </label>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : user ? 'Update User' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});