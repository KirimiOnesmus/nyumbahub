import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ROLE_HOME = {
  admin: '/admin',
  owner: '/owner',
  caretaker: '/caretaker',
};


const ProtectedRoute = ({ role, children }) => {
  const { status, user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (status === 'booting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-brand-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const allowedRoles = Array.isArray(role) ? role : [role];
  const hasAccess = !role || allowedRoles.includes(user?.role);

  if (!hasAccess) {
    const fallback = ROLE_HOME[user?.role] || '/login';
    return <Navigate to={fallback} replace />;
  }

  return children;
};

export default ProtectedRoute;