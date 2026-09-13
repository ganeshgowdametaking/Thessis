import React from 'react';
import { motion } from 'framer-motion';
import { Cloud, Triangle, Mountain, Sun } from 'lucide-react';

interface ReferralCard {
  status: string;
  statusTint: string;
  role: string;
  company: string;
  logoIcon: React.ElementType;
  logoBg: string;
}

const cards: ReferralCard[] = [
  {
    status: 'Referral Applied',
    statusTint: 'bg-blue-50 text-blue-600',
    role: 'Software Engineer',
    company: 'Nimbus Tech',
    logoIcon: Cloud,
    logoBg: 'bg-indigo-600',
  },
  {
    status: 'Interview Scheduled',
    statusTint: 'bg-amber-50 text-amber-600',
    role: 'Product Designer',
    company: 'Vertex Labs',
    logoIcon: Triangle,
    logoBg: 'bg-blue-600',
  },
  {
    status: 'Referral Hired',
    statusTint: 'bg-emerald-50 text-emerald-600',
    role: 'Data Analyst',
    company: 'Alpine Corp',
    logoIcon: Mountain,
    logoBg: 'bg-emerald-600',
  },
  {
    status: 'Referral Applied',
    statusTint: 'bg-blue-50 text-blue-600',
    role: 'Marketing Lead',
    company: 'Solace Inc',
    logoIcon: Sun,
    logoBg: 'bg-amber-500',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const ReferralCards: React.FC = () => {
  return (
    <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16 lg:pb-20 -mt-48 sm:-mt-56 lg:-mt-64">
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:gap-8 sm:overflow-visible sm:pb-0 lg:grid-cols-4 lg:gap-10">
        {cards.map((card, i) => (
          <div
            key={card.role}
            className={`shrink-0 w-[82%] snap-center sm:w-auto sm:shrink sm:snap-align-none ${i === 0 || i === 3 ? 'lg:relative lg:-top-14' : ''}`}
          >
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 sm:p-5 flex flex-col gap-3 sm:gap-4 font-poppins"
            >
              <span
                className={`self-start rounded-full px-2.5 py-1 text-[11px] font-semibold ${card.statusTint}`}
              >
                {card.status}
              </span>
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white ${card.logoBg}`}
                >
                  <card.logoIcon className="h-5 w-5" strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#1C1C1C]">{card.role}</p>
                  <p className="truncate text-xs text-slate-500">{card.company}</p>
                </div>
              </div>
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReferralCards;
