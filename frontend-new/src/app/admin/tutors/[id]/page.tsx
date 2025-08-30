// @ts-nocheck

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/services/supabase';
import Link from 'next/link';

export default function ViewTutorPage() {
  const router = useRouter();
  const params = useParams();
  const tutorId = params.id as string;
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token ?? '';
        const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tutors/${tutorId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!resp.ok) throw new Error('Failed to load tutor');
        const json = await resp.json();
        setData(json);

        // Load past jobs for this tutor
        const hist = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tutors/${tutorId}/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (hist.ok) {
          const hj = await hist.json();
          setHistory(hj.jobs || []);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load tutor');
      } finally {
        setLoading(false);
      }
    })();
  }, [tutorId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-800">Loading tutor information...</p>
        </div>
      </div>
    );
  }
  
  if (error || !data?.tutor) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-red-600 mb-4">{error || 'Tutor not found'}</p>
          <button 
            onClick={() => router.back()} 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  const { tutor, subject_approvals = [] } = data;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.back()} 
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{tutor.first_name} {tutor.last_name}</h1>
                <p className="text-gray-600">{tutor.school?.name} • {tutor.email}</p>
              </div>
            </div>
            <Link
              href={`/admin/tutors/${tutor.id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Edit Certifications
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tutor Info Card */}
          <div className="lg:col-span-1">
            <div className="bg-white border-2 border-gray-100 rounded-xl p-6">
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mr-4">
                  <span className="text-xl font-bold text-white">
                    {tutor.first_name.charAt(0)}{tutor.last_name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{tutor.first_name} {tutor.last_name}</h2>
                  <p className="text-sm text-gray-500">{tutor.email}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Status</span>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    tutor.status === 'active' ? 'bg-green-100 text-green-800' :
                    tutor.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {tutor.status === 'active' ? 'Active' :
                     tutor.status === 'pending' ? 'Pending' :
                     'Suspended'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Volunteer Hours</span>
                  <span className="text-lg font-semibold text-blue-600">{tutor.volunteer_hours || 0}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">School</span>
                  <span className="text-sm text-gray-900">{tutor.school?.name || 'Not assigned'}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Subject Approvals</span>
                  <span className="text-lg font-semibold text-green-600">{subject_approvals.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Subject Approvals */}
          <div className="lg:col-span-2">
            <div className="bg-white border-2 border-gray-100 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Subject Approvals</h2>
                <p className="text-sm text-gray-600">Certified subjects this tutor can teach</p>
              </div>
              
              {subject_approvals.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No subject approvals</h3>
                  <p className="text-sm text-gray-500">This tutor hasn't been certified for any subjects yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {subject_approvals.map((a: any) => (
                    <div key={a.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mr-4">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{a.subject_name || 'Unknown'} • {a.subject_type}</div>
                          <div className="text-sm text-gray-500">Grade {a.subject_grade}</div>
                        </div>
                      </div>
                      <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">{a.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tutoring History */}
        <div className="mt-8">
          <div className="bg-white border-2 border-gray-100 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Tutoring History</h2>
              <p className="text-sm text-gray-600">Past tutoring sessions and completed jobs</p>
            </div>
            
            {history.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">No tutoring history</h3>
                <p className="text-sm text-gray-500">This tutor hasn't completed any sessions yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {history.map((job: any) => (
                  <div key={job.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mr-4">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0l-2-2m2 2l2-2m-7 8h10a2 2 0 002-2V8a2 2 0 00-2-2H7a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {job.subject_name} • {job.subject_type} • Grade {job.subject_grade}
                          </div>
                          <div className="text-sm text-gray-500">
                            {job.scheduled_time ? new Date(job.scheduled_time).toLocaleString() : 'N/A'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {job.awarded_hours || 0} hours
                        </div>
                        <div className="text-xs text-gray-500">
                          {job.status === 'verified' ? 'Verified' : job.status}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}


