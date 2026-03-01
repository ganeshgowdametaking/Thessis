import capgeminiLogo from '../assets/logo-capgemini.png';
import tcsLogo from '../assets/logo-tcs.png';
import salesforceLogo from '../assets/logo-salesforce.png';
import charlesHudsonLogo from '../assets/logo-charles-hudson.png';
import deloitteLogo from '../assets/logo-deloitte.png';
import dashboardPreview from '../assets/dashboard-preview.png';

const Services = () => {
  return (
    <section className="bg-white py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 md:mb-16">
          <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-7 md:mb-10">
            The preferred referral platform for top performers across the industry
          </h2>

          {/* Trust Logos Row */}
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-12 mb-12 md:mb-24 opacity-60 grayscale md:hover:grayscale-0 transition-all duration-700">
            <img src={capgeminiLogo} alt="Capgemini" className="h-6 md:h-10 w-auto object-contain" />
            <img src={tcsLogo} alt="TCS" className="h-7 md:h-12 w-auto object-contain" />
            <img src={salesforceLogo} alt="Salesforce" className="h-7 md:h-12 w-auto object-contain" />
            <img src={charlesHudsonLogo} alt="Charles Hudson" className="h-6 md:h-10 w-auto object-contain" />
            <img src={deloitteLogo} alt="Deloitte" className="h-6 md:h-10 w-auto object-contain" />
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3 md:mb-4">
            Better Referrals. Zero Friction
          </h2>
          <p className="text-slate-500 text-sm md:text-base max-w-xl md:max-w-2xl mx-auto">
            Connect with verified roles through our high precision referral engine
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-0 items-center">
          {/* Dashboard Preview Image - Left Side (Maximized Size) */}
          <div className="w-full lg:w-[70%] z-10">
            <div
              className="relative rounded-2xl overflow-hidden border border-slate-100 shadow-lg lg:shadow-2xl transition-transform duration-500 lg:hover:scale-[1.005] [-webkit-mask-image:none] [mask-image:none] lg:[-webkit-mask-image:linear-gradient(to_right,black_60%,transparent_100%)] lg:[mask-image:linear-gradient(to_right,black_60%,transparent_100%)]"
            >
              <img
                src={dashboardPreview}
                alt="TankTide Dashboard"
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-sage/10 to-transparent pointer-events-none"></div>
            </div>
          </div>

          {/* Feature Cards - Overlapping Right Side (Wider & Spaced) */}
          <div className="flex flex-col justify-between w-full lg:w-[50%] lg:-ml-48 relative z-20 lg:self-stretch py-0 lg:py-8 gap-3 md:gap-4 lg:gap-0">
            <div className="group bg-white/90 backdrop-blur-sm py-4 md:py-6 px-5 md:px-10 rounded-2xl shadow-sm lg:shadow-xl lg:hover:shadow-2xl transition-all border border-slate-100 flex gap-4 md:gap-8 items-start">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-1.5 md:mb-2 uppercase">CONNECT</h3>
                <p className="text-sm md:text-base text-slate-500 leading-relaxed">
                  Every referrer is authenticated via corporate email or LinkedIn
                </p>
              </div>
            </div>

            <div className="group bg-white/90 backdrop-blur-sm py-4 md:py-6 px-5 md:px-10 rounded-2xl shadow-sm lg:shadow-xl lg:hover:shadow-2xl transition-all border border-slate-100 flex gap-4 md:gap-8 items-start">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-1.5 md:mb-2 uppercase">REFER</h3>
                <p className="text-sm md:text-base text-slate-500 leading-relaxed">
                  10x higher interview rate than direct applications
                </p>
              </div>
            </div>

            <div className="group bg-white/90 backdrop-blur-sm py-4 md:py-6 px-5 md:px-10 rounded-2xl shadow-sm lg:shadow-xl lg:hover:shadow-2xl transition-all border border-slate-100 flex gap-4 md:gap-8 items-start">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-1.5 md:mb-2 uppercase">SUCCESS</h3>
                <p className="text-sm md:text-base text-slate-500 leading-relaxed">
                  Referrers earn company bonuses & Seekers land dream roles
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Services;
