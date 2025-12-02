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
          <h2 className="text-2xl font-bold mt-6 mb-2">Support</h2>
          <p className="mt-2">
            Slab 17 is a daily logic puzzle game where you identify which slabs satisfy a hidden rule.
            This page explains how to get help, find quick answers, and understand how we handle your data.
          </p>

          {/* How to contact us */}
          <h3 className="text-xl font-semibold mt-6 mb-2">How to contact us</h3>
          <p className="mt-2">
            If you need help, find a bug, or have feedback about Slab 17, please email us at{' '}
            <a href="mailto:hi@slab.com" className="text-blue-600 underline">
              hi@slab.com
            </a>
            . We typically respond within <strong>24–48 hours</strong>.
          </p>
          <p className="mt-2">
            When you contact us, it&apos;s helpful if you include:
          </p>
          <ul className="list-disc list-inside mt-1">
            <li>Which device you&apos;re using (for example, iPhone 15, iPad Air, Mac)</li>
            <li>A short description of what you were doing when the issue happened</li>
          </ul>

          {/* FAQ / Common questions */}
          <h3 className="text-xl font-semibold mt-6 mb-2">Frequently asked questions</h3>

          <h4 className="text-lg font-semibold mt-4 mb-1">How do I play Slab 17?</h4>
          <p className="mt-1">
            Each puzzle has a hidden rule that determines which slabs are correct. Make slabs to get information
            , make guesses, submit when you&apos;re ready, and use the feedback to refine your understanding of the
            rule. You can also open the tutorial from the main menu for a step‑by‑step guide.
          </p>

          <h4 className="text-lg font-semibold mt-4 mb-1">I&apos;m stuck on a puzzle. What can I do?</h4>
          <p className="mt-1">
            Try focusing on a smaller set of slabs and look for patterns in color, shape, or position. If you&apos;re
            still stuck, you can come back to the puzzle later—your progress is saved.
          </p>

          <h4 className="text-lg font-semibold mt-4 mb-1">Will I lose my progress if I delete the app?</h4>
          <p className="mt-1">
            If you sign in, your puzzle progress can be stored safely in the cloud. If you play without signing in
            and delete the app, your local progress may be lost.
          </p>

          {/* Troubleshooting */}
          <h3 className="text-xl font-semibold mt-6 mb-2">Troubleshooting</h3>
          <p className="mt-1">
            If Slab 17 is not working as expected, try the following steps:
          </p>
          <ul className="list-disc list-inside mt-1">
            <li>Make sure you have the latest version of Slab 17 installed from the App Store</li>
            <li>Completely close and reopen the app</li>
            <li>Reinstall the app if the issue continues</li>
          </ul>
          <p className="mt-1">
            If these steps don&apos;t help, please contact us with details so we can investigate.
          </p>

          {/* Privacy and data */}
          <h3 className="text-xl font-semibold mt-6 mb-2">Privacy and data</h3>
          <p className="mt-1">
            We take your privacy seriously. Slab 17 only collects the minimum data needed to provide the game,
            improve the experience, and keep your progress in sync. For full details, please see our privacy
            policy.
          </p>
          <p className="mt-1">
            You can view our privacy policy at:{' '}
            <a
              href="https://slab17.com/privacy"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline"
            >
              slab17.com/privacy
            </a>
            .
          </p>

          <p className="mt-6 text-sm text-gray-600">
            Thank you for playing Slab 17. — George
          </p>
        </div>
      </div>
    </div>
  );
};

export default Support;

