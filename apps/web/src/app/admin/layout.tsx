import type { Metadata } from 'next';
import AdminRootLayout from './AdminRootLayout';

export const metadata: Metadata = {
  title: 'Admin | Swiss Wall Panels',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminRootLayout>{children}</AdminRootLayout>;
}
