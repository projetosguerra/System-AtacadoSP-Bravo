import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  className = '',
  ...props
}) => {
  return (
    <div className="flex items-center">
      <input
        {...props}
        type="checkbox"
        className={`
          h-4 w-4 text-green-600 border-gray-300 rounded
          focus:ring-green-500 focus:ring-2 transition-colors
          ${className}
        `}
      />
      <label className="ml-2 text-sm text-gray-700 cursor-pointer select-none">
        {label}
      </label>
    </div>
  );
};