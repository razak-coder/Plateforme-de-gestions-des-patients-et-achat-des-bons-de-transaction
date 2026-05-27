import React, { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import '../../styles/dashboard.css';
import { LayoutDashboard, CreditCard, CheckCircle, Clock, XCircle, CalendarDays, Stethoscope } from 'lucide-react';

const PatientDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats]           = useState(null);
  const [derniersBons, setDerniersBons] = useState([]);
  const [rdvAVenir, setRdvAVenir]   = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bordRes, bonsRes] = await Promise.all([
          API.get('/patient/tableau-bord'),
          API.get('/patient/bons?limit=5'),
        ]);
        // tableau-bord retourne des stats enrichies
        const bord = bordRes.data.data;
        setStats({
          total_bons:       bord.total_bons,
          bons_valides:     bord.bons_valides,
          bons_en_attente:  0,
          bons_expires:     0,
          total_depense:    bord.total_depense,
          prochains_rdv:    bord.prochains_rdv || [],
          prochain_rdv:     bord.prochain_rdv,
          total_consultations: bord.total_consultations,
        });
        setDerniersBons((bonsRes.data.data && bonsRes.data.data.data) || bonsRes.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getBadge = (statut) => {
    const map = {
      valide:     'badge-valide',
      expire:     'badge-expire',
      utilise:    'badge-utilise',
      annule:     'badge-annule',
      en_attente: 'badge-attente',
    };
    return map[statut] || 'badge-attente';
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="layout">
      <Navbar />
      <div className="main-content">
        <div className="page-title">
          <h1><LayoutDashboard size={22}/> Tableau de bord</h1>
          <p>Bienvenue, {user?.prenom} {user?.nom}</p>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue"><CreditCard size={22}/></div>
            <div className="stat-info">
              <p>{stats?.total_bons ?? 0}</p>
              <p>Total bons achetés</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><CheckCircle size={22}/></div>
            <div className="stat-info">
              <p>{stats?.bons_valides ?? 0}</p>
              <p>Bons valides</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange"><Clock size={22}/></div>
            <div className="stat-info">
              <p>{stats?.bons_en_attente ?? 0}</p>
              <p>En attente</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red"><XCircle size={22}/></div>
            <div className="stat-info">
              <p>{stats?.bons_expires ?? 0}</p>
              <p>Bons expirés</p>
            </div>
          </div>
        </div>

        {/* Derniers bons */}
        <div className="card">
          <div className="card-header">
            <h2><CreditCard size={18}/> Derniers bons achetés</h2>
          </div>

          {derniersBons.length === 0 ? (
            <div className="empty-state">
              <CreditCard size={40} color="#ccc"/>
              <p>Aucun bon acheté pour le moment.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Code unique</th>
                  <th>Type de bon</th>
                  <th>Montant</th>
                  <th>Date achat</th>
                  <th>Expiration</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {derniersBons.map((bon) => (
                  <tr key={bon.id_bon}>
                    <td><code>{bon.code_unique}</code></td>
                    <td>{bon.type_bon?.nom}</td>
                    <td>{bon.type_bon?.prix} FCFA</td>
                    <td>{new Date(bon.date_achat).toLocaleDateString('fr-FR')}</td>
                    <td>{new Date(bon.date_expiration).toLocaleDateString('fr-FR')}</td>
                    <td>
                      <span className={`badge ${getBadge(bon.statut)}`}>
                        {bon.statut}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {/* RDV à venir du jour */}
        <div className="card" style={{marginTop:20}}>
          <div className="card-header">
            <h2><CalendarDays size={18}/> Rendez-vous d'aujourd'hui</h2>
            <span className="badge badge-attente">{rdvAVenir.length}</span>
          </div>
          {rdvAVenir.length === 0 ? (
            <div className="empty-state">
              <CalendarDays size={36} color="#ccc"/>
              <p>Aucun rendez-vous aujourd'hui.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Heure</th><th>Médecin</th><th>Motif</th><th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {rdvAVenir.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.heure_rdv?.slice(0,5)}</strong></td>
                    <td>{r.medecin?.nom_complet || '—'}</td>
                    <td>{r.motif}</td>
                    <td><span className={`badge ${r.statut === 'confirme' ? 'badge-valide' : 'badge-attente'}`}>{r.statut}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Numéro patient */}
        {user?.numero_patient && (
          <div className="card" style={{marginTop:20,background:'linear-gradient(135deg,#1F5C9E,#2e86de)',color:'#fff',padding:20}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <Stethoscope size={28}/>
              <div>
                <p style={{fontSize:11,opacity:0.8,margin:0}}>Votre numéro patient</p>
                <p style={{fontSize:22,fontWeight:'bold',margin:0,letterSpacing:2}}>{user.numero_patient}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDashboard;