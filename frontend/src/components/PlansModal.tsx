import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { X, Calendar, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface PlansModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PlansModal: React.FC<PlansModalProps> = ({ isOpen, onClose }) => {
  const { token } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const backendBaseUrl = useMemo(() => import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000', []);

  useEffect(() => {
    if (!isOpen || !token) return;
    const config = { headers: { Authorization: `Bearer ${token}` } };
    axios.get(`${backendBaseUrl}/api/plans`, config)
      .then(r => setPlans(r.data.plans || []))
      .catch(() => setPlans([]));
  }, [isOpen, token, backendBaseUrl]);

  if (!isOpen) return null;

  const computeDays = (start?: string, end?: string) => {
    if (!start || !end) return '-';
    const s = new Date(start); const e = new Date(end);
    const sMid = new Date(s); sMid.setHours(0,0,0,0);
    const eMid = new Date(e); eMid.setHours(0,0,0,0);
    return Math.ceil((eMid.getTime() - sMid.getTime()) / (24*60*60*1000)) + 1;
  };

  const generateScheduleHtml = (plan: any): string => {
    const start = plan.startDate ? new Date(plan.startDate) : null;
    const end = plan.endDate ? new Date(plan.endDate) : null;
    if (!start || !end) return '';
    const startMid = new Date(start); startMid.setHours(0,0,0,0);
    const endMid = new Date(end); endMid.setHours(0,0,0,0);
    const totalDays = Math.ceil((endMid.getTime() - startMid.getTime()) / (24*60*60*1000)) + 1;
    const destinationLabel = plan.destination || 'your destination';
    const names: string[] = Array.isArray(plan.destinations) && plan.destinations.length > 0
      ? plan.destinations
      : (destinationLabel && destinationLabel !== 'Multi-city' ? [destinationLabel] : []);

    const days: { title: string; body: string }[] = [];
    days.push({ title: 'Day 1: Arrival and Exploration', body: `Arrive at ${destinationLabel}. Light local exploration and check-in.` });

    const middleDays = Math.max(0, totalDays - 2);
    if (middleDays > 0) {
      if (names.length === 0) {
        for (let i = 0; i < middleDays; i++) {
          days.push({ title: `Day ${i + 2}: Local Experiences`, body: 'Leisure day for sightseeing, cuisine, and culture.' });
        }
      } else if (middleDays < names.length) {
        const perDay = Math.ceil(names.length / middleDays);
        for (let i = 0; i < middleDays; i++) {
          const chunk = names.slice(i * perDay, (i + 1) * perDay);
          days.push({ title: `Day ${i + 2}: ${chunk.join(' & ')}`, body: 'Guided exploration and local activities.' });
        }
      } else {
        for (let i = 0; i < middleDays; i++) {
          const n = names[i % names.length];
          days.push({ title: `Day ${i + 2}: ${n}`, body: `Discover highlights of ${n}.` });
        }
      }
    }
    days.push({ title: `Day ${totalDays}: Departure`, body: 'Relaxed morning, check-out, and departure.' });

    return days.map(d => `<h3 class="text-base font-semibold mb-1">${d.title}</h3><p class="mb-3 text-sm">${d.body}</p>`).join('');
  };

  const renderDetail = (plan: any) => (
    <div className="space-y-3">
      <div className="flex items-center text-gray-700"><Calendar className="w-4 h-4 mr-2 text-orange-500" />
        {plan.startDate ? new Date(plan.startDate).toLocaleDateString() : '-'} → {plan.endDate ? new Date(plan.endDate).toLocaleDateString() : '-'} ({computeDays(plan.startDate, plan.endDate)} days)
      </div>
      <div className="flex items-center text-gray-700"><Users className="w-4 h-4 mr-2 text-orange-500" /> Travelers: {plan.numberOfPeople}</div>
      <div className="prose max-w-none mt-2">
        <div
          dangerouslySetInnerHTML={{ __html: (plan.itineraryText && plan.itineraryText.length > 0) ? plan.itineraryText : generateScheduleHtml(plan) }}
        />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">My Plans</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-6 h-6 text-gray-600" /></button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cards */}
          <div className="space-y-4">
            {plans.map((p) => (
              <button key={p._id} onClick={() => setSelected(p)} className="w-full text-left border rounded-xl p-4 hover:shadow transition">
                <div className="font-semibold text-gray-800">
                  {p.destination}
                  {Array.isArray(p.destinations) && p.destinations.length > 1 && (
                    <span className="ml-2 text-xs text-gray-500">({p.destinations.join(', ')})</span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {p.startDate ? new Date(p.startDate).toLocaleDateString() : '-'} → {p.endDate ? new Date(p.endDate).toLocaleDateString() : '-'}
                  {' '}• {computeDays(p.startDate, p.endDate)} days
                </div>
              </button>
            ))}
            {plans.length === 0 && <div className="text-sm text-gray-500">No saved plans.</div>}
          </div>

          {/* Detail view */}
          <div className="border rounded-xl p-4 min-h-[200px]">
            {!selected ? (
              <div className="text-sm text-gray-500">Select a plan to view details.</div>
            ) : (
              <>
                {renderDetail(selected)}
                {Array.isArray((selected as any)?.destinations) && (selected as any).destinations.length > 0 && (
                  <div className="mt-3 text-sm text-gray-700">
                    <span className="font-semibold">Destinations:</span> {(selected as any).destinations.join(', ')}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlansModal;


