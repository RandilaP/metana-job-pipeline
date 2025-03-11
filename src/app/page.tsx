'use client';

import { useState } from 'react';

export default function Home() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cv, setCv] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  interface FetchResponse {
    ok: boolean;
  }

  interface SubmitEvent extends React.FormEvent<HTMLFormElement> {}

  async function handleSubmit(event: SubmitEvent): Promise<void> {
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

      const response: FetchResponse = await fetch('/api/submit', {
        method: 'POST',
        body: formData,
      });
      console.log(formData.get('cv'));
      if (!response.ok) {
        throw new Error('Failed to submit application');
      }

      console.log('Application submitted');

      setSuccess(true);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="application-form">
      <h1>Submit Your Application</h1>
      <p>Please fill out the form below to submit your application.</p>
      <p>All fields are required.</p>
      <p>Accepted file formats: PDF, DOC, DOCX</p>
      <p>Maximum file size: 10MB</p>
      <label>
        Name:
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </label>
      <label>
        Email:
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label>
        Phone:
        <input
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          required
        />
      </label>
      <label>
        CV:
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(event) => {
            if (event.target.files && event.target.files.length > 0) {
              setCv(event.target.files[0]);
            }
          }}
          required
        />
      </label>
      <button type="submit" disabled={loading}>
        {loading ? <span className="spinner"></span> : 'Submit'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>Application submitted!</p>}
    </form>
  );
}