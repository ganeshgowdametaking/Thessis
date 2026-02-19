
const Services = () => {
  return (
    <section className="bg-white py-20 border-t border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Better Referrals. Zero Friction
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Connect with verified roles through our high precision referral engine
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="group bg-stone p-8 rounded-2xl hover:shadow-lg transition-all border border-transparent hover:border-slate-100">
            <div className="h-12 w-12 bg-sage/10 rounded-lg flex items-center justify-center text-sage mb-6 group-hover:bg-sage group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-2xl">verified_user</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Verified Employees</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Every referrer is authenticated via corporate email or LinkedIn
            </p>
          </div>
          <div className="group bg-stone p-8 rounded-2xl hover:shadow-lg transition-all border border-transparent hover:border-slate-100">
            <div className="h-12 w-12 bg-sage/10 rounded-lg flex items-center justify-center text-sage mb-6 group-hover:bg-sage group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-2xl">rocket_launch</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Priority Queues</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              10x higher interview rate than direct applications
            </p>
          </div>
          <div className="group bg-stone p-8 rounded-2xl hover:shadow-lg transition-all border border-transparent hover:border-slate-100">
            <div className="h-12 w-12 bg-sage/10 rounded-lg flex items-center justify-center text-sage mb-6 group-hover:bg-sage group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-2xl">paid</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Success Bonuses</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Referrers earn company bonuses & Seekers land dream roles
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Services;