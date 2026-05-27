import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/auth.css';

const Login = () => {
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const [form, setForm]             = useState({ email: '', password: '' });
  const [erreur, setErreur]         = useState('');
  const [chargement, setChargement] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (erreur) setErreur('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');

    const email = form.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErreur('Veuillez entrer un email valide.');
      return;
    }
    if (!form.password.trim()) {
      setErreur('Veuillez entrer votre mot de passe.');
      return;
    }

    setChargement(true);
    try {
      const user = await login(email, form.password);
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'medecin') {
        navigate('/medecin/dashboard');
      } else {
        navigate('/patient/dashboard');
      }
    } catch (err) {
      setErreur(err.response?.data?.message || 'Email ou mot de passe incorrect.');
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">

        <div className="auth-header">
          <h1>Connexion sécurisée</h1>
            <p>Accédez à votre espace patient, praticien ou administrateur</p>
        </div>

        {erreur && (
          <div className="alert alert-error">{erreur}</div>
        )}

        <form onSubmit={handleSubmit}>
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
            <label>Mot de passe</label>
            <div className="auth-password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
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

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={chargement}
          >
            {chargement ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        <p className="auth-footer">
          Pas encore de compte ? <Link to="/register">S'inscrire</Link>
        </p>

      </div>
    </div>
  );
};

export default Login;