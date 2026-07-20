
const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center py-16 gap-3 text-center px-6">
    <div className="w-14 h-14 rounded-full bg-canvas border border-slate-200 flex items-center justify-center">
      {Icon && <Icon className="text-2xl text-slate-400" />}
    </div>
    <p className="font-semibold text-slate-700">{title}</p>
    {description && <p className="text-sm text-slate-500 max-w-xs">{description}</p>}
    {action}
  </div>
);

export default EmptyState;
