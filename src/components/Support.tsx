import React from 'react';
import AppHeader from './AppHeader';
import { useNavigation } from '../utils/navigation';

const Support: React.FC = () => {
  const { goHome } = useNavigation();

  return (
    <div className="w-full max-w-md mx-auto p-4">
      {/* App Header */}
      <AppHeader onBack={goHome} showBackButton={true} titleSize="large" />

      {/* Support Content */}
      <div className="prose prose-sm max-w-none">
        <div className="text-gray-800 leading-relaxed">
          <h2 className="text-2xl font-bold mt-6 mb-4">Support</h2>
          
          <p className="mt-6">
            If you need help or have questions about Slab 17, please contact contact hi ạt slab ɗοt com. I look forward to hearing from you. -George
          </p>

        </div>
      </div>
    </div>
  );
};

export default Support;

