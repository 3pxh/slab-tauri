import React from 'react';
import AppHeader from './AppHeader';
import { useNavigation } from '../utils/navigation';

const About: React.FC = () => {
  const { goHome } = useNavigation();

  return (
    <div className="w-full max-w-md mx-auto p-4">
      {/* App Header */}
      <AppHeader onBack={goHome} showBackButton={true} titleSize="large" />

      {/* About Content */}
      <div className="prose prose-sm max-w-none">
        <div className="text-gray-800 leading-relaxed">
          <p className="mt-6">
          It might sound strange, but I made this game to share the practice of being confused while still actively participating. It's difficult sometimes, and I know Slab is a difficult game, but I sincerely hope that you'll find those uncomfortable moments of not knowing what's going on to be rewarding, both in the game and outside of it. Regardless of how many trophies you get or puzzles you solve, I personally believe this is the real prize, and whether you win or lose I hope you come away from each puzzle with a curious mind to engage the world around you.
          </p>

          <p className="mt-6">
          On that note, I for one feel like I don't know what's going on with the state of the world, with the person sitting across from me, or even at times inside of myself. When I allow myself to not know for a minute I become free to explore and engage with the mystery of what new information might come my way. Listening to each other and ourselves more deeply, I hope we might inhabit a beautiful world together.
          </p>

          <p className="mt-6">
            Warmly,
          </p>

          <p>
            George
          </p>

          <p className="mt-6 text-sm text-gray-600 italic">
            PS for the philosophically inclined players, I suggest the later writings of Wittgenstein as well as Feyerabend's book Against Method. 
          </p>
          <p className="mt-6 text-sm text-gray-600 italic">
          PPS this app is given freely on the web and licensed in the public domain via CC0. You are free to remix, distribute, and otherwise make it your own as you like. Visit <a href="https://source.slab17.com" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-900 underline font-medium">source.slab17.com</a> for the source code.
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;

