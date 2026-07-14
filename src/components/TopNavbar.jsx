import React, { useState, useEffect, useRef } from 'react';
import { Menu, Search, Bell, RefreshCw, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function TopNavbar({ schoolName, schoolLogo, toggleSidebar, navItems = [] }) {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (filteredNavItems.length > 0) {
      navigate(filteredNavItems[0].path);
      setShowDropdown(false);
      setSearchQuery('');
    }
  };

  const filteredNavItems = navItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name, email) => {
    if (name) return name.substring(0, 2).toUpperCase();
    if (email) return email.substring(0, 2).toUpperCase();
    return 'U';
  };

  return (
    <header className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-[4.5rem] shrink-0 flex items-center justify-between px-4 lg:px-8 z-30 relative min-w-0">
      
      {/* Left section: Mobile menu & Logo (if needed) */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {toggleSidebar && (
          <button 
            onClick={toggleSidebar}
            className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
          >
            <Menu size={24} />
          </button>
        )}


        
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative hidden md:block flex-1 max-w-xl mr-4 min-w-0" ref={dropdownRef}>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border-none rounded-2xl text-sm bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all min-w-0"
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setShowDropdown(false);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={16} />
            </button>
          )}
          
          {/* Search Dropdown */}
          {showDropdown && searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 max-h-64 overflow-y-auto custom-scrollbar animate-fade-in-up">
              {filteredNavItems.length > 0 ? (
                <ul className="py-2">
                  {filteredNavItems.map((item, idx) => (
                    <li key={idx}>
                      <button
                        type="button"
                        onClick={() => {
                          navigate(item.path);
                          setShowDropdown(false);
                          setSearchQuery('');
                        }}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 text-left transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-slate-400">
                            <item.icon size={18} />
                          </div>
                          <span className="text-sm font-medium text-slate-700">{item.name}</span>
                        </div>
                        <ChevronRight size={16} className="text-slate-300" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-6 text-center text-sm text-slate-500">
                  No modules found matching "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Right section: Icons & Profile */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0 min-w-0">
        
        {/* Mobile Search Icon (Instead of full bar) */}
        <button className="md:hidden p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors shrink-0">
          <Search size={20} />
        </button>

        <button 
          onClick={handleRefresh}
          className={`p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all shrink-0 ${isRefreshing ? 'animate-spin text-primary-500' : ''}`}
          title="Refresh"
        >
          <RefreshCw size={20} />
        </button>
        
        <button className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors relative shrink-0" title="Notifications">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        <div className="hidden sm:block h-6 w-px bg-slate-200 mx-1 shrink-0"></div>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-1 min-w-0 shrink-0">
          <div className="hidden md:flex flex-col text-right min-w-0 max-w-xs lg:max-w-sm overflow-hidden group">
            <p className="text-sm font-bold text-slate-900 truncate">
              {userProfile?.name || userProfile?.email?.split('@')[0] || 'User'}
            </p>
            <div className="overflow-hidden whitespace-nowrap">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider inline-block animate-marquee hover-pause pr-8">
                {schoolName || userProfile?.role || 'Portal'}
              </p>
            </div>
          </div>
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm relative z-10 overflow-hidden ${schoolLogo ? 'bg-white' : 'bg-emerald-500 text-white'}`}>
            {schoolLogo ? (
              <img src={schoolLogo} alt="School Logo" className="w-full h-full object-contain" />
            ) : (
              getInitials(userProfile?.name, userProfile?.email)
            )}
          </div>
        </div>
      </div>

    </header>
  );
}
