import React from 'react';
interface StatsCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  iconBgColor: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon,
  iconBgColor,
  changeType = 'neutral' 
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
          <p className="text-gray-600 mt-1">{title}</p>
          <div className="mt-3 flex items-center space-x-1">
            {changeType === 'positive' && (
              <span className="text-green-600 text-sm">↑</span>
            )}
            {changeType === 'negative' && (
              <span className="text-red-600 text-sm">↓</span>
            )}
            <p className={`text-sm ${
              changeType === 'positive' ? 'text-green-600' : 
              changeType === 'negative' ? 'text-red-600' : 
              'text-gray-500'
            }`}>
              {subtitle}
            </p>
          </div>
        </div>
        <div className={`w-12 h-12 ${iconBgColor} rounded-lg flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
};

export default StatsCard;