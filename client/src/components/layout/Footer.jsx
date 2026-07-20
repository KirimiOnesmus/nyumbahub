const Footer = () => (
  <footer className="border-t border-slate-200 py-5">
    <div className="px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
      <p>{new Date().getFullYear()} EstateSync. All rights reserved.</p>

    </div>
  </footer>
);

export default Footer;
