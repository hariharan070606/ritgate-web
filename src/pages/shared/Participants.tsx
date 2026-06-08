import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Users, QrCode, X } from 'lucide-react';

export interface Participant {
  id: string;
  name: string;
  type: 'student' | 'staff';
  department?: string;
  isReceiver?: boolean;
}

interface ParticipantsProps {
  participants: Participant[];
  onBack: () => void;
  title?: string;
}

type FilterTab = 'All' | 'Students' | 'Staff';

const Participants: React.FC<ParticipantsProps> = ({
  participants,
  onBack,
  title = 'Participants',
}) => {
  const hasStudents = participants.some(p => p.type === 'student');
  const hasStaff = participants.some(p => p.type === 'staff');
  const showTabs = hasStudents && hasStaff;

  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = participants;

    if (showTabs && activeTab === 'Students') {
      list = list.filter(p => p.type === 'student');
    } else if (showTabs && activeTab === 'Staff') {
      list = list.filter(p => p.type === 'staff');
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
      );
    }

    return list;
  }, [participants, activeTab, search, showTabs]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 uppercase">{title}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{participants.length} participants</p>
          </div>
          <div className="w-10"></div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ID..."
            className="w-full pl-12 pr-12 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        {showTabs && (
          <div className="flex gap-1 bg-slate-200 rounded-xl p-1 mb-6">
            {(['All', 'Students', 'Staff'] as FilterTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === tab
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        {/* Participants List */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">No participants found</h3>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item, idx) => (
              <motion.div
                key={`${item.type}-${item.id}-${idx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
              >
                {/* Avatar */}
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                    item.type === 'staff' ? 'bg-emerald-100' : 'bg-blue-100'
                  }`}
                >
                  <span
                    className={`font-bold text-lg ${
                      item.type === 'staff' ? 'text-emerald-700' : 'text-blue-700'
                    }`}
                  >
                    {item.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-slate-900 truncate">{item.name}</h3>
                    {item.isReceiver && (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-600 rounded-md">
                        <QrCode className="w-2.5 h-2.5 text-white" />
                        <span className="text-xs font-bold text-white">QR</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    {item.id}
                    {item.department ? ` • ${item.department}` : ''}
                  </p>
                </div>

                {/* Role Badge */}
                <div
                  className={`px-3 py-1 rounded-full ${
                    item.type === 'staff' ? 'bg-emerald-50' : 'bg-blue-50'
                  }`}
                >
                  <span
                    className={`text-xs font-bold ${
                      item.type === 'staff' ? 'text-emerald-700' : 'text-blue-700'
                    }`}
                  >
                    {item.type === 'staff' ? 'Staff' : 'Student'}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Participants;
