import React, { useState } from 'react';
import { Loader, RotateCw } from 'lucide-react';

interface Joke {
  type: string;
  setup?: string;
  delivery?: string;
  joke?: string;
  error?: boolean;
}

export const JokeGenerator: React.FC = () => {
  const [joke, setJoke] = useState<Joke | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJoke = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        'https://v2.jokeapi.dev/joke/Any?type=single,twopart'
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch joke');
      }
      
      const data: Joke = await response.json();
      
      if (data.error) {
        throw new Error('Could not retrieve a joke');
      }
      
      setJoke(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setJoke(null);
    } finally {
      setLoading(false);
    }
  };

  const displayJoke = () => {
    if (!joke) return '';
    
    if (joke.type === 'twopart') {
      return `${joke.setup}\n\n${joke.delivery}`;
    }
    
    return joke.joke || '';
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">
        😂 Random Joke Generator
      </h2>
      
      <div className="bg-white rounded-lg p-8 mb-6 min-h-32 flex items-center justify-center shadow-md">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-gray-600">Loading a joke...</p>
          </div>
        ) : error ? (
          <p className="text-red-500 text-center text-lg">{error}</p>
        ) : joke ? (
          <p className="text-lg text-gray-800 text-center whitespace-pre-wrap">
            {displayJoke()}
          </p>
        ) : (
          <p className="text-gray-500 text-center text-lg">
            Click the button below to get a random joke! 🎉
          </p>
        )}
      </div>

      <button
        onClick={fetchJoke}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100"
      >
        <RotateCw className="w-5 h-5" />
        {loading ? 'Getting Joke...' : 'Get Random Joke'}
      </button>

      <div className="mt-6 p-4 bg-blue-100 rounded-lg text-sm text-gray-700">
        <p className="text-center">
          💡 Powered by <a href="https://jokeapi.dev" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">JokeAPI</a>
        </p>
      </div>
    </div>
  );
};
