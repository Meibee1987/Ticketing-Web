import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function TwoFADebug() {
  const [debug, setDebug] = useState('');
  const [loading, setLoading] = useState(false);

  const testMFA = async () => {
    setLoading(true);
    setDebug('Testing MFA support...');

    try {
      // Check apakah mfa methods tersedia
      console.log('supabase.auth:', supabase.auth);
      console.log('supabase.auth.mfa:', supabase.auth.mfa);

      if (!supabase.auth.mfa) {
        setDebug('❌ Error: supabase.auth.mfa tidak tersedia!');
        return;
      }

      // Try enroll
      setDebug('Attempting enroll TOTP...');
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });

      if (error) {
        setDebug(`❌ Error: ${error.message}`);
        console.error('Error:', error);
        return;
      }

      setDebug('✅ MFA Enroll Success!');
      console.log('MFA Data:', data);
    } catch (err) {
      setDebug(`❌ Exception: ${err.message}`);
      console.error('Exception:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-lg font-bold mb-4">2FA Debug Test</h2>

      <button
        onClick={testMFA}
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test MFA'}
      </button>

      {debug && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg font-mono text-sm whitespace-pre-wrap">
          {debug}
        </div>
      )}
    </div>
  );
}
