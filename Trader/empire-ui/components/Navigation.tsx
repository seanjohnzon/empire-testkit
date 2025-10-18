'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect } from 'react';
import { callEdge } from '@/lib/callEdge';

export function Navigation() {
  const pathname = usePathname();
  const { publicKey } = useWallet();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (publicKey) {
      // Check if wallet is admin
      checkAdminStatus(publicKey.toString());
    } else {
      setIsAdmin(false);
    }
  }, [publicKey]);

  async function checkAdminStatus(wallet: string) {
    // Try to call list-seasons to check if admin
    const res = await callEdge('list-seasons', {});
    setIsAdmin(res.ok);
  }

  const navLinks = [
    { href: '/garage', label: 'Garage' },
    { href: '/packs', label: 'Packs' },
    { href: '/training', label: 'Training' },
    { href: '/recycle', label: 'Recycle' },
    { href: '/economy', label: 'Economy' },
  ];

  if (isAdmin) {
    navLinks.push({ href: '/admin', label: 'Admin' });
  }

  return (
    <nav className="bg-gray-800 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold">
              🏎️ Empire Cars
            </Link>
            <div className="hidden md:flex space-x-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {publicKey && (
              <div className="text-sm text-gray-300">
                <span className="text-gray-500">Cluster:</span>{' '}
                <span className="font-mono">{process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'devnet'}</span>
              </div>
            )}
            <WalletMultiButton />
          </div>
        </div>
      </div>
    </nav>
  );
}


