'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  FiHome, 
  FiShoppingBag, 
  FiUsers, 
  FiMenu, 
  FiSettings, 
  FiLogOut,
  FiX,
  FiChevronDown
} from 'react-icons/fi';
import { cn } from '@/lib/utils/cn';

/**
 * Admin Header Component
 * 
 * Provides navigation and branding for the admin dashboard
 * Includes responsive mobile menu and user dropdown
 */
export default function AdminHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  // Navigation links
  const navLinks = [
    { href: '/admin', label: 'Dashboard', icon: FiHome },
    { href: '/admin/orders', label: 'Orders', icon: FiShoppingBag },
    { href: '/admin/menu', label: 'Menu', icon: FiMenu },
    { href: '/admin/customers', label: 'Customers', icon: FiUsers },
    { href: '/admin/settings', label: 'Settings', icon: FiSettings },
  ];
  
  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  // Toggle user menu
  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };
  
  // Check if a link is active
  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname?.startsWith(href);
  };
  
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/admin" className="flex items-center">
              <Image 
                src="/images/logo.png" 
                alt="Coconut Beach" 
                width={40} 
                height={40} 
                className="rounded-full"
              />
              <span className="ml-2 text-lg font-semibold text-gray-900">
                <span className="hidden sm:inline">Coconut Beach</span>
                <span className="sm:hidden">Admin</span>
              </span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive(link.href)
                    ? "bg-black text-white"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <span className="flex items-center">
                  <link.icon className="mr-1.5" size={16} />
                  {link.label}
                </span>
              </Link>
            ))}
          </nav>
          
          {/* User Menu */}
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              onClick={toggleMobileMenu}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <FiX className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <FiMenu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
            
            {/* User dropdown */}
            <div className="ml-3 relative">
              <div>
                <button
                  type="button"
                  className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
                  id="user-menu-button"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  onClick={toggleUserMenu}
                >
                  <span className="sr-only">Open user menu</span>
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700">
                    <span className="font-medium">A</span>
                  </div>
                  <span className="hidden md:flex items-center ml-2">
                    <span className="text-sm font-medium text-gray-700">Admin</span>
                    <FiChevronDown className="ml-1 h-4 w-4" aria-hidden="true" />
                  </span>
                </button>
              </div>
              
              {/* Dropdown menu */}
              {userMenuOpen && (
                <div
                  className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-button"
                  tabIndex={-1}
                >
                  <div className="py-1" role="none">
                    <Link
                      href="/admin/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                      tabIndex={-1}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Your Profile
                    </Link>
                    <Link
                      href="/admin/settings"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                      tabIndex={-1}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Settings
                    </Link>
                    <button
                      type="button"
                      className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                      tabIndex={-1}
                      onClick={() => {
                        setUserMenuOpen(false);
                        // Add logout logic here
                      }}
                    >
                      <span className="flex items-center">
                        <FiLogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                        Sign out
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "block px-3 py-2 rounded-md text-base font-medium",
                  isActive(link.href)
                    ? "bg-black text-white"
                    : "text-gray-700 hover:bg-gray-100"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="flex items-center">
                  <link.icon className="mr-2" size={18} />
                  {link.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
