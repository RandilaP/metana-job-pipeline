'use client';

import { useState } from 'react';
import ApplicationForm from './components/ApplicationForm';

export default function Home() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  interface FormData {
    [key: string]: any;
  }

  interface Error {
    message: string;
  }

  const handleSubmit = async (formData: FormData): Promise<void> => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error('Submission failed');
      }
      
      setSubmitSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold text-center mb-8 text-blue-600">
          Job Application Form
        </h1>
        
        {submitSuccess ? (
          <div className="bg-green-50 border border-green-400 text-green-700 p-4 rounded mb-6">
            <p>Thank you for your application! Your CV has been successfully submitted and is now under review.</p>
          </div>
        ) : (
          <ApplicationForm 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting} 
            error={error}
          />
        )}
      </div>
    </main>
  );
}