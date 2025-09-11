import React from 'react';
import { Shield } from 'lucide-react';

export const ReCaptcha: React.FC = () => {
  return (
    <div className="flex items-center justify-between p-3 border border-gray-300 rounded-lg bg-gray-50 mb-6">
      <div className="flex items-center">
        <input
          type="checkbox"
          className="h-6 w-6 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3"
        />
        <span className="text-sm text-gray-700">I'm not a robot</span>
      </div>
      <div className="flex flex-col items-center">
        <Shield className="h-8 w-8 text-blue-600" />
        <span className="text-xs text-gray-500 mt-1">reCAPTCHA</span>
      </div>
    </div>
  );
};