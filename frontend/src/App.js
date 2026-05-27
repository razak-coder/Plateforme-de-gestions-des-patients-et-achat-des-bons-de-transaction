import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

// Auth
import Login              from './pages/auth/Login';
import Register           from './pages/auth/Register';
import ChangerMotDePasse  from './pages/auth/ChangerMotDePasse';

// Public
import Home       from './pages/public/Home';

// Patient
import PatientDashboard from './pages/patient/Dashboard';
import AchatBon         from './pages/patient/AchatBon';
import Historique       from './pages/patient/Historique';

// Admin
import AdminDashboard   from './pages/admin/Dashboard';
import GestionBons      from './pages/admin/GestionBons';
import GestionUsers     from './pages/admin/GestionUsers';
import GestionTypesBons from './pages/admin/GestionTypesBons';
import QrScanner        from './pages/admin/QrScanner';
import Rapports         from './pages/admin/Rapports';
import Parametres       from './pages/admin/Parametres';
import GestionParcoursSoins from './pages/admin/GestionParcoursSoins';
import GestionMedecins      from './pages/admin/GestionMedecins';
import MonDossierMedical    from './pages/patient/MonDossierMedical';
import Reception            from './pages/admin/Reception';
import SalleAttente         from './pages/admin/SalleAttente';
import MedecinDashboard     from './pages/medecin/Dashboard';
import MesConsultations     from './pages/medecin/MesConsultations';
import PrendreRendezVous    from './pages/patient/PrendreRendezVous';

// Styles
import './styles/global.css';

import { useAuth } from './context/AuthContext';

/** Bloque la navigation si l'utilisateur doit changer son mot de passe */
const MdpGate = ({ children }) => {
  const { doitChangerMdp, confirmerChangementMdp } = useAuth();
  if (doitChangerMdp) {
    return <ChangerMotDePasse onSuccess={confirmerChangementMdp} />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { fontSize: '13px' },
            success: {
              style: {
                background: '#eafaf1',
                color: '#1A7A4A',
                border: '1px solid #1A7A4A',
              },
            },
            error: {
              style: {
                background: '#fdecea',
                color: '#C0392B',
                border: '1px solid #C0392B',
              },
            },
          }}
        />

        <MdpGate>
        <Routes>

          {/* Route d'accueil */}
          <Route path="/" element={<Home />} />

          {/* Pages publiques */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Pages Patient */}
          <Route path="/patient/dashboard" element={
            <PrivateRoute role="patient">
              <PatientDashboard />
            </PrivateRoute>
          }/>
          <Route path="/patient/mon-dossier" element={
            <PrivateRoute role="patient">
              <MonDossierMedical />
            </PrivateRoute>
          }/>
          <Route path="/patient/acheter" element={
            <PrivateRoute role="patient">
              <AchatBon />
            </PrivateRoute>
          }/>
          <Route path="/patient/historique" element={
            <PrivateRoute role="patient">
              <Historique />
            </PrivateRoute>
          }/>
          <Route path="/patient/rendez-vous" element={
            <PrivateRoute role="patient">
              <PrendreRendezVous />
            </PrivateRoute>
          }/>

          {/* Pages Admin */}
          <Route path="/admin/dashboard" element={
            <PrivateRoute role="admin">
              <AdminDashboard />
            </PrivateRoute>
          }/>
          <Route path="/admin/bons" element={
            <PrivateRoute role="admin">
              <GestionBons />
            </PrivateRoute>
          }/>
          <Route path="/admin/utilisateurs" element={
            <PrivateRoute role="admin">
              <GestionUsers />
            </PrivateRoute>
          }/>
          <Route path="/admin/type-bons" element={
            <PrivateRoute role="admin">
              <GestionTypesBons />
            </PrivateRoute>
          }/>
          <Route path="/admin/scanner" element={
            <PrivateRoute role="admin">
              <QrScanner />
            </PrivateRoute>
          }/>
          <Route path="/admin/qr-scanner" element={
            <PrivateRoute role="admin">
              <QrScanner />
            </PrivateRoute>
          }/>

          <Route path="/admin/rapports" element={
            <PrivateRoute role="admin">
              <Rapports />
            </PrivateRoute>
          }/>
          <Route path="/admin/parametres" element={
            <PrivateRoute role="admin">
              <Parametres />
            </PrivateRoute>
          }/>
          <Route path="/admin/parcours-soins" element={
            <PrivateRoute role="admin">
              <GestionParcoursSoins />
            </PrivateRoute>
          }/>
          <Route path="/admin/medecins" element={
            <PrivateRoute role="admin">
              <GestionMedecins />
            </PrivateRoute>
          }/>
          <Route path="/admin/reception" element={
            <PrivateRoute role="admin">
              <Reception />
            </PrivateRoute>
          }/>
          <Route path="/admin/salle-attente" element={
            <PrivateRoute role="admin">
              <SalleAttente />
            </PrivateRoute>
          }/>

          {/* Espace praticien */}
          <Route path="/medecin/dashboard" element={
            <PrivateRoute role="medecin">
              <MedecinDashboard />
            </PrivateRoute>
          }/>
          <Route path="/medecin/salle-attente" element={
            <PrivateRoute role="medecin">
              <SalleAttente />
            </PrivateRoute>
          }/>
          <Route path="/medecin/consultations" element={
            <PrivateRoute role="medecin">
              <MesConsultations />
            </PrivateRoute>
          }/>

          {/* Route inconnue */}
          <Route path="*" element={<Navigate to="/login" />} />

        </Routes>
        </MdpGate>

      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;