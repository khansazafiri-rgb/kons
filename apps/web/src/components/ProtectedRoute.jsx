import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { tautanMasuk } from '@/lib/returnTo';

export default function ProtectedRoute({ children, roles }) {
  const { isAuthed, role } = useAuth();
  const lokasi = useLocation();

  // Alamat yang tadi dituju dititipkan ke halaman login, supaya setelah masuk
  // orangnya kembali ke sini - bukan terlempar ke beranda dan harus menyusuri
  // jalannya lagi dari awal (PRD Revisi 2 bagian 2).
  if (!isAuthed) {
    return <Navigate to={tautanMasuk('/login', lokasi.pathname + lokasi.search)} replace />;
  }
  // Sudah masuk tapi perannya tidak sesuai: itu bukan soal login, jadi tidak
  // ada gunanya menitipkan alamat - dia tidak akan pernah boleh masuk ke sana.
  if (roles && !roles.includes(role)) return <Navigate to="/beranda" replace />;
  return children;
}
