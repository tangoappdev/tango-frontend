'use client';

import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import { ArrowRightIcon, PlusCircleIcon, CogIcon, ArrowLeftStartOnRectangleIcon } from '@heroicons/react/24/outline';

export default function AdminDashboard() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Failed to log out', error);
      alert('Failed to log out. Please try again.');
    }
  };

  const NavCard = ({ title, description, href, icon: Icon }) => (
    <button
      onClick={() => router.push(href)}
      className="bg-[#30333a] p-6 rounded-2xl shadow-[3px_3px_5px_#181a1d,-3px_-3px_5px_#484d57] hover:shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e] transition-all duration-200 ease-in-out text-left w-full group"
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Icon className="h-8 w-8 text-[#25edda]" />
            <h2 className="text-xl font-bold text-white">{title}</h2>
          </div>
          <p className="text-gray-400">{description}</p>
        </div>
        <ArrowRightIcon className="h-6 w-6 text-gray-500 group-hover:text-[#25edda] group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#30333a] text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm text-gray-300 bg-[#30333a] shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d] hover:text-[#25edda] hover:shadow-[inset_2px_2px_4px_#1f2126,inset_-2px_-2px_4px_#41454e] transition-all"
          >
            <ArrowLeftStartOnRectangleIcon className="h-5 w-5" />
            Logout
          </button>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <NavCard
            title="Create New Tanda"
            description="Upload artwork and audio files for a new Tanda."
            href="/admin/upload"
            icon={PlusCircleIcon}
          />
          <NavCard
            title="Manage Tandas"
            description="Edit, view, or delete existing Tandas in the database."
            href="/admin/manage-tandas" // This page doesn't exist yet
            icon={CogIcon}
          />
          {/* We can add a card for Cortinas here later */}
        </main>
      </div>
    </div>
  );
}
