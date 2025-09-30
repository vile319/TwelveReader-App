import React from 'react';

interface SampleText {
  title: string;
  text: string;
}

interface TextInputProps {
  text: string;
  setText: (text: string) => void;
  sampleTexts: SampleText[];
}

const TextInput: React.FC<TextInputProps> = ({ text, setText, sampleTexts }) => {
  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">📝 Enter Text</h3>
        <div className="text-sm text-slate-400">
          {text.length} characters
        </div>
      </div>

      {/* Sample Texts */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="text-sm text-slate-400">Quick samples:</span>
        {sampleTexts.map((sample, idx) => (
          <button
            key={idx}
            onClick={() => setText(sample.text)}
            className="px-3 py-1 text-xs rounded-full bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors duration-200"
          >
            {sample.title}
          </button>
        ))}
      </div>

      {/* Text Area */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type or paste your text here..."
        className="w-full h-64 px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
      />

      {/* Clear Button */}
      <div className="mt-3 flex justify-end">
        <button
          onClick={() => setText('')}
          disabled={!text}
          className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 rounded-lg transition-colors duration-200"
        >
          Clear Text
        </button>
      </div>
    </div>
  );
};

export default TextInput;
