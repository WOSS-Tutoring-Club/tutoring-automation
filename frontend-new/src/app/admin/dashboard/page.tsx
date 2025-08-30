// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';
import { Admin, School, Tutor } from '@/types/models';
import Image from 'next/image';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { user, session, isAdmin, signOut, userRole, isLoading: authLoading } = useAuth();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [awaitingJobs, setAwaitingJobs] = useState<any[]>([]);
  const [certificationRequests, setCertificationRequests] = useState<any[]>([]);
  const [selectedCertRequest, setSelectedCertRequest] = useState<any | null>(null);
  const [acting, setActing] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = (href: string) => { if (typeof window !== 'undefined') window.location.href = href; };
  
  useEffect(() => {
    const fetchAdminData = async () => {
      if (authLoading) return;
      
      if (!user) {
        navigate('/auth/login');
        return;
      }
      
      if (!isAdmin()) {
        navigate('/tutor/dashboard');
        return;
      }
      
      try {
        const token = session?.access_token;
        if (!token) {
          navigate('/auth/login');
          return;
        }

        // Fetch all data in parallel
        const [adminResp, schoolsResp, tutorsResp, oppResp, awResp, crResp] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/me`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/schools`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tutors`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/opportunities`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/awaiting-verification`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/certification-requests`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (adminResp.ok) {
          const adminJson = await adminResp.json();
          setAdmin(adminJson.admin as Admin);
        }

        if (schoolsResp.ok) {
          const schoolsJson = await schoolsResp.json();
          setSchools((schoolsJson.schools || []) as School[]);
        }

        if (tutorsResp.ok) {
          const tutorsJson = await tutorsResp.json();
          setTutors((tutorsJson.tutors || []) as Tutor[]);
        }

        if (oppResp.ok) {
          const oppJson = await oppResp.json();
          setOpportunities((oppJson.opportunities || []).slice(0, 5));
        }

        if (awResp.ok) {
          const awJson = await awResp.json();
          setAwaitingJobs(awJson.jobs || []);
        }

        if (crResp.ok) {
          const crJson = await crResp.json();
          setCertificationRequests(crJson.requests || []);
        }
      } catch (err) {
        console.error('Error fetching admin data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAdminData();
  }, [user, isAdmin, authLoading, session]);
  
  const handleSignOut = async () => {
    await signOut();
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-800">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Manage tutors, verify sessions, and oversee the platform</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{admin?.first_name} {admin?.last_name}</p>
              <p className="text-xs text-gray-500">{admin?.school?.name || 'System Admin'}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border-2 border-gray-100 rounded-xl p-6 hover:border-blue-200 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 mr-4">
                  <img src="/active_jobs.svg" alt="Active Jobs" className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-md font-semibold text-gray-900">Pending Verification</h3>
                  <p className="text-xs text-gray-500">Sessions awaiting review</p>
                </div>
              </div>
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFD9FE' }}>
                  <span className="text-2xl font-medium text-gray-900">{awaitingJobs.length}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-gray-100 rounded-xl p-6 hover:border-blue-200 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 mr-4">
                  <img src="/approved_subjects.svg" alt="Certification Requests" className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-md font-semibold text-gray-900">Certification Requests</h3>
                  <p className="text-xs text-gray-500">Awaiting approval</p>
                </div>
              </div>
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#C9ECFF' }}>
                  <span className="text-2xl font-medium text-gray-900">{certificationRequests.length}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-gray-100 rounded-xl p-6 hover:border-blue-200 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 mr-4">
                  <img src="/volunteer_hours.svg" alt="Total Tutors" className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-md font-semibold text-gray-900">Active Tutors</h3>
                  <p className="text-xs text-gray-500">In the system</p>
                </div>
              </div>
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#DBF9F5' }}>
                  <span className="text-2xl font-medium text-gray-900">{tutors.filter(t => t.status === 'active').length}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-gray-100 rounded-xl p-6 hover:border-blue-200 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 mr-4">
                  <img src="/open_requests.svg" alt="Open Opportunities" className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-md font-semibold text-gray-900">Open Opportunities</h3>
                  <p className="text-xs text-gray-500">Awaiting tutors</p>
                </div>
              </div>
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFE4B5' }}>
                  <span className="text-2xl font-medium text-gray-900">{opportunities.filter(o => o.status === 'open').length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="#pending-verification"
              className="flex items-center p-6 bg-white border-2 border-blue-100 rounded-xl hover:border-blue-200 hover:bg-blue-50 transition-colors group"
            >
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4 text-left">
                <h4 className="text-lg font-medium text-gray-900 group-hover:text-blue-900">Verify Sessions</h4>
                <p className="text-sm text-gray-500 group-hover:text-blue-700">Review completed tutoring sessions</p>
              </div>
            </Link>

            <Link
              href="#certification-requests"
              className="flex items-center p-6 bg-white border-2 border-blue-100 rounded-xl hover:border-blue-200 hover:bg-blue-50 transition-colors group"
            >
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4 text-left">
                <h4 className="text-lg font-medium text-gray-900 group-hover:text-blue-900">Review Certifications</h4>
                <p className="text-sm text-gray-500 group-hover:text-blue-700">Approve tutor subject requests</p>
              </div>
            </Link>

            <Link
              href="#tutors"
              className="flex items-center p-6 bg-white border-2 border-blue-100 rounded-xl hover:border-blue-200 hover:bg-blue-50 transition-colors group"
            >
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4 text-left">
                <h4 className="text-lg font-medium text-gray-900 group-hover:text-blue-900">Manage Tutors</h4>
                <p className="text-sm text-gray-500 group-hover:text-blue-700">View and edit tutor profiles</p>
              </div>
            </Link>

            <Link
              href="/admin/tutorial"
              className="flex items-center p-6 bg-white border-2 border-blue-100 rounded-xl hover:border-blue-200 hover:bg-blue-50 transition-colors group"
            >
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0l-2-2m2 2l2-2m-7 8h10a2 2 0 002-2V8a2 2 0 00-2-2H7a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4 text-left">
                <h4 className="text-lg font-medium text-gray-900 group-hover:text-blue-900">View Tutorial</h4>
                <p className="text-sm text-gray-500 group-hover:text-blue-700">Learn how to use the admin panel</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Pending Verification Section */}
        <div id="pending-verification" className="mb-8">
          <div className="bg-white border-2 border-gray-100 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Jobs Pending Verification</h2>
              <p className="text-sm text-gray-600">Verify completed sessions and award volunteer hours</p>
            </div>
            <div className="divide-y divide-gray-100">
              {awaitingJobs.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No jobs awaiting verification</h3>
                  <p className="text-sm text-gray-500">All completed sessions have been verified</p>
                </div>
              ) : (
                awaitingJobs.map((job: any) => (
                  <AwaitingJobRow key={job.id} job={job} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Certification Requests */}
        <div id="certification-requests" className="mb-8">
          <div className="bg-white border-2 border-gray-100 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Certification Requests</h2>
              <p className="text-sm text-gray-600">Tutor certification requests for your school</p>
            </div>
            <div className="divide-y divide-gray-100">
              {certificationRequests.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No certification requests</h3>
                  <p className="text-sm text-gray-500">All tutor requests have been processed</p>
                </div>
              ) : (
                certificationRequests.map((req: any) => (
                  <div key={req.id} className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => { setSelectedCertRequest(req); setActionError(null); }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {req.tutor_name || 'Tutor'} — {req.subject_name} • {req.subject_type} • Grade {req.subject_grade}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Requested {req.created_at ? new Date(req.created_at).toLocaleString() : ''}
                          {req.tutor_mark ? ` • Mark: ${req.tutor_mark}` : ''}
                        </div>
                      </div>
                      <div className="text-xs text-blue-600 font-medium">Click to review</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Opportunities */}
        <div className="mb-8">
          <div className="bg-white border-2 border-gray-100 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {admin?.school?.name ? `Recent Tutoring Opportunities at ${admin.school.name}` : 'Recent Tutoring Opportunities'}
              </h2>
              <p className="text-sm text-gray-600">Latest tutoring requests</p>
            </div>
            <div className="divide-y divide-gray-100">
              {opportunities.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0l-2-2m2 2l2-2m-7 8h10a2 2 0 002-2V8a2 2 0 00-2-2H7a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No tutoring opportunities</h3>
                  <p className="text-sm text-gray-500">No recent requests found</p>
                </div>
              ) : (
                opportunities.map((opportunity: any) => {
                  const tFirst = opportunity?.tutee?.first_name ?? opportunity?.tutee_first_name ?? '';
                  const tLast = opportunity?.tutee?.last_name ?? opportunity?.tutee_last_name ?? '';
                  const subj = opportunity?.subject_name ? `${opportunity.subject_name} • ${opportunity.subject_type} • Grade ${opportunity.subject_grade}` : (opportunity?.subject ?? '');
                  const firstInitial = tFirst && typeof tFirst === 'string' ? tFirst.charAt(0) : '?';
                  const lastInitial = tLast && typeof tLast === 'string' ? tLast.charAt(0) : '';
                  return (
                    <div key={opportunity.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {firstInitial}{lastInitial}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {tFirst} {tLast}
                            </div>
                            <div className="text-sm text-gray-500">
                              {subj}{opportunity.grade_level ? ` - Grade ${opportunity.grade_level}` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            opportunity.status === 'open' 
                              ? 'bg-green-100 text-green-800'
                              : opportunity.status === 'assigned'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {opportunity.status}
                          </span>
                          <div className="text-sm text-gray-500">
                            {new Date(opportunity.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Tutors Section */}
        <div id="tutors">
          <div className="bg-white border-2 border-gray-100 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Tutors</h2>
              <p className="text-sm text-gray-600">All tutors in the system</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {tutors.map((tutor) => (
                    <tr key={tutor.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {tutor.first_name} {tutor.last_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tutor.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tutor.school?.name || 'Not assigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          tutor.status === 'active' ? 'bg-green-100 text-green-800' :
                          tutor.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {tutor.status === 'active' ? 'Active' :
                           tutor.status === 'pending' ? 'Pending' :
                           'Suspended'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tutor.volunteer_hours || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/admin/tutors/${tutor.id}`} className="text-blue-600 hover:text-blue-900 mr-4">
                          View history
                        </Link>
                        <Link href={`/admin/tutors/${tutor.id}/edit`} className="text-blue-600 hover:text-blue-900">
                          Edit certifications
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {tutors.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 mb-1">No tutors found</h3>
                        <p className="text-sm text-gray-500">No tutors are currently registered</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Certification Request Modal */}
      {selectedCertRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedCertRequest(null)}></div>
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Review Certification Request</h3>
            {actionError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{actionError}</div>}
            <div className="text-sm text-gray-800 space-y-3 mb-6">
              <div><span className="font-medium">Tutor:</span> {selectedCertRequest.tutor_name || selectedCertRequest.tutor_id}</div>
              <div><span className="font-medium">Subject:</span> {selectedCertRequest.subject_name} • {selectedCertRequest.subject_type} • Grade {selectedCertRequest.subject_grade}</div>
              {selectedCertRequest.tutor_mark && (
                <div><span className="font-medium">Tutor Mark:</span> {selectedCertRequest.tutor_mark}</div>
              )}
              {selectedCertRequest.created_at && (
                <div className="text-xs text-gray-500">Requested {new Date(selectedCertRequest.created_at).toLocaleString()}</div>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                onClick={() => setSelectedCertRequest(null)}
                disabled={acting}
              >
                Close
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={acting}
                onClick={async () => {
                  try {
                    setActing(true);
                    setActionError(null);
                    const { supabase } = await import('@/services/supabase');
                    const { data: { session } } = await supabase.auth.getSession();
                    const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/certification-requests/${selectedCertRequest.id}`, {
                      method: 'DELETE',
                      headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }
                    });
                    if (!resp.ok) {
                      const j = await resp.json().catch(()=>({}));
                      throw new Error(j.error || 'Failed to delete request');
                    }
                    setCertificationRequests(prev => prev.filter(r => r.id !== selectedCertRequest.id));
                    setSelectedCertRequest(null);
                  } catch (e: any) {
                    setActionError(e?.message || 'Failed to reject request');
                  } finally {
                    setActing(false);
                  }
                }}
              >
                Reject
              </button>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                disabled={acting}
                onClick={async () => {
                  try {
                    setActing(true);
                    setActionError(null);
                    const { supabase } = await import('@/services/supabase');
                    const { data: { session } } = await supabase.auth.getSession();
                    const approveResp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/certification-requests/${selectedCertRequest.id}/approve`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }
                    });
                    if (!approveResp.ok) {
                      const j = await approveResp.json().catch(()=>({}));
                      throw new Error(j.error || 'Failed to approve request');
                    }
                    setCertificationRequests(prev => prev.filter(r => r.id !== selectedCertRequest.id));
                    setSelectedCertRequest(null);
                  } catch (e: any) {
                    setActionError(e?.message || 'Failed to certify request');
                  } finally {
                    setActing(false);
                  }
                }}
              >
                Certify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AwaitingJobRow({ job }: { job: any }) {
  const [expanded, setExpanded] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [awarding, setAwarding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { supabase } = await import('@/services/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/awaiting-verification/${job.id}/recording`, {
          headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }
        });
        if (resp.ok) {
          const j = await resp.json();
          setRecordingUrl(j.recording_url || null);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [job.id]);

  const handleVerify = async () => {
    try {
      setAwarding(true);
      const hoursStr = prompt('Enter volunteer hours to award to the tutor:');
      if (hoursStr == null) return;
      const hours = Number(hoursStr);
      if (Number.isNaN(hours) || hours < 0) { setError('Invalid hours'); return; }
      const { supabase } = await import('@/services/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/awaiting-verification/${job.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ awarded_hours: hours })
      });
      if (!resp.ok) {
        const j = await resp.json().catch(()=>({}));
        throw new Error(j.error || 'Failed to verify job');
      }
      window.location.reload();
    } catch (e: any) {
      setError(e?.message || 'Failed to verify job');
    } finally {
      setAwarding(false);
    }
  };

  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-gray-900">
            {job.subject_name} • {job.subject_type} • Grade {job.subject_grade}
          </div>
          <div className="text-xs text-gray-500 mt-1">Scheduled: {job.scheduled_time ? new Date(job.scheduled_time).toLocaleString() : 'N/A'}</div>
        </div>
        <button 
          className="text-blue-600 hover:text-blue-800 font-medium text-sm" 
          onClick={()=> setExpanded(v=>!v)}
        >
          {expanded ? 'Hide details' : 'View details'}
        </button>
      </div>
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}
          <div className="text-sm text-gray-700 space-y-2 mb-4">
            <div><span className="font-medium">Recording:</span> {recordingUrl ? <a href={recordingUrl} target="_blank" className="text-blue-600 underline hover:text-blue-800">View recording link</a> : 'No link found'}</div>
            <div><span className="font-medium">Tutor ID:</span> {job.tutor_id}</div>
            <div><span className="font-medium">Tutee ID:</span> {job.tutee_id}</div>
          </div>
          <button 
            disabled={awarding} 
            onClick={handleVerify} 
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
          >
            {awarding ? 'Verifying...' : 'Verify Session'}
          </button>
        </div>
      )}
    </div>
  );
}