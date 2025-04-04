import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const OPTIONS = [
  'Problem Statement 1',
  'Problem Statement 2',
  'Problem Statement 3',
  'Problem Statement 4',
  'Problem Statement 5'
];

const OPTION_LIMIT = 20;

const ContestPage = () => {
  const navigate = useNavigate();
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [userSelection, setUserSelection] = useState<string | null>(null);
  const [totalParticipants, setTotalParticipants] = useState(0);

  useEffect(() => {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
      navigate('/');
      return;
    }

    loadContestData();
    const subscription = supabase
      .channel('contest_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contest_selections' }, () => {
        loadContestData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadContestData = async () => {
    const { data: selectionsData } = await supabase
      .from('contest_selections')
      .select('option')
      .not('option', 'is', null);

    const counts: Record<string, number> = {};
    selectionsData?.forEach(({ option }) => {
      counts[option] = (counts[option] || 0) + 1;
    });
    setSelections(counts);
    setTotalParticipants(selectionsData?.length || 0);

    const userEmail = localStorage.getItem('userEmail');
    if (userEmail) {
      const { data: userSelection } = await supabase
        .from('contest_selections')
        .select('option')
        .eq('email', userEmail)
        .single();
      setUserSelection(userSelection?.option || null);
    }
  };

  const handleOptionSelect = async (option: string) => {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
      navigate('/');
      return;
    }

    if (userSelection) {
      toast.error('You have already participated');
      return;
    }

    const currentCount = selections[option] || 0;
    if (currentCount >= OPTION_LIMIT) {
      toast.error('This problem statement has reached its participant limit');
      return;
    }

    try {
      const { error } = await supabase
        .from('contest_selections')
        .insert([{ email: userEmail, option }]);

      if (error) throw error;
      toast.success('Problem statement selected successfully');
      loadContestData();
    } catch (error) {
      toast.error('Error selecting problem statement');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Problem Statement Selection</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              Total Participants: {totalParticipants}/100
            </span>
            <button
              onClick={() => {
                localStorage.removeItem('userEmail');
                navigate('/');
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {OPTIONS.map((option) => {
            const count = selections[option] || 0;
            const percentage = (count / OPTION_LIMIT) * 100;
            const isSelected = userSelection === option;
            const isFull = count >= OPTION_LIMIT;

            return (
              <div key={option} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-lg">{option}</span>
                  <span className="text-sm text-gray-500">
                    {count}/{OPTION_LIMIT} spots filled
                  </span>
                </div>
                <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="absolute h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => handleOptionSelect(option)}
                    disabled={!!userSelection || isFull}
                    className={`w-full py-2 rounded-md ${
                      isSelected
                        ? 'bg-green-500 text-white'
                        : isFull
                        ? 'bg-gray-300 cursor-not-allowed'
                        : userSelection
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {isSelected
                      ? 'Selected'
                      : isFull
                      ? 'Full'
                      : userSelection
                      ? 'Already Participated'
                      : 'Select'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ContestPage;