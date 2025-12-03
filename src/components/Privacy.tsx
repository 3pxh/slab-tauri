import React from 'react';
import AppHeader from './AppHeader';
import { useNavigation } from '../utils/navigation';

const Privacy: React.FC = () => {
  const { goHome } = useNavigation();

  return (
    <div className="w-full max-w-md mx-auto p-4">
      {/* App Header */}
      <AppHeader onBack={goHome} showBackButton={true} titleSize="large" />

      {/* Privacy Policy Content */}
      <div className="prose prose-sm max-w-none">
        <div className="text-gray-800 leading-relaxed">
          <h2 className="text-2xl font-bold mt-6 mb-4">Privacy Policy</h2>

          <h3 className="text-xl font-semibold mt-6 mb-3">Information We Collect</h3>
          
          <p className="mt-4">
            We collect only the following information:
          </p>
          
          <ul className="list-disc pl-6 mt-4 space-y-2">
            <li><strong>Gameplay Data:</strong> We collect gameplay data such as your puzzle progress, completion times, and scores to enhance your gaming experience and allow you to track your progress.</li>
            <li><strong>Email Address (Optional):</strong> If you choose to save your progress, you may optionally provide an email address. This is used solely to associate your progress with your account and is not used for any other purpose.</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">Third-Party Sharing</h3>
          
          <p className="mt-4">
            We do not sell, trade, or share your information with any third parties. Your data is used exclusively to
            provide and improve the Slab 17 gaming experience.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">Data deletion</h3>
          <p className="mt-4">
            You can delete your account and associated data at any time from within the app. To do this, sign in, tap
            the <strong>&quot;Saving progress as &lt;your email&gt;&quot;</strong> link, and choose{' '}
            <strong>Delete account</strong>. When you confirm, we permanently remove your account, puzzle progress,
            and related sync data from our systems.
          </p>
          <p className="mt-4">
            For a step‑by‑step description of this process, or if you need help completing a deletion request, please
            visit our{' '}
            <a href="/delete" className="text-blue-600 underline">
              data deletion page
            </a>
            .
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">Contact</h3>
          
          <p className="mt-4">
            If you have any questions about this privacy policy, please contact us at contact hi ạt slab ɗοt com.
          </p>

          <p className="mt-6 text-sm text-gray-600">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Privacy;

