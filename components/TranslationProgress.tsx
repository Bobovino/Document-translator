import React from 'react';

interface TranslationProgressProps {
  progress: number;
  totalSentences?: number;
  processedSentences?: number;
  onCancel?: () => void;
}

const TranslationProgress: React.FC<TranslationProgressProps> = ({
  progress,
  totalSentences,
  processedSentences,
  onCancel
}) => {
  return (
    <div className="w-full mt-6 mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span>Traduciendo documento...</span>
        <span>
          {progress.toFixed(0)}%
          {totalSentences && processedSentences !== undefined && 
            ` (${processedSentences}/${totalSentences} frases)`}
        </span>
      </div>
      
      <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
        <div 
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      {onCancel && (
        <button 
          onClick={onCancel}
          type="button" 
          className="text-xs text-gray-400 hover:text-gray-200"
        >
          Cancelar traducción
        </button>
      )}
    </div>
  );
};

export default TranslationProgress;
