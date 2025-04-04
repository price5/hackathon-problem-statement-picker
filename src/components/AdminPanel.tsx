import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, RefreshCw, Users } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const OPTIONS = [
  'Problem Statement 1',
  'Problem Statement 2',
  'Problem Statement 3',
  'Problem Statement 4',
  'Problem Statement 5'
];

const AdminPanel = () => {
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [optionCounts, setOptionCounts] = useState<Record<string, number>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || session.user.email !== 'rohitraj16092004@gmail.com') {
      navigate('/');
      return;
    }
    loadParticipants();
  };

  const loadParticipants = async () => {
    try {
      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .order('created_at', { ascending: true });

      if (participantsError) throw participantsError;

      const { data: selectionsData, error: selectionsError } = await supabase
        .from('contest_selections')
        .select('email, option, created_at')
        .order('created_at', { ascending: true });

      if (selectionsError) throw selectionsError;

      // Create a map of email to selection details
      const selectionsMap = new Map(
        selectionsData?.map(selection => [
          selection.email, 
          { 
            option: selection.option,
            timestamp: new Date(selection.created_at).toLocaleString()
          }
        ]) || []
      );

      // Count selections per option
      const counts: Record<string, number> = {};
      selectionsData?.forEach(({ option }) => {
        counts[option] = (counts[option] || 0) + 1;
      });
      setOptionCounts(counts);

      // Combine the data
      const combinedData = (participantsData || []).map(participant => ({
        ...participant,
        selection: selectionsMap.get(participant.email) || null
      }));

      setParticipants(combinedData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error loading participants');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast.error('Please select a CSV file');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a valid CSV file');
      return;
    }

    setIsUploading(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          if (results.errors.length > 0) {
            throw new Error('CSV file contains errors. Please check the format.');
          }

          const participantsData = results.data
            .filter((row: any) => {
              if (!row.email || typeof row.email !== 'string') {
                return false;
              }
              const email = row.email.trim().toLowerCase();
              return email && email.includes('@');
            })
            .map((row: any) => ({
              email: row.email.trim().toLowerCase(),
              team_name: row['Team Name'] || row['teamName'] || row['team_name'] || '',
              applicant_id: row['Applicant ID'] || row['applicant_id'] || row['Applicant Id'] || row['applicantId'] || '',
              participant_name: row['Participant Name'] || row['participantName'] || row['participant_name'] || '',
              phone: row['Phone'] || row['phone'] || '',
              college: row['College'] || row['college'] || '',
              usn: row['USN'] || row['usn'] || ''
            }));

          if (participantsData.length === 0) {
            throw new Error('No valid participant data found in CSV. Please check the file format and ensure it contains valid email addresses.');
          }

          // First delete contest selections
          const { error: deleteSelectionsError } = await supabase
            .from('contest_selections')
            .delete()
            .neq('email', 'rohitraj16092004@gmail.com');

          if (deleteSelectionsError) {
            throw deleteSelectionsError;
          }

          // Then delete participants
          const { error: deleteParticipantsError } = await supabase
            .from('participants')
            .delete()
            .neq('email', 'rohitraj16092004@gmail.com');

          if (deleteParticipantsError) {
            throw deleteParticipantsError;
          }

          // Insert new participants in batches
          const batchSize = 10;
          for (let i = 0; i < participantsData.length; i += batchSize) {
            const batch = participantsData.slice(i, i + batchSize);
            const { error: insertError } = await supabase
              .from('participants')
              .upsert(batch, {
                onConflict: 'email',
                ignoreDuplicates: false
              });
            
            if (insertError) {
              throw insertError;
            }

            // Add a small delay between batches
            if (i + batchSize < participantsData.length) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }

          toast.success(`Successfully uploaded ${participantsData.length} participants`);
          await loadParticipants();
          
          // Reset the file input
          event.target.value = '';
        } catch (error: any) {
          console.error('Upload error:', error);
          toast.error(error.message || 'Error uploading participants');
        } finally {
          setIsUploading(false);
        }
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        toast.error('Error parsing CSV file. Please check the file format.');
        setIsUploading(false);
      }
    });
  };

  const resetContest = async () => {
    try {
      setIsResetting(true);

      const { data: currentSelections, error: selectionsError } = await supabase
        .from('contest_selections')
        .select('*, participants(*)');

      if (selectionsError) throw selectionsError;

      if (currentSelections && currentSelections.length > 0) {
        const csvData = currentSelections.map((selection: any) => ({
          'Participant Name': selection.participants?.participant_name || '',
          'Email': selection.participants?.email || '',
          'Selected Option': selection.option || '',
          'Timestamp': new Date(selection.created_at).toLocaleString()
        }));

        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `contest_selections_backup_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      const { error: deleteSelectionsError } = await supabase
        .from('contest_selections')
        .delete()
        .neq('email', 'rohitraj16092004@gmail.com');

      if (deleteSelectionsError) {
        throw new Error('Failed to delete contest selections');
      }

      const { error: deleteParticipantsError } = await supabase
        .from('participants')
        .delete()
        .neq('email', 'rohitraj16092004@gmail.com');

      if (deleteParticipantsError) {
        throw new Error('Failed to delete participants');
      }

      toast.success('Contest has been reset successfully');
      await loadParticipants();
    } catch (error: any) {
      console.error('Reset error:', error);
      toast.error('Error resetting contest: ' + (error.message || 'Unknown error'));
    } finally {
      setIsResetting(false);
    }
  };

  const getParticipantsByOption = () => {
    const grouped: Record<string, any[]> = {};
    OPTIONS.forEach(option => {
      grouped[option] = participants.filter(p => p.selection?.option === option);
    });
    const notSelected = participants.filter(p => !p.selection);
    return { grouped, notSelected };
  };

  const { grouped, notSelected } = getParticipantsByOption();

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <button
            onClick={() => {
              localStorage.removeItem('userEmail');
              navigate('/');
            }}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
          >
            Logout
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Upload Participants</h2>
          <div className="flex items-center gap-4">
            <label className={`flex items-center gap-2 ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 cursor-pointer'} text-white px-4 py-2 rounded-md`}>
              <Upload size={20} />
              {isUploading ? 'Uploading...' : 'Upload CSV'}
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>
            <button
              onClick={resetContest}
              disabled={isUploading || isResetting}
              className={`flex items-center gap-2 ${isUploading || isResetting ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'} text-white px-4 py-2 rounded-md`}
            >
              <RefreshCw size={20} className={isResetting ? 'animate-spin' : ''} />
              {isResetting ? 'Resetting...' : 'Reset Contest'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Selection Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => setSelectedOption(selectedOption === option ? null : option)}
                className={`bg-gray-50 p-4 rounded-lg transition-colors ${
                  selectedOption === option ? 'ring-2 ring-blue-500' : 'hover:bg-gray-100'
                }`}
              >
                <h3 className="font-semibold text-lg mb-2">{option}</h3>
                <p className="text-2xl font-bold text-blue-600">{optionCounts[option] || 0}</p>
                <p className="text-sm text-gray-500">participants</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {selectedOption ? (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Participants who selected {selectedOption}</h2>
                <div className="flex items-center gap-2 text-gray-600">
                  <Users size={20} />
                  <span>{grouped[selectedOption].length} participants</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Participant Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Team Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        College
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Selection Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {grouped[selectedOption].map((participant) => (
                      <tr key={participant.id}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {participant.participant_name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {participant.email}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {participant.team_name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {participant.college}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {participant.selection.timestamp}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 overflow-hidden mt-8">
          <h2 className="text-xl font-semibold mb-4">All Registered Participants</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applicant ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Participant Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    College
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    USN
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Selection Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {participants.map((participant) => (
                  <tr key={participant.id}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {participant.team_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {participant.applicant_id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {participant.participant_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {participant.email}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {participant.phone}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {participant.college}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {participant.usn}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {participant.selection ? (
                        <div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Selected {participant.selection.option}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            {participant.selection.timestamp}
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Not Participated
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;