
const Card = ({ children, className = '', elevated = false, as: As = 'div', ...rest }) => {
  const base = 'bg-white rounded-2xl';
  const surface = elevated ? 'shadow-md' : 'border border-slate-200';
  return (
    <As className={`${base} ${surface} ${className}`} {...rest}>
      {children}
    </As>
  );
};

export default Card;
