import React from 'react';
import { FiMail } from 'react-icons/fi';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  linkAccountWithEmail: (email: string) => Promise<{ success: boolean; message: string; action?: string }>;
  signInWithPassword: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  onSuccess?: () => void;
}

const SignInModal: React.FC<SignInModalProps> = ({
  isOpen,
  onClose,
  linkAccountWithEmail,
  signInWithPassword,
  signUpWithPassword,
  onSuccess
}) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<'email' | 'password'>('email');
  const [emailLinkSent, setEmailLinkSent] = React.useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setMessage('Please enter an email address');
      return;
    }

    if (authMode === 'password' && !password.trim()) {
      setMessage('Please enter a password');
      return;
    }

    setIsLoading(true);
    setMessage('');
    
    try {
      let result;
      
      if (authMode === 'email') {
        // Use the existing linkAccountWithEmail function for email link authentication
        result = await linkAccountWithEmail(email.trim());
      } else {
        // For password mode, try to sign in first, then sign up if that fails
        try {
          result = await signInWithPassword(email.trim(), password);
        } catch (signInError) {
          // If sign in fails, try to sign up
          result = await signUpWithPassword(email.trim(), password);
        }
      }
      
      setMessage(result.message);
      
      if (result.success) {
        // For email mode, if a sign-in link was sent, show confirmation instead of closing
        if (authMode === 'email' && result.action === 'signin_sent') {
          setEmailLinkSent(true);
        } else {
          // For password mode or successful account linking, close the modal
          if (onSuccess) {
            onSuccess();
          }
          handleClose();
        }
      }
    } catch (error) {
      setMessage(`Failed to authenticate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setMessage('');
    setAuthMode('email');
    setEmailLinkSent(false);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-2 mb-4">
          <FiMail size={20} />
          <h3 className="text-lg font-semibold">Save Your Progress / Sign In</h3>
        </div>
        {emailLinkSent ? (
          <>
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 font-medium mb-2">
                Log in with the link sent to {email}
              </p>
              <p className="text-green-700 text-sm">
                Check your email and click the link to sign in.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-gray-600 mb-4">
              {authMode === 'email' 
                ? "Add an email address to save your progress permanently. If you already have an account with this email, we'll send you a sign-in link instead."
                : "Sign in with your email and password. Note: Password login only works for existing accounts with a password."
              }
            </p>
            
            {/* Authentication Mode Toggle */}
            <div className="mb-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setAuthMode('email')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    authMode === 'email' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  disabled={isLoading}
                >
                  Email Link
                </button>
                <button
                  onClick={() => setAuthMode('password')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    authMode === 'password' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  disabled={isLoading}
                >
                  Use Password
                </button>
              </div>
            </div>

            <div className="mb-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>
            
            {authMode === 'password' && (
              <div className="mb-4">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>
            )}
            
            {message && (
              <div className={`mb-4 p-3 rounded-md text-sm ${
                message.includes('success') || message.includes('Check your email') || message.includes('Signed in') || message.includes('Account created') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {message}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={isLoading || !email.trim() || (authMode === 'password' && !password.trim())}
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : (authMode === 'email' ? 'Send Email Link' : 'Sign In')}
              </button>
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SignInModal;

