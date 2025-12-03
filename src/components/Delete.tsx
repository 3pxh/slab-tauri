import React from 'react';
import AppHeader from './AppHeader';
import { useNavigation } from '../utils/navigation';

const Delete: React.FC = () => {
  const { goHome } = useNavigation();

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <AppHeader onBack={goHome} showBackButton={true} titleSize="large" />

      <div className="prose prose-sm max-w-none">
        <div className="text-gray-800 leading-relaxed">
          <h2 className="text-2xl font-bold mt-6 mb-2">Delete your data</h2>
          <p className="mt-2">
            You can remove your Slab 17 data on your own at any time. The steps below permanently delete your
            account, puzzle progress, and any saved preferences tied to your email address.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-2">Before you begin</h3>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Make sure you are using the most recent version of the app.</li>
            <li>Confirm you have access to the email address associated with your progress.</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-2">How to delete your data</h3>
          <ol className="list-decimal pl-6 mt-2 space-y-2">
            <li>
              Open Slab 17 and sign in using the same method you used to save progress. This is required so we can verify you own the data.
            </li>
            <li>
              Once signed in, tap the{' '}
              <strong>
                “Saving progress as &lt;your email&gt;”
              </strong>{' '}
              link. This opens the account details sheet.
            </li>
            <li>
              Choose <strong>Delete account</strong>, then confirm. We immediately purge your account, puzzles,
              and sync data from our systems.
            </li>
          </ol>

          <p className="mt-4">
            If you see a success message, the deletion is complete. If the app closes or you lose connection,
            repeat the steps above—the delete action only runs after you confirm in step 3.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-2">Need help?</h3>
          <p className="mt-2">
            If you can’t sign in, no longer have access to your email, or run into errors while deleting your
            account, please reach out so we can help you finish the process.
          </p>
          <p className="mt-2">
            <a href="/support" className="text-blue-600 underline">
              Contact support
            </a>{' '}
            or review our{' '}
            <a href="/privacy" className="text-blue-600 underline">
              privacy policy
            </a>{' '}
            for more information about how we handle your data.
          </p>

          <p className="mt-6 text-sm text-gray-600">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Delete;


