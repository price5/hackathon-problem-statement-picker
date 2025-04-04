import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const cleanEmail = email.trim().toLowerCase();

      // Check if email is admin
      if (cleanEmail === 'rohitraj16092004@gmail.com') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: 'default-password'
        });

        if (signInError) {
          // If sign in fails, create a new account
          const { error: signUpError } = await supabase.auth.signUp({
            email: cleanEmail,
            password: 'default-password'
          });

          if (signUpError) throw signUpError;
          
          // Try signing in again after signup
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: 'default-password'
          });
        }

        localStorage.setItem('userEmail', cleanEmail);
        navigate('/admin');
        return;
      }

      // For regular participants, check if they exist in the participants table
      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .select('email')
        .eq('email', cleanEmail)
        .single();

      if (participantError || !participant) {
        toast.error('Email not found in participants list');
        setIsLoading(false);
        return;
      }

      // For participants, always try to sign up first
      const { error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: 'default-password'
      });

      // Ignore sign up error as user might already exist
      
      // Then try to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: 'default-password'
      });

      if (signInError) throw signInError;

      // Verify the session exists
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Failed to establish session');
      }

      localStorage.setItem('userEmail', cleanEmail);
      navigate('/contest');

    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error('Error during authentication. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">Problem Statement Selection</h1>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Enter your email"
              required
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white py-2 rounded-md transition-colors`}
          >
            {isLoading ? 'Checking...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;