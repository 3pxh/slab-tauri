import React from 'react';

type CoachBannerProps = {
  children: React.ReactNode;
  action?: React.ReactNode;
};

const CoachBanner: React.FC<CoachBannerProps> = ({ children, action }) => (
  <div className="flex items-center gap-3 rounded-lg bg-blue-50 border border-blue-200 p-3 min-h-[4.5rem]">
    <p className="flex-1 text-sm text-blue-900 leading-snug">{children}</p>
    {action}
  </div>
);

export default CoachBanner;
