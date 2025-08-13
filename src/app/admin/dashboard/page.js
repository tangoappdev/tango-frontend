'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import { ArrowRightIcon, PlusCircleIcon, CogIcon, ArrowLeftStartOnRectangleIcon, MusicalNoteIcon, ChevronDownIcon, ChevronRightIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';

// --- Statistics Components ---

const StatCard = ({ title, value, breakdown, isLoading }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (isLoading) {
    return <div className="bg-[#30333a] p-6 rounded-2xl shadow-[3px_3px_5px_#181a1d,-3px_-3px_5px_#484d57] animate-pulse h-[171px]"></div>;
  }

  return (
    <div className="bg-[#30333a] p-6 rounded-2xl shadow-[3px_3px_5px_#181a1d,-3px_-3px_5px_#484d57]">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
        {breakdown && (
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 rounded-full hover:bg-white/10">
            {isExpanded ? <ChevronDownIcon className="h-6 w-6 text-gray-400" /> : <ChevronRightIcon className="h-6 w-6 text-gray-400" />}
          </button>
        )}
      </div>
      {isExpanded && breakdown && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-1 text-sm">
          {Object.entries(breakdown).map(([key, val]) => (
            <div key={key} className="flex justify-between text-gray-300">
              <span>{key}</span>
              <span className="font-semibold">{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const OrchestraStats = ({ stats, isLoading }) => {
    const [expandedOrchestra, setExpandedOrchestra] = useState(null);

    if (isLoading) {
        return <div className="bg-[#30333a] p-6 rounded-2xl shadow-[3px_3px_5px_#181a1d,-3px_-3px_5px_#484d57] animate-pulse h-full"></div>
    }

    const sortedOrchestras = Object.entries(stats).sort(([, a], [, b]) => b.total - a.total);
    const totalOrchestras = sortedOrchestras.length;

    return (
        <div className="bg-[#30333a] p-6 rounded-2xl shadow-[3px_3px_5px_#181a1d,-3px_-3px_5px_#484d57] flex flex-col h-full">
            <div className="flex-shrink-0">
                <p className="text-gray-400 text-sm">Total Orchestras</p>
                <p className="text-3xl font-bold text-white">{totalOrchestras}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 flex-grow overflow-hidden">
                <div className="h-full overflow-y-auto pr-2 space-y-2">
                    {sortedOrchestras.map(([orchestra, data]) => (
                        <div key={orchestra}>
                            <div className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-white/5">
                                <div className="flex items-center">
                                    <button onClick={() => setExpandedOrchestra(expandedOrchestra === orchestra ? null : orchestra)} className="p-1 rounded-full hover:bg-white/10 mr-2">
                                        {expandedOrchestra === orchestra ? <ChevronDownIcon className="h-5 w-5 text-gray-400" /> : <ChevronRightIcon className="h-5 w-5 text-gray-400" />}
                                    </button>
                                    <p className="text-gray-200 truncate">{orchestra}</p>
                                </div>
                                <p className="font-bold text-gray-300 px-2 py-0.5 rounded-full text-sm">{data.total}</p>
                            </div>
                            {expandedOrchestra === orchestra && (
                                <div className="ml-10 mr-4 mt-1 pl-2 border-l border-gray-200 text-sm space-y-1">
                                    {Object.entries(data.byType).map(([type, count]) => count > 0 && (
                                        <div key={type} className="flex justify-between text-gray-400">
                                            <span>{type}</span>
                                            <span>{count}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard stats.');
        }
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);


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

        <section className="mb-10">
            <div className="flex flex-col h-[434px] md:flex-row gap-6 md:items-stretch">
                {/* Left Column */}
                <div className="md:w-1/2" >
                    <OrchestraStats stats={stats?.orchestraStats || {}} isLoading={isLoading} />
                </div>
                {/* Right Column */}
                <div className="md:w-1/2 flex flex-col gap-6">
                    <StatCard 
                        title="Total Tandas" 
                        value={stats?.totalTandas} 
                        breakdown={stats?.tandasByType}
                        isLoading={isLoading}
                    />
                    <StatCard 
                        title="Total Tracks" 
                        value={stats?.totalTracks} 
                        breakdown={stats?.tracksByType}
                        isLoading={isLoading}
                    />
                </div>
            </div>
        </section>

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
            href="/admin/manage-tandas"
            icon={CogIcon}
          />
          <NavCard
            title="Track Library"
            description="View all individual songs to find duplicates and manage files."
            href="/admin/track-library"
            icon={MusicalNoteIcon}
          />
          {/* --- UPDATED: Changed the Cortina card --- */}
          <NavCard
            title="Manage Cortinas"
            description="View, create, or delete musical interludes."
            href="/admin/manage-cortinas"
            icon={SpeakerWaveIcon}
          />
        </main>
      </div>
    </div>
  );
}
