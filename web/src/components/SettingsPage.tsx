import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';

const SettingsPage: React.FC = () => {
  const { signOut } = useAuthContext();
  const navigate = useNavigate();
  const [organizationEmail, setOrganizationEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-stone flex flex-col">
      <main className="flex-grow py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sticky top-24">
              <h1 className="text-2xl font-bold text-slate-900 mb-6">Settings</h1>
              <nav className="space-y-1">
                <a className="group flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg bg-stone-off text-slate-900 border border-transparent shadow-sm" href="#">
                  <span className="material-symbols-outlined text-sage group-hover:text-sage-dark transition-colors">person</span>
                  Account
                </a>
                <div className="pt-4 mt-4 border-t border-slate-100"></div>
                <button onClick={handleLogout} className="w-full group flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                  <span className="material-symbols-outlined text-red-500 group-hover:text-red-600">logout</span>
                  Logout
                </button>
              </nav>
            </div>
          </aside>

          <div className="lg:col-span-3 space-y-6">
            <details className="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden" open>
              <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-stone-off/50 transition-colors select-none">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-500">
                    <span className="material-symbols-outlined">mark_email_read</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Email Verification</h3>
                    <p className="text-sm text-slate-500">Manage your organization email address</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-500 group-open:rotate-90 transition-transform duration-200">chevron_right</span>
              </summary>
              <div className="px-6 pb-6 pt-2 border-t border-slate-100">
                <div className="max-w-xl space-y-6 pt-4">
                  <div className="rounded-lg bg-sage-light border border-sage/20 p-4 flex items-start gap-3">
                    <span className="material-symbols-outlined text-sage mt-0.5">verified</span>
                    <div>
                      <h4 className="text-sm font-semibold text-sage-dark">Verified Organization</h4>
                      <p className="text-sm text-sage-dark mt-1">Your email <span className="font-medium">jane.doe@techflow.com</span> is verified and active.</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-slate-700">Organization Email <span className="text-red-500">*</span></label>
                    <div className="flex gap-3">
                      <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="material-symbols-outlined text-slate-500 text-[20px]">mail</span>
                        </div>
                        <input className="block w-full rounded-lg border-stone-border bg-white pl-10 py-2.5 text-slate-900 placeholder:text-slate-500 focus:ring-sage focus:border-sage sm:text-sm" placeholder="name@company.com" type="email" value={organizationEmail} onChange={(e) => setOrganizationEmail(e.target.value)} />
                      </div>
                      <button className="bg-sage text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-sage-dark transition-colors whitespace-nowrap shadow-sm">Send Code</button>
                    </div>
                  </div>
                </div>
              </div>
            </details>

            <details className="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-stone-off/50 transition-colors select-none">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-500">
                    <span className="material-symbols-outlined">lock_reset</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Change Password</h3>
                    <p className="text-sm text-slate-500">Update your account security credentials</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-500 group-open:rotate-90 transition-transform duration-200">chevron_right</span>
              </summary>
              <div className="px-6 pb-6 pt-2 border-t border-slate-100">
                <div className="max-w-md space-y-5 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                    <input className="block w-full rounded-lg border-stone-border bg-white py-2.5 text-slate-900 focus:ring-sage focus:border-sage sm:text-sm" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                    <div className="flex justify-end mt-1">
                      <a className="text-xs font-medium text-sage hover:text-sage-dark" href="#">Forgot Password?</a>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                      <input className="block w-full rounded-lg border-stone-border bg-white py-2.5 text-slate-900 focus:ring-sage focus:border-sage sm:text-sm" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                      <input className="block w-full rounded-lg border-stone-border bg-white py-2.5 text-slate-900 focus:ring-sage focus:border-sage sm:text-sm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    </div>
                  </div>
                  <div className="pt-2">
                    <button className="bg-sage text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-sage-dark transition-colors shadow-sm shadow-sage/30">Update Password</button>
                  </div>
                </div>
              </div>
            </details>

            <details className="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-stone-off/50 transition-colors select-none">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-500">
                    <span className="material-symbols-outlined">admin_panel_settings</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Admin Invite</h3>
                    <p className="text-sm text-slate-500">Add administrators to your organization</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-500 group-open:rotate-90 transition-transform duration-200">chevron_right</span>
              </summary>
              <div className="px-6 pb-6 pt-2 border-t border-slate-100">
                <div className="max-w-2xl pt-4">
                  <div className="bg-stone-off rounded-xl p-6 border border-slate-100">
                    <h4 className="text-base font-semibold text-slate-900 mb-2">Invite Administrator</h4>
                    <p className="text-sm text-slate-500 mb-6 leading-relaxed">Admins have full access to your organization's settings, billing, and user management. Only invite trusted team members.</p>
                    <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors shadow-sm">
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      Invite New Admin
                    </button>
                  </div>
                </div>
              </div>
            </details>

            <details className="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-stone-off/50 transition-colors select-none">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-500">
                    <span className="material-symbols-outlined">security</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Privacy Settings</h3>
                    <p className="text-sm text-slate-500">Manage data retention and account deletion</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-500 group-open:rotate-90 transition-transform duration-200">chevron_right</span>
              </summary>
              <div className="px-6 pb-6 pt-2 border-t border-slate-100">
                <div className="max-w-2xl pt-4">
                  <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <span className="material-symbols-outlined text-red-600">delete_forever</span>
                      </div>
                      <div className="flex-grow">
                        <h3 className="text-base font-bold text-red-800">Delete Account</h3>
                        <p className="text-sm text-red-600 mt-1 mb-4">This action is permanent and cannot be undone. All your data will be wiped from our servers immediately.</p>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-red-800 uppercase tracking-wide mb-2">Reason for leaving (Optional)</label>
                            <textarea className="block w-full rounded-lg border-red-200 bg-white text-slate-900 placeholder:text-slate-500 focus:ring-red-500 focus:border-red-500 sm:text-sm" placeholder="Please tell us why you are deleting your account..." rows={2} value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} />
                          </div>
                          <button className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm border border-red-700">Confirm Deletion</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>
      </main>

      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Invite Administrator</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="admin@company.com" className="block w-full rounded-lg border-stone-border bg-white py-2.5 px-3 text-slate-900 placeholder:text-slate-500 focus:ring-sage focus:border-sage sm:text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button className="flex-1 bg-sage text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-sage-dark transition-colors">Send Invitation</button>
                <button onClick={() => { setShowInviteModal(false); setInviteEmail(''); }} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
