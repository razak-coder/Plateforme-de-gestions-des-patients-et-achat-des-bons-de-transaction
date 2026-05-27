import React, { useEffect, useState, useCallback } from 'react';
import {
  Clock, CheckCircle, X, RefreshCw, Stethoscope,
  Filter, Users, CalendarDays,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';

const STATUTS = [
  { value:'tous',       label:'Tous', color:'#888' },
  { value:'en_attente', label:'En attente', color:'#E67E22' },
  { value:'confirme',   label:'En consultation', color:'#2980B9' },
  { value:'termine',    label:'Terminé', color:'#27AE60' },
  { value:'annule',     label:'Annulé', color:'#C0392B' },
];

const PRIORITE_CONFIG = {
  urgente: { bg:'#fdecea', color:'#C0392B', label:'⚡ Urgent', border:'#E74C3C' },
  haute:   { bg:'#fef5e7', color:'#E67E22', label:'↑ Haute',  border:'#F39C12' },
  normale: { bg:'#f8f9fa', color:'#555',    label:'Normale',  border:'#ddd' },
};

const SalleAttente = () => {
  const { user } = useAuth();
  const apiBase = user?.role === 'medecin' ? '/medecin' : '/admin';

  const [flux, setFlux]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [filtreMedecin, setFiltreMedecin] = useState('tous');
  const [filtreStatut, setFiltreStatut]   = useState('tous');
  const [processing, setProcessing]       = useState({});
  const [lastRefresh, setLastRefresh]     = useState(new Date());
  // Confirmation d'annulation — évite les clics accidentels
  const [confirmAnnule, setConfirmAnnule] = useState(null); // rdvId | null

  const charger = useCallback(async () => {
    try {
      const res = await API.get(`${apiBase}/flux-du-jour`);
      setFlux(res.data);
      setLastRefresh(new Date());
    } catch {
      toast.error('Impossible de charger le flux du jour.');
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    charger();
    const interval = setInterval(charger, 45000);
    return () => clearInterval(interval);
  }, [charger]);

  const changerStatut = async (rdvId, statut) => {
    setProcessing(prev => ({ ...prev, [rdvId]: true }));
    setConfirmAnnule(null);
    try {
      await API.put(`${apiBase}/rendez-vous/${rdvId}/statut`, { statut });
      const labels = { confirme:'appelé en consultation', termine:'terminé', annule:'annulé' };
      toast.success(`Rendez-vous ${labels[statut] || statut}.`);
      charger();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.');
    } finally {
      setProcessing(prev => ({ ...prev, [rdvId]: false }));
    }
  };

  const terminerConsultation = async (rdvId, consultation) => {
    const liste = Array.isArray(consultation)
      ? consultation
      : consultation ? [consultation] : [];
    const consult = liste.find(c => c.statut === 'en_cours');
    if (consult) {
      try {
        await API.put(`${apiBase}/consultations/${consult.id}/terminer`);
        toast.success('Consultation terminée. Bon marqué utilisé.');
        charger();
      } catch { await changerStatut(rdvId, 'termine'); }
    } else {
      await changerStatut(rdvId, 'termine');
    }
  };

  if (loading) return <div className="loading"><Clock size={24} color="#1F5C9E"/> Chargement de la salle d'attente...</div>;

  const tousRdv = flux?.tous_rdv || [];
  const rdvFiltres = tousRdv.filter(r => {
    const matchMedecin = filtreMedecin === 'tous' || String(r.medecin_id) === filtreMedecin;
    const matchStatut  = filtreStatut === 'tous'  || r.statut === filtreStatut;
    return matchMedecin && matchStatut;
  });

  const medecinsDuJour = flux?.par_medecin || [];
  const stats = flux?.stats || {};

  return (
    <div className="layout">
      <Navbar />
      <div className="main-content">

        {/* En-tête */}
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20 }}>
          <div>
            <h1 style={{ fontSize:22,fontWeight:800,margin:0 }}>⏳ Salle d'attente</h1>
            <p style={{ color:'#888',margin:'4px 0 0',fontSize:13 }}>
              {flux?.date_lisible} · Dernière mise à jour : {lastRefresh.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}
            </p>
          </div>
          <button onClick={charger} className="btn btn-outline btn-sm">
            <RefreshCw size={14}/> Actualiser
          </button>
        </div>

        {/* Stats rapides */}
        <div style={{ display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20 }}>
          {[
            { label:'Total du jour', value:stats.total || 0,      color:'#1F5C9E', bg:'#eaf2fb' },
            { label:'En attente',    value:stats.en_attente || 0, color:'#E67E22', bg:'#fef5e7' },
            { label:'En cours',      value:stats.confirme || 0,   color:'#2980B9', bg:'#eaf2fb' },
            { label:'Terminés',      value:stats.termine || 0,    color:'#27AE60', bg:'#eafaf1' },
            { label:'Annulés',       value:stats.annule || 0,     color:'#C0392B', bg:'#fdecea' },
          ].map(s => (
            <div key={s.label} style={{ background:'#fff',border:'1px solid #eee',borderRadius:10,
              padding:'14px 16px',textAlign:'center',boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
              <p style={{ fontSize:28,fontWeight:800,color:s.color,margin:0 }}>{s.value}</p>
              <p style={{ fontSize:11,color:'#888',margin:0 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div style={{ display:'flex',gap:10,marginBottom:20,alignItems:'center',flexWrap:'wrap' }}>
          <Filter size={15} color="#888"/>
          <span style={{ fontSize:12,color:'#888' }}>Médecin :</span>
          <select value={filtreMedecin} onChange={e => setFiltreMedecin(e.target.value)}
            style={{ padding:'7px 12px',border:'1px solid #ddd',borderRadius:6,fontSize:12 }}>
            <option value="tous">Tous les médecins</option>
            {medecinsDuJour.map(g => (
              <option key={g.medecin?.id} value={String(g.medecin?.id)}>
                Dr {g.medecin?.prenom} {g.medecin?.nom} ({g.stats.total})
              </option>
            ))}
          </select>
          <span style={{ fontSize:12,color:'#888',marginLeft:8 }}>Statut :</span>
          {STATUTS.map(s => (
            <button key={s.value} onClick={() => setFiltreStatut(s.value)}
              style={{
                padding:'5px 12px',borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',
                border: filtreStatut===s.value ? `2px solid ${s.color}` : '1px solid #ddd',
                background: filtreStatut===s.value ? s.color : '#fff',
                color: filtreStatut===s.value ? '#fff' : s.color,
                transition:'all .15s',
              }}>
              {s.label}
            </button>
          ))}
          <span style={{ marginLeft:'auto',fontSize:12,color:'#888' }}>{rdvFiltres.length} affiché(s)</span>
        </div>

        {/* Vue par médecin (si pas de filtre) */}
        {filtreMedecin === 'tous' && filtreStatut === 'tous' ? (
          medecinsDuJour.length === 0 ? (
            <div className="empty-state">
              <CalendarDays size={48} color="#ccc"/>
              <p>Aucun rendez-vous planifié pour aujourd'hui.</p>
            </div>
          ) : (
            <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
              {medecinsDuJour.map(g => (
                <div key={g.medecin?.id} className="card">
                  <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:14,
                    padding:'12px 16px',margin:'-1px -1px 14px',background:'#f8f9fa',
                    borderRadius:'12px 12px 0 0',borderBottom:'1px solid #eee' }}>
                    <div style={{ width:40,height:40,borderRadius:10,background:'#1F5C9E',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      color:'#fff',fontWeight:700,fontSize:13 }}>
                      {g.medecin?.prenom?.charAt(0)}{g.medecin?.nom?.charAt(0)}
                    </div>
                    <div>
                      <p style={{ fontSize:14,fontWeight:700,margin:0 }}>Dr {g.medecin?.prenom} {g.medecin?.nom}</p>
                      <p style={{ fontSize:12,color:'#888',margin:0 }}>{g.medecin?.specialite}</p>
                    </div>
                    <div style={{ marginLeft:'auto',display:'flex',gap:8 }}>
                      {[
                        { k:'en_attente', bg:'#fef5e7', c:'#E67E22', v:g.stats.en_attente },
                        { k:'confirme',   bg:'#eaf2fb', c:'#2980B9', v:g.stats.confirme   },
                        { k:'termine',    bg:'#eafaf1', c:'#27AE60', v:g.stats.termine    },
                      ].map(s => (
                        <span key={s.k} style={{ background:s.bg,color:s.c,padding:'4px 10px',
                          borderRadius:20,fontSize:11,fontWeight:700 }}>
                          {s.v} {STATUTS.find(st=>st.value===s.k)?.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <PatientList rdvs={g.rendez_vous} onAction={changerStatut}
                    onTerminer={terminerConsultation} processing={processing}
                    canTerminateConsultation={user?.role === 'medecin'}
                    confirmAnnule={confirmAnnule} setConfirmAnnule={setConfirmAnnule} />
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="card">
            <PatientList rdvs={rdvFiltres} onAction={changerStatut}
              onTerminer={terminerConsultation} processing={processing} showMedecin
              canTerminateConsultation={user?.role === 'medecin'}
              confirmAnnule={confirmAnnule} setConfirmAnnule={setConfirmAnnule} />
          </div>
        )}

      </div>
    </div>
  );
};

/* ── Composant liste patients ─────────────────────────────────────────── */
const PatientList = ({
  rdvs, onAction, onTerminer, processing, showMedecin = false,
  canTerminateConsultation = false, confirmAnnule, setConfirmAnnule,
}) => {
  if (rdvs.length === 0) return (
    <div style={{ textAlign:'center',padding:'24px 0',color:'#aaa',fontSize:13 }}>
      <Users size={32} color="#ddd" style={{ display:'block',margin:'0 auto 8px' }}/>
      Aucun patient dans cette sélection.
    </div>
  );

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
      {rdvs.map(r => {
        const p  = PRIORITE_CONFIG[r.priorite] || PRIORITE_CONFIG.normale;
        const en = processing[r.id];
        return (
          <div key={r.id} style={{
            display:'flex',alignItems:'center',gap:12,padding:'12px 14px',
            borderRadius:10,border:`1px solid ${p.border}`,background:p.bg,
            transition:'box-shadow .15s',
          }}>
            {/* Heure */}
            <div style={{ textAlign:'center',minWidth:44,flexShrink:0 }}>
              <p style={{ fontSize:16,fontWeight:800,color:'#1F5C9E',margin:0,lineHeight:1 }}>
                {r.heure_rdv?.slice(0,5)}
              </p>
              <p style={{ fontSize:9,color:'#aaa',margin:0,textTransform:'uppercase' }}>RDV</p>
            </div>

            {/* Avatar patient */}
            <div style={{ width:38,height:38,borderRadius:8,background:'#fff',border:'1px solid #ddd',
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:13,fontWeight:700,color:'#1F5C9E',flexShrink:0 }}>
              {r.utilisateur?.prenom?.charAt(0)}{r.utilisateur?.nom?.charAt(0)}
            </div>

            {/* Infos */}
            <div style={{ flex:1,overflow:'hidden' }}>
              <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                <strong style={{ fontSize:13 }}>{r.utilisateur?.prenom} {r.utilisateur?.nom}</strong>
                <span style={{ fontSize:10,color:p.color,fontWeight:700 }}>{p.label}</span>
              </div>
              <p style={{ fontSize:11,color:'#888',margin:'2px 0 0',
                whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>
                {showMedecin && `Dr ${r.medecin?.nom} · `}
                {r.motif}
                {r.bon && <span style={{ color:'#1A7A4A',marginLeft:6 }}>🎫 {r.bon.code_unique}</span>}
              </p>
            </div>

            {/* Actions */}
            <div style={{ display:'flex',gap:6,flexShrink:0,alignItems:'center' }}>
              {r.statut === 'en_attente' && (
                <button disabled={en} onClick={() => onAction(r.id, 'confirme')}
                  style={{ padding:'5px 12px',background:'#1F5C9E',color:'#fff',border:'none',
                    borderRadius:6,cursor:'pointer',fontSize:11,fontWeight:600,
                    opacity:en?0.5:1,display:'flex',alignItems:'center',gap:4 }}>
                  <Stethoscope size={12}/> {en ? '...' : 'Appeler'}
                </button>
              )}
              {r.statut === 'confirme' && canTerminateConsultation && (
                <button disabled={en} onClick={() => onTerminer(r.id, r.consultation)}
                  style={{ padding:'5px 12px',background:'#27AE60',color:'#fff',border:'none',
                    borderRadius:6,cursor:'pointer',fontSize:11,fontWeight:600,
                    opacity:en?0.5:1,display:'flex',alignItems:'center',gap:4 }}>
                  <CheckCircle size={12}/> {en ? '...' : 'Terminer'}
                </button>
              )}
              {r.statut === 'confirme' && !canTerminateConsultation && (
                <span style={{ fontSize:11,padding:'5px 10px',borderRadius:6,fontWeight:600,
                  background:'#eaf2fb', color:'#1F5C9E' }}>
                  En consultation (médecin)
                </span>
              )}

              {/* ── Annulation avec double confirmation ── */}
              {r.statut !== 'annule' && r.statut !== 'termine' && (
                confirmAnnule === r.id ? (
                  <div style={{ display:'flex',gap:4,alignItems:'center',
                    padding:'4px 8px',borderRadius:6,
                    background:'#fdecea',border:'1px solid #e74c3c' }}>
                    <span style={{ fontSize:11,color:'#C0392B',fontWeight:600 }}>Annuler ?</span>
                    <button disabled={en} onClick={() => onAction(r.id, 'annule')}
                      style={{ padding:'3px 8px',background:'#C0392B',color:'#fff',border:'none',
                        borderRadius:4,cursor:'pointer',fontSize:11,fontWeight:700 }}>
                      Oui
                    </button>
                    <button onClick={() => setConfirmAnnule(null)}
                      style={{ padding:'3px 8px',background:'#fff',color:'#555',
                        border:'1px solid #ccc',borderRadius:4,cursor:'pointer',fontSize:11 }}>
                      Non
                    </button>
                  </div>
                ) : (
                  <button disabled={en} onClick={() => setConfirmAnnule(r.id)}
                    title="Annuler ce RDV"
                    style={{ padding:'5px 10px',background:'#fdecea',color:'#C0392B',
                      border:'1px solid #f1948a',borderRadius:6,cursor:'pointer',
                      opacity:en?0.5:1,display:'flex',alignItems:'center',gap:4,fontSize:11,fontWeight:600 }}>
                    <X size={12}/> Annuler
                  </button>
                )
              )}
              {(r.statut === 'termine' || r.statut === 'annule') && (
                <span style={{ fontSize:11,padding:'5px 10px',borderRadius:6,fontWeight:600,
                  background: r.statut==='termine'?'#eafaf1':'#fdecea',
                  color: r.statut==='termine'?'#1A7A4A':'#C0392B' }}>
                  {r.statut === 'termine' ? '✓ Terminé' : '✗ Annulé'}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SalleAttente;
