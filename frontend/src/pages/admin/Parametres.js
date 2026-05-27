import React, { useState } from 'react';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import toast from 'react-hot-toast';
import { Settings, Lock, User, Save } from 'lucide-react';

const Parametres = () => {
  const { user } = useAuth();
  const [formProfil, setFormProfil] = useState({
    nom: user?.nom || '', prenom: user?.prenom || '',
    email: user?.email || '', telephone: user?.telephone || '',
  });
  const [formMdp, setFormMdp] = useState({
    ancien_mot_de_passe: '', nouveau_mot_de_passe: '', confirmation: ''
  });
  const [loadingProfil, setLoadingProfil] = useState(false);
  const [loadingMdp, setLoadingMdp]       = useState(false);

  const sauvegarderProfil = async (e) => {
    e.preventDefault();
    setLoadingProfil(true);
    try {
      await API.put('/auth/profil', formProfil);
      toast.success('Profil mis à jour avec succès.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la mise à jour.');
    } finally {
      setLoadingProfil(false);
    }
  };

  const changerMotDePasse = async (e) => {
    e.preventDefault();
    const motDePasseFort = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (formMdp.nouveau_mot_de_passe !== formMdp.confirmation) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }
    if (!motDePasseFort.test(formMdp.nouveau_mot_de_passe)) {
      toast.error('Le nouveau mot de passe doit contenir 8 caracteres, une majuscule, une minuscule et un chiffre.');
      return;
    }
    if (formMdp.ancien_mot_de_passe === formMdp.nouveau_mot_de_passe) {
      toast.error('Le nouveau mot de passe doit etre different de l ancien.');
      return;
    }
    setLoadingMdp(true);
    try {
      await API.put('/auth/mot-de-passe', {
        ancien_mot_de_passe: formMdp.ancien_mot_de_passe,
        nouveau_mot_de_passe: formMdp.nouveau_mot_de_passe,
        confirmation_mot_de_passe: formMdp.confirmation,
      });
      toast.success('Mot de passe modifié avec succès.');
      setFormMdp({ ancien_mot_de_passe:'', nouveau_mot_de_passe:'', confirmation:'' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors du changement.');
    } finally {
      setLoadingMdp(false);
    }
  };

  return (
    <div className="layout">
      <Navbar />
      <div className="main-content">

        <div className="page-title">
          <h1><Settings size={22}/> Paramètres</h1>
          <p>Gérez votre profil et vos préférences</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>

          {/* Profil */}
          <div className="card">
            <div className="card-header">
              <h2><User size={18}/> Modifier le profil</h2>
            </div>
            <form onSubmit={sauvegarderProfil}>
              <div className="form-group">
                <label>Nom</label>
                <input type="text" value={formProfil.nom}
                  onChange={e => setFormProfil({...formProfil, nom: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Prénom</label>
                <input type="text" value={formProfil.prenom}
                  onChange={e => setFormProfil({...formProfil, prenom: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={formProfil.email}
                  onChange={e => setFormProfil({...formProfil, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Téléphone</label>
                <input type="tel" value={formProfil.telephone}
                  onChange={e => setFormProfil({...formProfil, telephone: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loadingProfil}>
                <Save size={16}/> {loadingProfil ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </form>
          </div>

          {/* Mot de passe */}
          <div className="card">
            <div className="card-header">
              <h2><Lock size={18}/> Changer le mot de passe</h2>
            </div>
            <form onSubmit={changerMotDePasse}>
              <div className="form-group">
                <label>Ancien mot de passe</label>
                <input type="password" value={formMdp.ancien_mot_de_passe}
                  onChange={e => setFormMdp({...formMdp, ancien_mot_de_passe: e.target.value})}
                  placeholder="••••••••" required />
              </div>
              <div className="form-group">
                <label>Nouveau mot de passe</label>
                <input type="password" value={formMdp.nouveau_mot_de_passe}
                  onChange={e => setFormMdp({...formMdp, nouveau_mot_de_passe: e.target.value})}
                  placeholder="••••••••" required />
              </div>
              <div className="form-group">
                <label>Confirmer le nouveau mot de passe</label>
                <input type="password" value={formMdp.confirmation}
                  onChange={e => setFormMdp({...formMdp, confirmation: e.target.value})}
                  placeholder="••••••••" required />
              </div>
              <p style={{ fontSize:12, color:'#888', marginTop:-2 }}>
                8+ caractères, au moins 1 majuscule, 1 minuscule et 1 chiffre.
              </p>
              <button type="submit" className="btn btn-warning" disabled={loadingMdp}>
                <Lock size={16}/> {loadingMdp ? 'Modification...' : 'Changer le mot de passe'}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};
export default Parametres;

