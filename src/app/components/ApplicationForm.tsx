'use client';

import { useState } from 'react';
import FormField from './FormField';
import UploadField from './UploadField';

interface ApplicationFormProps {
  onSubmit: (formData: FormData) => void;
  isSubmitting: boolean;
  error?: string | null;
}

export default function ApplicationForm({ onSubmit, isSubmitting, error }: ApplicationFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | undefined>(undefined);

  interface InputChangeEvent extends React.ChangeEvent<HTMLInputElement> {}

  const handleInputChange = (e: InputChangeEvent) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  interface FileChangeEvent extends React.ChangeEvent<HTMLInputElement> {}

  const handleFileChange = (e: FileChangeEvent) => {
    const file: File | null = e.target.files ? e.target.files[0] : null;
    setFileError(undefined);
    
    if (!file) {
      setCvFile(null);
      return;
    }
    
    // Check file type (PDF or DOCX)
    const validTypes: string[] = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      setFileError('Please upload a PDF or DOCX file');
      setCvFile(null);
      return;
    }
    
    setCvFile(file);
  };

  interface HandleSubmitEvent extends React.FormEvent<HTMLFormElement> {}

  const handleSubmit = (e: HandleSubmitEvent) => {
    e.preventDefault();
    
    if (!cvFile) {
      setFileError('Please upload your CV');
      return;
    }
    
    const formDataToSubmit = new FormData();
    formDataToSubmit.append('name', formData.name);
    formDataToSubmit.append('email', formData.email);
    formDataToSubmit.append('phone', formData.phone);
    formDataToSubmit.append('cv', cvFile);
    
    onSubmit(formDataToSubmit);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <FormField
        label="Full Name"
        id="name"
        name="name"
        type="text"
        value={formData.name}
        onChange={handleInputChange}
        required
      />
      
      <FormField
        label="Email"
        id="email"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleInputChange}
        required
      />
      
      <FormField
        label="Phone Number"
        id="phone"
        name="phone"
        type="tel"
        value={formData.phone}
        onChange={handleInputChange}
        required
      />
      
      <UploadField
        label="Upload CV (PDF or DOCX)"
        id="cv"
        name="cv"
        onChange={handleFileChange}
        error={fileError}
        accept=".pdf,.docx"
      />
      
      {error && (
        <div className="mt-4 text-red-600 text-sm">
          {error}
        </div>
      )}
      
      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full mt-6 py-2 px-4 rounded ${
          isSubmitting 
            ? 'bg-blue-300 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Application'}
      </button>
    </form>
  );
}

