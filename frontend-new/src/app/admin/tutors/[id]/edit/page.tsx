// @ts-nocheck

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase as sharedSupabase } from '@/services/supabase';
import { useAuth } from '@/app/providers';
import Link from 'next/link';

// Embedded subject options per spec
const SUBJECT_NAMES = ['Math','English','Science'];
const SUBJECT_TYPES = ['Academic','ALP','IB'];
const SUBJECT_GRADES = ['9','10','11','12'];

interface SubjectApproval {
  id: string;
  subject_name: string;
  subject_type: string;
  subject_grade: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_at: string | null;
  approved_by_admin?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface Tutor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  school: {
    name: string;
    domain: string;
  };
}

interface TutorData {
  tutor: Tutor;
  subject_approvals: SubjectApproval[];
  available_subjects: any[];
}

export default function EditTutorPage() {
  const [tutorData, setTutorData] = useState<TutorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedSubjectName, setSelectedSubjectName] = useState('');
  const [selectedSubjectType, setSelectedSubjectType] = useState('');
  const [selectedSubjectGrade, setSelectedSubjectGrade] = useState('');
  const [selectedIbLevel, setSelectedIbLevel] = useState('');
  
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tutorId = params.id as string;
  const supabase = sharedSupabase;

  useEffect(() => {
    if (!authLoading) {
      loadTutorData();
    }
  }, [tutorId, authLoading]);

  const loadTutorData = async () => {
    try {
      setLoading(true);
      
      if (authLoading) return;
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';
      
      const [tutorResp, subjectsResp, approvalsResp] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tutors/${tutorId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/subjects`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tutors/${tutorId}/approvals`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (!tutorResp.ok) throw new Error('Failed to load tutor');
      const tutorJson = await tutorResp.json();
      
      const subjectsJson = subjectsResp.ok ? await subjectsResp.json() : { subjects: [] };
      const approvalsJson = approvalsResp.ok ? await approvalsResp.json() : { approvals: [] };

      setTutorData({
        tutor: tutorJson.tutor,
        subject_approvals: approvalsJson.approvals || [],
        available_subjects: subjectsJson.subjects || []
      });
    } catch (e: any) {
      setError(e.message || 'Failed to load tutor data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddApproval = async () => {
    if (!selectedSubjectName || !selectedSubjectType || !selectedSubjectGrade) {
      alert('Please select all subject fields');
      return;
    }

    try {
      setUpdating('adding');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';
      
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tutors/${tutorId}/approvals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          subject_name: selectedSubjectName,
          subject_type: selectedSubjectType,
          subject_grade: selectedSubjectGrade,
          ib_level: selectedSubjectType === 'IB' ? selectedIbLevel : null
        })
      });

      if (!resp.ok) {
        const j = await resp.json().catch(()=>({}));
        throw new Error(j.error || 'Failed to add approval');
      }

      // Reset form
      setSelectedSubjectName('');
      setSelectedSubjectType('');
      setSelectedSubjectGrade('');
      setSelectedIbLevel('');
      
      // Reload data
      await loadTutorData();
    } catch (e: any) {
      alert(e.message || 'Failed to add approval');
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveApproval = async (approvalId: string) => {
    if (!confirm('Are you sure you want to remove this approval?')) return;

    try {
      setUpdating(approvalId);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';
      
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tutors/${tutorId}/approvals/${approvalId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!resp.ok) {
        const j = await resp.json().catch(()=>({}));
        throw new Error(j.error || 'Failed to remove approval');
      }

      await loadTutorData();
    } catch (e: any) {
      alert(e.message || 'Failed to remove approval');
    } finally {
      setUpdating(null);
    }
  };

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

  if (error || !tutorData?.tutor) {
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

  const { tutor, subject_approvals, available_subjects } = tutorData;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/admin/tutors/${tutor.id}`}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                ← Back to Profile
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Edit Certifications</h1>
                <p className="text-gray-600">{tutor.first_name} {tutor.last_name} • {tutor.school?.name}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current Approvals */}
          <div>
            <div className="bg-white border-2 border-gray-100 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Current Certifications</h2>
                <p className="text-sm text-gray-600">Subjects this tutor is approved to teach</p>
              </div>
              
              {subject_approvals.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No certifications yet</h3>
                  <p className="text-sm text-gray-500">Add certifications using the form on the right</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {subject_approvals.map((approval) => (
                    <div key={approval.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mr-4">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {approval.subject_name} • {approval.subject_type}
                          </div>
                          <div className="text-sm text-gray-500">Grade {approval.subject_grade}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveApproval(approval.id)}
                        disabled={updating === approval.id}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        {updating === approval.id ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Add New Certification */}
          <div>
            <div className="bg-white border-2 border-gray-100 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Certification</h2>
              <p className="text-sm text-gray-600 mb-6">Grant this tutor permission to teach a specific subject</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <select
                    value={selectedSubjectName}
                    onChange={(e) => setSelectedSubjectName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a subject</option>
                    {SUBJECT_NAMES.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={selectedSubjectType}
                    onChange={(e) => {
                      setSelectedSubjectType(e.target.value);
                      if (e.target.value !== 'IB') setSelectedIbLevel('');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a type</option>
                    {SUBJECT_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
                  <select
                    value={selectedSubjectGrade}
                    onChange={(e) => setSelectedSubjectGrade(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a grade</option>
                    {SUBJECT_GRADES.map((grade) => (
                      <option key={grade} value={grade}>Grade {grade}</option>
                    ))}
                  </select>
                </div>

                {selectedSubjectType === 'IB' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">IB Level</label>
                    <select
                      value={selectedIbLevel}
                      onChange={(e) => setSelectedIbLevel(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select IB level</option>
                      <option value="HL">Higher Level (HL)</option>
                      <option value="SL">Standard Level (SL)</option>
                    </select>
                  </div>
                )}

                <button
                  onClick={handleAddApproval}
                  disabled={updating === 'adding' || !selectedSubjectName || !selectedSubjectType || !selectedSubjectGrade}
                  className="w-full mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {updating === 'adding' ? 'Adding...' : 'Add Certification'}
                </button>
              </div>
            </div>

            {/* Available Subjects Info */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-900">Available Subjects</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>This tutor can be certified for any combination of:</p>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      <li>Math, English, or Science</li>
                      <li>Academic, ALP, or IB types</li>
                      <li>Grades 9-12</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}