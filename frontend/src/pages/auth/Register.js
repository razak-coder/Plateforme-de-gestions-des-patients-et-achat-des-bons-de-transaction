import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/auth.css';

const Register = () => {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [form, setForm] = useState({
    nom:           '',
    prenom:        '',
    email:         '',
    telephone:     '',
    password:  '',
    password_confirmation:  '',
  });
  const [erreur, setErreur]         = useState('');
  const [chargement, setChargement] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (erreur) setErreur('');
  };

  const regles = [
    { label: '8 caractères minimum', ok: form.password.length >= 8 },
    { label: '1 minuscule', ok: /[a-z]/.test(form.password) },
    { label: '1 majuscule', ok: /[A-Z]/.test(form.password) },
    { label: '1 chiffre', ok: /\d/.test(form.password) },
    { label: 'confirmation identique', ok: !!form.password && form.password === form.password_confirmation },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setErreur('Veuillez fournir un email valide.');
      return;
    }
    if (!/^[+\d\s()-]{8,20}$/.test(form.telephone.trim())) {
      setErreur('Le numéro de téléphone est invalide.');
      return;
    }

  
    if (regles.some((r) => !r.ok)) {
      setErreur('Le mot de passe doit respecter toutes les règles de sécurité.');
      return;
    }

    setChargement(true);
    try {
      await register(form);
      navigate('/patient/dashboard');
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors de l'inscription.");
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">

        <div className="auth-header">
          <h1>Créer un compte patient</h1>
          <p>Inscrivez-vous pour gérer vos dossiers, rendez-vous et bons</p>
        </div>

        {erreur && (
          <div className="alert alert-error">{erreur}</div>
        )}

        <form onSubmit={handleSubmit}>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div className="form-group">
              <label>Nom</label>
              <input
                type="text"
                name="nom"
                value={form.nom}
                onChange={handleChange}
                placeholder="Votre nom"
                required
              />
            </div>
            <div className="form-group">
              <label>Prénom</label>
              <input
                type="text"
                name="prenom"
                value={form.prenom}
                onChange={handleChange}
                placeholder="Votre prénom"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="votre@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Téléphone (Mobile Money)</label>
            <input
              type="tel"
              name="telephone"
              value={form.telephone}
              onChange={handleChange}
              placeholder="+228 XX XX XX XX"
              required
            />
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <div className="auth-password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Minimum 8 caractères"
                required
              />
              <button
                type="button"
                className="auth-visibility-btn"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Confirmer le mot de passe</label>
            <div className="auth-password-wrap">
              <input
                type={showConfirmation ? 'text' : 'password'}
                name="password_confirmation"
                value={form.password_confirmation}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="auth-visibility-btn"
                onClick={() => setShowConfirmation((s) => !s)}
                aria-label={showConfirmation ? 'Masquer la confirmation' : 'Afficher la confirmation'}
              >
                {showConfirmation ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="auth-rules">
            {regles.map((regle) => (
              <div key={regle.label} className={`auth-rule ${regle.ok ? 'ok' : ''}`}>
                <CheckCircle2 size={13} />
                <span>{regle.label}</span>
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={chargement}
          >
            {chargement ? 'Inscription en cours...' : "S'inscrire"}
          </button>

        </form>

        <p className="auth-footer">
          Déjà inscrit ? <Link to="/login">Se connecter</Link>
        </p>

      </div>
    </div>
  );
};

export default Register;