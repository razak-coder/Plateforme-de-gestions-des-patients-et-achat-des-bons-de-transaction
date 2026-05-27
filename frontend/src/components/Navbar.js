import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, ShoppingCart, History, Users, FileText,
  Settings, LogOut, ClipboardList, CreditCard, QrCode,
  HeartPulse, Stethoscope, FileHeart, DoorOpen, Clock,
} from 'lucide-react';

const NavSection = ({ label }) => (
  <div style={{
    padding:'8px 16px 4px',
    fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.4)',
    textTransform:'uppercase', letterSpacing:'0.08em', marginTop:4,
  }}>{label}</div>
);

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Déconnexion réussie');
    navigate('/');
  };

  const initiales = user
    ? `${user.nom?.charAt(0)}${user.prenom?.charAt(0)}`.toUpperCase()
    : 'U';

  const navPatient = [
    { to:'/patient/dashboard',   icon:<LayoutDashboard size={17}/>, label:'Tableau de bord' },
    { to:'/patient/mon-dossier', icon:<FileHeart size={17}/>,       label:'Mon dossier médical' },
    { to:'/patient/acheter',     icon:<ShoppingCart size={17}/>,    label:'Acheter un bon' },
    { to:'/patient/historique',  icon:<History size={17}/>,         label:'Historique' },
  ];

  const navMedecin = [
    { to:'/medecin/dashboard',     icon:<LayoutDashboard size={17}/>, label:'Mon agenda' },
    { to:'/medecin/salle-attente', icon:<Clock size={17}/>,          label:'Salle d\'attente' },
    { to:'/medecin/consultations', icon:<HeartPulse size={17}/>,     label:'Consultations' },
  ];

  // Admin : navigation structurée par sections
  const navAdminSections = [
    {
      label: null, // pas de section label pour le dashboard
      liens: [
        { to:'/admin/dashboard', icon:<LayoutDashboard size={17}/>, label:'Accueil clinique' },
      ],
    },
    {
      label: 'Flux patients',
      liens: [
        { to:'/admin/reception',     icon:<DoorOpen size={17}/>,   label:'Réception' },
        { to:'/admin/salle-attente', icon:<Clock size={17}/>,      label:'Salle d\'attente' },
        { to:'/admin/parcours-soins',icon:<HeartPulse size={17}/>, label:'Parcours de soins' },
      ],
    },
    {
      label: 'Gestion',
      liens: [
        { to:'/admin/utilisateurs', icon:<Users size={17}/>,      label:'Comptes' },
        { to:'/admin/medecins',     icon:<Stethoscope size={17}/>,label:'Médecins' },
      ],
    },
    {
      label: 'Financier',
      liens: [
        { to:'/admin/bons',      icon:<ClipboardList size={17}/>, label:'Bons de consultation' },
        { to:'/admin/type-bons', icon:<CreditCard size={17}/>,    label:'Types de bons' },
        { to:'/admin/scanner',   icon:<QrCode size={17}/>,        label:'Scanner QR' },
      ],
    },
    {
      label: 'Pilotage',
      liens: [
        { to:'/admin/rapports',   icon:<FileText size={17}/>,  label:'Rapports' },
        { to:'/admin/parametres', icon:<Settings size={17}/>,  label:'Paramètres' },
      ],
    },
  ];

  return (
    <div className="sidebar">

      {/* Logo */}
      <div className="sidebar-logo">
        <h2>🏥 CTM-Consult</h2>
        <p>Gestion médicale</p>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" style={{ flex:1, overflowY:'auto' }}>
        {user?.role === 'admin' ? (
          navAdminSections.map((section, si) => (
            <React.Fragment key={si}>
              {section.label && <NavSection label={section.label} />}
              {section.liens.map(lien => (
                <NavLink key={lien.to} to={lien.to}
                  className={({ isActive }) => isActive ? 'active' : ''}>
                  {lien.icon}
                  {lien.label}
                </NavLink>
              ))}
            </React.Fragment>
          ))
        ) : user?.role === 'medecin' ? (
          navMedecin.map(lien => (
            <NavLink key={lien.to} to={lien.to}
              className={({ isActive }) => isActive ? 'active' : ''}>
              {lien.icon}
              {lien.label}
            </NavLink>
          ))
        ) : (
          navPatient.map(lien => (
            <NavLink key={lien.to} to={lien.to}
              className={({ isActive }) => isActive ? 'active' : ''}>
              {lien.icon}
              {lien.label}
            </NavLink>
          ))
        )}
      </nav>

      {/* Footer utilisateur */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initiales}</div>
          <div className="sidebar-user-info">
            <p>{user?.prenom} {user?.nom}</p>
            <p style={{ textTransform:'capitalize' }}>
              {user?.role === 'admin' ? '🔑 Administrateur'
                : user?.role === 'medecin' ? '🩺 Praticien'
                : '👤 Patient'}
            </p>
          </div>
        </div>
        <button className="btn btn-danger btn-sm" style={{ width:'100%' }} onClick={handleLogout}>
          <LogOut size={14}/> Déconnexion
        </button>
      </div>

    </div>
  );
};

export default Navbar;