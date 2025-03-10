
// components/UploadField.jsx
import { ChangeEvent } from 'react';

interface UploadFieldProps {
  label: string;
  id: string;
  name: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  accept?: string;
}

export default function UploadField({ label, id, name, onChange, error, accept }: UploadFieldProps) {
    return (
      <div className="mb-4">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label} <span className="text-red-500">*</span>
        </label>
        
        <div className="relative border-2 border-dashed border-gray-300 rounded-md p-6 bg-gray-50">
          <input
            id={id}
            name={name}
            type="file"
            onChange={onChange}
            accept={accept}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mt-1 text-sm text-gray-500">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-500">PDF or DOCX (Max 10MB)</p>
          </div>
        </div>
        
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }