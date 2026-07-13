import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
 const { isAuthed, guest, role } = useAuth();
 if (!isAuthed && !guest) return <Navigate to="/login" replace />;
 if (roles && !roles.includes(role)) return <Navigate to="/beranda" replace />;
 return children;
}
