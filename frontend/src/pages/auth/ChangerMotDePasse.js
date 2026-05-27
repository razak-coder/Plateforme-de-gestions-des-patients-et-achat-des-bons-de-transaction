import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

// ✅ Défini en dehors — stable entre les renders, pas de remontage
const FieldMdp = ({ field, label, form, setForm, visible, setVisible }) => (
  <div className="form-group" style={{ marginBottom: 14 }}>
    <label
      htmlFor={`field-${field}`}
      style={{ fontSize: 13, fontWeight: 600, color: '#444' }}
    >
      {label}
    </label>
    <div style={{ position: 'relative' }}>
      <input
        id={`field-${field}`}
        type={visible[field] ? 'text' : 'password'}
        required
        autoComplete="new-password"
        value={form[field]}
        onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
        placeholder="••••••••"
        style={{
          width: '100%', padding: '11px 42px 11px 14px',
          border: '2px solid #e5e7eb', borderRadius: 8, fontSize: 14,
          outline: 'none', boxSizing: 'border-box',
        }}
      />
      <button
        type="button"
        aria-label={visible[field] ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        onClick={() => setVisible(v => ({ ...v, [field]: !v[field] }))}
        style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', color: '#888',
        }}
      >
        {visible[field] ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  </div>
);

const ChangerMotDePasse = ({ onSuccess }) => {
  const { user } = useAuth();
  const [form, setForm]       = useState({ nouveau: '', confirmation: '' });
  const [visible, setVisible] = useState({ nouveau: false, confirmation: false });
  const [loading, setLoading] = useState(false);

  const regles = [
    { label: '8 caractères minimum',                ok: form.nouveau.length >= 8 },
    { label: '1 lettre minuscule',                  ok: /[a-z]/.test(form.nouveau) },
    { label: '1 lettre majuscule',                  ok: /[A-Z]/.test(form.nouveau) },
    { label: '1 chiffre',                           ok: /\d/.test(form.nouveau) },
    { label: 'Les deux mots de passe correspondent', ok: form.nouveau !== '' && form.nouveau === form.confirmation },
  ];

  const force = regles.filter(r => r.ok).length;
  const ratio = Math.min(force, 4);
  const couleurForce = ['#E74C3C', '#E67E22', '#F1C40F', '#27AE60'][ratio - 1] || '#ddd';
  const labelForce   = ['Trop faible', 'Moyen', 'Bien', 'Fort'][ratio - 1] || '';

  const soumettre = async (e) => {
    e.preventDefault();
    if (force < regles.length) {
      toast.error('Le mot de passe ne respecte pas toutes les règles.');
      return;
    }

    setLoading(true);
    try {
      await API.post('/auth/changer-mdp-force', {
        nouveau_mot_de_passe:      form.nouveau,
        confirmation_mot_de_passe: form.confirmation,
      });
      toast.success('Mot de passe défini avec succès. Bienvenue !');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors du changement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg,#1a1a2e,#1F5C9E)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '40px 36px',
        maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Icône + titre */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, background: '#fef5e7',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
          }}>
            <Shield size={32} color="#E67E22" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111', margin: 0 }}>
            Changement de mot de passe requis
          </h2>
          <p style={{ fontSize: 13, color: '#888', margin: '8px 0 0' }}>
            Bonjour <strong>{user?.prenom ?? ''}</strong> ! Votre compte a été créé par l'administration.<br />
            Veuillez définir un mot de passe personnel avant de continuer.
          </p>
        </div>

        <form onSubmit={soumettre}>
          {/* ✅ Props explicites passées au composant externe */}
          <FieldMdp
            field="nouveau"
            label="Nouveau mot de passe *"
            form={form}
            setForm={setForm}
            visible={visible}
            setVisible={setVisible}
          />
          <FieldMdp
            field="confirmation"
            label="Confirmer le mot de passe *"
            form={form}
            setForm={setForm}
            visible={visible}
            setVisible={setVisible}
          />

          {/* Indicateur de force */}
          {form.nouveau && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 4, borderRadius: 4,
                    background: i < ratio ? couleurForce : '#eee',
                    transition: 'background .2s',
                  }} />
                ))}
              </div>
              <p style={{ fontSize: 11, color: couleurForce, fontWeight: 700, margin: 0 }}>
                {labelForce}
              </p>
            </div>
          )}

          {/* Règles */}
          <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {regles.map(r => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                  background: r.ok ? '#27AE60' : '#eee',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background .2s',
                }}>
                  {r.ok && <CheckCircle size={10} color="#fff" />}
                </div>
                <span style={{ fontSize: 12, color: r.ok ? '#27AE60' : '#aaa' }}>{r.label}</span>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || force < regles.length}
            style={{
              width: '100%', padding: '13px', borderRadius: 8, border: 'none',
              background: force === regles.length ? '#1F5C9E' : '#ddd',
              color: force === regles.length ? '#fff' : '#aaa',
              fontWeight: 700, fontSize: 14,
              cursor: force === regles.length ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background .2s',
            }}
          >
            <Lock size={15} />
            {loading ? 'Enregistrement...' : 'Définir mon mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangerMotDePasse;