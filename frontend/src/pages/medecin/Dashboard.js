import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CalendarDays, Clock, HeartPulse, LayoutDashboard, RefreshCw, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';
import API from '../../api/axios';

const MedecinDashboard = () => {
  const [flux, setFlux] = useState(null);
  const [rdvAVenir, setRdvAVenir] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});

  const charger = useCallback(async () => {
    try {
      const [resFlux, resAvenir, resNotif] = await Promise.all([
        API.get('/medecin/flux-du-jour'),
        API.get('/medecin/rendez-vous?a_venir=1&per_page=50'),
        API.get('/medecin/notifications?non_lues=1&limit=15'),
      ]);
      setFlux(resFlux.data);
      setRdvAVenir(resAvenir.data?.data?.data || []);
      setNotifications(resNotif.data?.data || []);
    } catch {
      toast.error('Impossible de charger votre espace praticien.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  if (loading) {
    return (
      <div className="layout">
        <Navbar />
        <div className="main-content loading">Chargement de votre agenda...</div>
      </div>
    );
  }

  const s = flux?.stats || {};
  const nonLues = notifications.filter((n) => !n.lu_at).length;

  const marquerLue = async (id) => {
    try {
      await API.put(`/medecin/notifications/${id}/lue`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      toast.error('Impossible de marquer cette notification.');
    }
  };

  const refuserRdv = async (rdv) => {
    const motif = window.prompt('Motif du refus du rendez-vous (obligatoire) :');
    if (!motif || !motif.trim()) return;
    setBusy((p) => ({ ...p, [rdv.id]: true }));
    try {
      await API.put(`/medecin/rendez-vous/${rdv.id}/refuser`, { motif_refus: motif.trim() });
      toast.success('Rendez-vous refusé.');
      charger();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur de refus.');
    } finally {
      setBusy((p) => ({ ...p, [rdv.id]: false }));
    }
  };

  return (
    <div className="layout">
      <Navbar />
      <div className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <LayoutDashboard size={24} /> Mon agenda
            </h1>
            <p style={{ color: '#888', margin: '6px 0 0', fontSize: 13 }}>
              {flux?.date_lisible} · {nonLues} notification(s) non lue(s)
            </p>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={charger}>
            <RefreshCw size={14} /> Actualiser
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'RDV du jour', value: s.total ?? 0, color: '#1F5C9E', bg: '#eaf2fb' },
            { label: 'En attente', value: s.en_attente ?? 0, color: '#E67E22', bg: '#fef5e7' },
            { label: 'En consultation', value: s.confirme ?? 0, color: '#2980B9', bg: '#eaf2fb' },
            { label: 'Terminés', value: s.termine ?? 0, color: '#27AE60', bg: '#eafaf1' },
          ].map((c) => (
            <div key={c.label} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: 26, fontWeight: 800, color: c.color, margin: 0 }}>{c.value}</p>
              <p style={{ fontSize: 11, color: '#888', margin: 0 }}>{c.label}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14, marginBottom: 14 }}>
          <div className="card" style={{ padding: 20 }}>
            <h2 style={{ fontSize: 16, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={18} color="#E67E22" /> Notifications
            </h2>
            {notifications.length === 0 ? (
              <p style={{ color: '#888', fontSize: 13 }}>Aucune notification non lue.</p>
            ) : notifications.map((n) => (
              <div key={n.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>{n.titre}</p>
                <p style={{ fontSize: 12, color: '#666', margin: '5px 0' }}>{n.message}</p>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => marquerLue(n.id)}>
                  Marquer comme lue
                </button>
              </div>
            ))}
          </div>

          <Link to="/medecin/salle-attente" className="card" style={{ textDecoration: 'none', color: 'inherit', padding: 20, display: 'block' }}>
            <Clock size={28} color="#1F5C9E" style={{ marginBottom: 8 }} />
            <h2 style={{ fontSize: 16, margin: '0 0 6px' }}>Salle d&apos;attente</h2>
            <p style={{ fontSize: 13, color: '#666', margin: 0 }}>Appeler les patients et terminer les consultations en cours.</p>
          </Link>
          <Link to="/medecin/consultations" className="card" style={{ textDecoration: 'none', color: 'inherit', padding: 20, display: 'block' }}>
            <HeartPulse size={28} color="#1A7A4A" style={{ marginBottom: 8 }} />
            <h2 style={{ fontSize: 16, margin: '0 0 6px' }}>Consultations</h2>
            <p style={{ fontSize: 13, color: '#666', margin: 0 }}>Saisir ou compléter les comptes rendus (médecin attribué = vous).</p>
          </Link>
          <div className="card" style={{ padding: 20, opacity: 0.85 }}>
            <CalendarDays size={28} color="#888" style={{ marginBottom: 8 }} />
            <h2 style={{ fontSize: 16, margin: '0 0 6px', color: '#555' }}>Planning</h2>
            <p style={{ fontSize: 13, color: '#888', margin: 0 }}>Vos rendez-vous affichés ici correspondent uniquement à votre agenda.</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2><CalendarDays size={16} /> Rendez-vous programmes et a venir</h2>
            <span className="badge badge-attente">{rdvAVenir.length}</span>
          </div>
          {rdvAVenir.length === 0 ? (
            <div className="empty-state"><p>Aucun rendez-vous a venir.</p></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Heure</th>
                  <th>Patient</th>
                  <th>Motif</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rdvAVenir.map((rdv) => (
                  <tr key={rdv.id}>
                    <td>{rdv.date_rdv ? new Date(rdv.date_rdv).toLocaleDateString('fr-FR') : '—'}</td>
                    <td>{rdv.heure_rdv?.slice(0, 5)}</td>
                    <td><strong>{rdv.utilisateur?.prenom} {rdv.utilisateur?.nom}</strong></td>
                    <td style={{ fontSize: 12 }}>{rdv.motif}</td>
                    <td><span className="badge badge-attente">{rdv.statut}</span></td>
                    <td>
                      {rdv.statut !== 'annule' && rdv.statut !== 'termine' && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          disabled={!!busy[rdv.id]}
                          onClick={() => refuserRdv(rdv)}
                        >
                          <XCircle size={12} /> {busy[rdv.id] ? '...' : 'Refuser'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default MedecinDashboard;
