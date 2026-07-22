import NyumbaHub from "../../assets/NyumbaHub.png"
const Footer = () => (
  <footer className="border-t border-slate-200 py-5">
    <div className="px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
      <div className="flex items-center gap-2"> 
        <img src={NyumbaHub} alt="Nyumba Hub Logo" className="w-14"  />
              <p>{new Date().getFullYear()} NyumbaHub. All rights reserved.</p>
        </div>


    </div>
  </footer>
);

export default Footer;
