'use client';

import { useState } from 'react';
import { CheckCircle, Upload, Loader } from 'lucide-react';

export default function Home() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cv, setCv] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fileName, setFileName] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData: FormData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('phone', phone);
      if (cv) {
        formData.append('file', cv);
      }

      const response = await fetch('/api/submit', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to submit application');
      }

      console.log('Application submitted');
      setSuccess(true);

      // Reset form after successful submission
      setName('');
      setEmail('');
      setPhone('');
      setCv(null);
      setFileName('');

    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setCv(file);
      setFileName(file.name);
    }
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <div className="form-header">
          <h1>Submit Your Application</h1>
          <p className="subtitle">Join our team by completing the form below</p>
        </div>

        {success ? (
          <div className="success-message">
            <CheckCircle size={48} />
            <h2>Application Submitted!</h2>
            <p>We&apos;ve received your application and will contact you soon.</p>
            <button 
              className="primary-button"
              onClick={() => setSuccess(false)}
            >
              Submit Another Application
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="application-form">
            <div className="form-instructions">
              <p>All fields are required</p>
              <p>Accepted formats: PDF, DOC, DOCX (Max: 10MB)</p>
            </div>

            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+1 (123) 456-7890"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="cv">Curriculum Vitae</label>
              <div className="file-input-container">
                <input
                  id="cv"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="file-input"
                  required
                />
                <div className="file-input-button">
                  <Upload size={20} />
                  <span>{fileName || 'Choose a file'}</span>
                </div>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button 
              type="submit" 
              className="submit-button" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader className="spinner" size={20} /> 
                  Processing...
                </>
              ) : 'Submit Application'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}