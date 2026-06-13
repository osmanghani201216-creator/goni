import React, { useState, useEffect } from 'react';
import { Clock, Plus, Trash2 } from 'lucide-react';

interface TimeZoneData {
  id: string;
  name: string;
  timezone: string;
  time: string;
  date: string;
  offset: string;
}

const PRESET_TIMEZONES = [
  { name: 'London', timezone: 'Europe/London', offset: 'GMT' },
  { name: 'New York', timezone: 'America/New_York', offset: 'EST/EDT' },
  { name: 'Tokyo', timezone: 'Asia/Tokyo', offset: 'JST' },
  { name: 'Dubai', timezone: 'Asia/Dubai', offset: 'GST' },
  { name: 'Sydney', timezone: 'Australia/Sydney', offset: 'AEDT/AEST' },
  { name: 'Berlin', timezone: 'Europe/Berlin', offset: 'CET/CEST' },
  { name: 'Singapore', timezone: 'Asia/Singapore', offset: 'SGT' },
  { name: 'Hong Kong', timezone: 'Asia/Hong_Kong', offset: 'HKT' },
  { name: 'Los Angeles', timezone: 'America/Los_Angeles', offset: 'PST/PDT' },
  { name: 'Toronto', timezone: 'America/Toronto', offset: 'EST/EDT' },
  { name: 'Mexico City', timezone: 'America/Mexico_City', offset: 'CST/CDT' },
  { name: 'São Paulo', timezone: 'America/Sao_Paulo', offset: 'BRT' },
  { name: 'Moscow', timezone: 'Europe/Moscow', offset: 'MSK' },
  { name: 'Bangkok', timezone: 'Asia/Bangkok', offset: 'ICT' },
  { name: 'Istanbul', timezone: 'Europe/Istanbul', offset: 'EET' },
];

const WorldClock: React.FC = () => {
  const [clocks, setClocks] = useState<TimeZoneData[]>([
    { id: '1', name: 'Dhaka', timezone: 'Asia/Dhaka', time: '', date: '', offset: 'BST' },
    { id: '2', name: 'London', timezone: 'Europe/London', time: '', date: '', offset: 'GMT' },
    { id: '3', name: 'New York', timezone: 'America/New_York', time: '', date: '', offset: 'EST' },
    { id: '4', name: 'Tokyo', timezone: 'Asia/Tokyo', time: '', date: '', offset: 'JST' },
  ]);

  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      setClocks(prevClocks =>
        prevClocks.map(clock => {
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: clock.timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          });

          const dateFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: clock.timezone,
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });

          return {
            ...clock,
            time: formatter.format(new Date()),
            date: dateFormatter.format(new Date()),
          };
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  const addClock = (timezone: { name: string; timezone: string; offset: string }) => {
    const newId = Math.random().toString(36).substr(2, 9);
    setClocks([...clocks, { id: newId, ...timezone, time: '', date: '' }]);
    setShowPresets(false);
  };

  const removeClock = (id: string) => {
    if (clocks.length > 1) {
      setClocks(clocks.filter(clock => clock.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Clock className="w-12 h-12 text-blue-400 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">World Clock</h1>
              <p className="text-slate-400">Real-time across time zones</p>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              Add Time Zone
            </button>

            {/* Preset Dropdown */}
            {showPresets && (
              <div className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 w-64">
                <div className="max-h-96 overflow-y-auto p-2">
                  {PRESET_TIMEZONES.map((tz) => (
                    <button
                      key={tz.timezone}
                      onClick={() => addClock(tz)}
                      disabled={clocks.some(c => c.timezone === tz.timezone)}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700 rounded-lg text-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="font-semibold">{tz.name}</div>
                      <div className="text-sm text-slate-400">{tz.offset}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Clocks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {clocks.map((clock) => (
            <div
              key={clock.id}
              className="group relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700 hover:border-blue-500 transition-all hover:shadow-2xl hover:shadow-blue-500/20 transform hover:scale-105 hover:-translate-y-1"
            >
              {/* Digital Display */}
              <div className="mb-6">
                <div className="bg-gradient-to-br from-slate-900 to-black rounded-xl p-6 border border-slate-700 shadow-inner">
                  <div className="font-mono text-5xl font-bold text-blue-400 tracking-wider leading-tight drop-shadow-lg">
                    {clock.time}
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">{clock.name}</h3>
                <p className="text-slate-400 text-sm">{clock.date}</p>
                <div className="flex items-center justify-between">
                  <span className="text-blue-400 font-semibold">{clock.offset}</span>
                  <span className="text-slate-500 text-xs">{clock.timezone}</span>
                </div>
              </div>

              {/* Delete Button */}
              <button
                onClick={() => removeClock(clock.id)}
                disabled={clocks.length === 1}
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title={clocks.length === 1 ? 'Cannot remove the last clock' : 'Remove clock'}
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Accent Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-blue-400 rounded-b-2xl group-hover:h-2 transition-all"></div>
            </div>
          ))}

          {/* Add New Clock Card */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-8 border-2 border-dashed border-slate-700 hover:border-blue-500 transition-all flex items-center justify-center cursor-pointer transform hover:scale-105"
            onClick={() => setShowPresets(!showPresets)}>
            <div className="text-center">
              <Plus className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400 font-semibold">Add New Time Zone</p>
              <p className="text-slate-500 text-sm">Click to add</p>
            </div>
          </div>
        </div>

        {/* Stats Footer */}
        <div className="mt-12 bg-gradient-to-r from-blue-600/10 to-blue-400/10 rounded-xl p-6 border border-blue-500/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-slate-400 text-sm">Active Clocks</p>
              <p className="text-3xl font-bold text-blue-400">{clocks.length}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Max Clocks</p>
              <p className="text-3xl font-bold text-blue-400">{clocks.length + (15 - clocks.length)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Update Frequency</p>
              <p className="text-3xl font-bold text-blue-400">1/sec</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorldClock;
