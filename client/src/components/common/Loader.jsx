
const Loader = ({ label = 'Loading…', className = '' }) => (
  <div className={`flex flex-col items-center justify-center gap-3 py-16 ${className}`}>
    <div className="w-10 h-10 border-4 border-slate-200 border-t-brand-700 rounded-full animate-spin" />
    <p className="text-sm text-slate-500">{label}</p>
  </div>
);

export default Loader;
