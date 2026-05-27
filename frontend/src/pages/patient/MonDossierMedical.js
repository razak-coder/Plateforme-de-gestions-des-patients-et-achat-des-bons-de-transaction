import React, { useEffect, useState, useCallback } from 'react';
import {
  FileHeart, CalendarDays, Stethoscope, CreditCard, AlertCircle,
  CheckCircle, Clock, ChevronDown, ChevronUp, RefreshCw, ListOrdered,
  Bell, Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';
import API from '../../api/axios';
import { useNavigate } from 'react-router-dom';

/* ─── Helpers ─────────────────────────────────────────────────────── */
const fmt  = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const badge = (s) => {
  if (s === 'confirme'  || s === 'ouvert'  || s === 'valide')  return { bg:'#eafaf1', color:'#1A7A4A' };
  if (s === 'termine'   || s === 'utilise')                    return { bg:'#eaf2fb', color:'#1F5C9E' };
  if (s === 'annule'    || s === 'archive' || s === 'expire')  return { bg:'#fdecea', color:'#C0392B' };
  return { bg:'#fef9e7', color:'#9A7D0A' };
};
const label = (s) => ({
  en_attente:'En attente', confirme:'Confirmé', termine:'Terminé',
  annule:'Annulé', ouvert:'Ouvert', ferme:'Fermé', archive:'Archivé', en_cours:'En cours',
}[s] || s);

/* ─── Carte stat ────────────────────────────────────────────────────── */
const StatCard = ({ icon, titre, valeur, couleur = '#1F5C9E', bg = '#eaf2fb' }) => (
  <div style={{
    background:'#fff', border:'1px solid #eee', borderRadius:12, padding:'18px 20px',
    display:'flex', alignItems:'center', gap:16, boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
  }}>
    <div style={{ width:46, height:46, borderRadius:10, background:bg,
      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      {React.cloneElement(icon, { size:22, color:couleur })}
    </div>
    <div>
      <p style={{ fontSize:22, fontWeight:700, color:'#1a1a1a', margin:0 }}>{valeur ?? '—'}</p>
      <p style={{ fontSize:12, color:'#888', margin:0 }}>{titre}</p>
    </div>
  </div>
);

/* ─── Composant Dossier accordéon ───────────────────────────────────── */
const DossierCard = ({ dossier }) => {
  const [ouvert, setOuvert] = useState(false);
  const b = badge(dossier.statut);

  return (
    <div style={{ border:'1px solid #e5e7eb', borderRadius:10, marginBottom:12, overflow:'hidden', background:'#fff' }}>
      {/* En-tête */}
      <div
        onClick={() => setOuvert(!ouvert)}
        style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px',
          cursor:'pointer', background: ouvert ? '#f8f9fa' : '#fff' }}>
        <div style={{ width:38, height:38, borderRadius:8, background:'#eaf2fb',
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <FileHeart size={18} color="#1F5C9E" />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <strong style={{ fontSize:14 }}>{dossier.numero_dossier}</strong>
            <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:600,
              background:b.bg, color:b.color }}>{label(dossier.statut)}</span>
          </div>
          <p style={{ fontSize:12, color:'#888', margin:0 }}>
            {dossier.service} · Ouvert le {fmt(dossier.date_ouverture)}
          </p>
        </div>
        <div style={{ display:'flex', gap:12, fontSize:12, color:'#666' }}>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}>
            <CalendarDays size={13}/> {dossier.rendez_vous?.length || 0} RDV
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}>
            <Stethoscope size={13}/> {dossier.consultations?.length || 0} Consult.
          </span>
        </div>
        {ouvert ? <ChevronUp size={16} color="#888"/> : <ChevronDown size={16} color="#888"/>}
      </div>

      {/* Contenu accordéon */}
      {ouvert && (
        <div style={{ padding:'0 18px 18px' }}>

          {/* Antécédents */}
          {dossier.antecedents && (
            <div style={{ background:'#fffbea', border:'1px solid #fde68a',
              borderRadius:8, padding:'10px 14px', marginTop:12, marginBottom:16 }}>
              <p style={{ fontSize:12, fontWeight:600, color:'#92400e', marginBottom:4 }}>
                ⚠️ Antécédents médicaux
              </p>
              <p style={{ fontSize:13, color:'#78350f', margin:0 }}>{dossier.antecedents}</p>
            </div>
          )}

          {/* Rendez-vous */}
          <p style={{ fontSize:13, fontWeight:700, color:'#1F5C9E', marginBottom:8, marginTop:16 }}>
            <CalendarDays size={14} style={{ verticalAlign:'middle', marginRight:4 }}/>
            Rendez-vous
          </p>
          {(!dossier.rendez_vous || dossier.rendez_vous.length === 0) ? (
            <p style={{ fontSize:12, color:'#aaa' }}>Aucun rendez-vous pour ce dossier.</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {dossier.rendez_vous.map(r => {
                const rb = badge(r.statut);
                return (
                  <div key={r.id} style={{ display:'flex', alignItems:'center', gap:10,
                    background:'#f8f9fa', borderRadius:8, padding:'10px 14px' }}>
                    <div style={{ width:34, height:34, borderRadius:8, background:'#fff',
                      border:'1px solid #e5e7eb', display:'flex', alignItems:'center',
                      justifyContent:'center' }}>
                      <CalendarDays size={15} color="#1F5C9E"/>
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:13, fontWeight:600, margin:0 }}>
                        {r.medecin?.nom_complet || '—'} — {r.medecin?.specialite}
                      </p>
                      <p style={{ fontSize:11, color:'#888', margin:0 }}>
                        {fmt(r.date_rdv)} à {r.heure_rdv?.slice(0,5)} · {r.motif}
                      </p>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20,
                        fontWeight:600, background:rb.bg, color:rb.color }}>
                        {label(r.statut)}
                      </span>
                      {r.priorite && r.priorite !== 'normale' && (
                        <span style={{ fontSize:10, color: r.priorite === 'urgente' ? '#C0392B' : '#e67e22',
                          fontWeight:600 }}>⚡ {r.priorite}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Consultations */}
          <p style={{ fontSize:13, fontWeight:700, color:'#1F5C9E', marginBottom:8, marginTop:18 }}>
            <Stethoscope size={14} style={{ verticalAlign:'middle', marginRight:4 }}/>
            Consultations
          </p>
          {(!dossier.consultations || dossier.consultations.length === 0) ? (
            <p style={{ fontSize:12, color:'#aaa' }}>Aucune consultation pour ce dossier.</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {dossier.consultations.map(c => (
                <div key={c.id} style={{ background:'#f8f9fa', borderRadius:8, padding:'12px 14px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <div>
                      <span style={{ fontSize:13, fontWeight:600 }}>
                        {c.medecin?.nom_complet}
                      </span>
                      <span style={{ fontSize:11, color:'#888', marginLeft:8 }}>{fmt(c.date_consultation)}</span>
                    </div>
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:600,
                      background:badge(c.statut).bg, color:badge(c.statut).color }}>
                      {label(c.statut)}
                    </span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                    <div style={{ background:'#fff', borderRadius:6, padding:'8px 10px', border:'1px solid #eee' }}>
                      <p style={{ fontSize:10, color:'#888', margin:0 }}>Diagnostic</p>
                      <p style={{ fontSize:12, color:'#333', margin:0, fontWeight:500 }}>{c.diagnostic}</p>
                    </div>
                    <div style={{ background:'#fff', borderRadius:6, padding:'8px 10px', border:'1px solid #eee' }}>
                      <p style={{ fontSize:10, color:'#888', margin:0 }}>Traitement</p>
                      <p style={{ fontSize:12, color:'#333', margin:0, fontWeight:500 }}>{c.traitement}</p>
                    </div>
                    {c.orientation && (
                      <div style={{ gridColumn:'1/-1', background:'#eaf2fb', borderRadius:6,
                        padding:'8px 10px' }}>
                        <p style={{ fontSize:10, color:'#1F5C9E', margin:0 }}>Orientation</p>
                        <p style={{ fontSize:12, color:'#1F5C9E', margin:0, fontWeight:500 }}>→ {c.orientation}</p>
                      </div>
                    )}
                  </div>
                  {c.bon && (
                    <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:6,
                      fontSize:11, color:'#888' }}>
                      <CreditCard size={12}/>
                      Bon utilisé : <code style={{ fontSize:11 }}>{c.bon.code_unique}</code>
                      — {c.bon.type_bon?.nom}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ─── Page principale ───────────────────────────────────────────────── */
const MonDossierMedical = () => {
  const navigate = useNavigate();
  const [onglet, setOnglet]             = useState('dossiers');
  const [dossiers, setDossiers]         = useState([]);
  const [rdvs, setRdvs]                 = useState([]);
  const [consults, setConsults]         = useState([]);
  const [chronologie, setChronologie]   = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [nonLues, setNonLues]           = useState(0);
  const [stats, setStats]               = useState(null);
  const [loading, setLoading]           = useState(true);
  const [filtreRdv, setFiltreRdv]       = useState('tous'); // 'tous' | 'a_venir' | 'passes'

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const [resBord, resDossiers, resRdv, resConsult, resChrono, resNotifs] = await Promise.all([
        API.get('/patient/tableau-bord'),
        API.get('/patient/dossiers'),
        API.get('/patient/rendez-vous'),   // Retourne maintenant TOUS les RDV
        API.get('/patient/consultations'),
        API.get('/patient/chronologie'),
        API.get('/patient/notifications').catch(() => ({ data: { data: [], non_lues: 0 } })),
      ]);
      setStats(resBord.data.data);
      setDossiers(resDossiers.data.data || []);
      setRdvs(resRdv.data.data || []);
      setConsults(resConsult.data.data || []);
      setChronologie(resChrono.data.data || []);
      setNotifications(resNotifs.data.data || []);
      setNonLues(resNotifs.data.non_lues || 0);
    } catch (err) {
      toast.error('Impossible de charger votre dossier médical.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  if (loading) return <div className="loading"><Stethoscope size={28} color="#1F5C9E"/> Chargement de votre dossier...</div>;

  return (
    <div className="layout">
      <Navbar />
      <div className="main-content">

        {/* En-tête */}
        <div className="page-title">
          <h1><FileHeart size={22}/> Mon dossier médical</h1>
          <p>Consultez vos dossiers, vos rendez-vous à venir et vos consultations passées.</p>
        </div>

        {/* Alerte bons expirant bientôt (A4) */}
        {stats?.bons_expirant_bientot?.length > 0 && (
          <div style={{ background: '#fff8e6', border: '1px solid #f0a500', borderRadius: 10, padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertCircle size={20} color="#E67E22" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, color: '#c87a00', margin: 0, fontSize: 13 }}>
                ⚠️ {stats.bons_expirant_bientot.length} bon{stats.bons_expirant_bientot.length > 1 ? 's' : ''} expire{stats.bons_expirant_bientot.length > 1 ? 'nt' : ''} dans moins de 7 jours !
              </p>
              {stats.bons_expirant_bientot.map(b => (
                <p key={b.id} style={{ fontSize: 12, color: '#a06800', margin: '2px 0 0' }}>
                  • {b.code_unique} — expire le {fmt(b.date_expiration)}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(170px,1fr))', gap:12, marginBottom:24 }}>
          <StatCard icon={<FileHeart/>} titre="Dossiers ouverts"
            valeur={stats?.total_dossiers ?? 0} couleur="#1F5C9E" bg="#eaf2fb" />
          <StatCard icon={<CalendarDays/>} titre="Tous les RDV"
            valeur={rdvs.length} couleur="#27ae60" bg="#eafaf1" />
          <StatCard icon={<Stethoscope/>} titre="Consultations"
            valeur={stats?.total_consultations ?? 0} couleur="#8e44ad" bg="#f5eef8" />
          <StatCard icon={<CreditCard/>} titre="Bons valides"
            valeur={stats?.bons_valides ?? 0} couleur="#e67e22" bg="#fef5e7" />
        </div>

        {/* Prochain RDV banner */}
        {stats?.prochain_rdv && (
          <div style={{ background:'linear-gradient(135deg,#1F5C9E,#2e86de)', borderRadius:12,
            padding:'18px 24px', marginBottom:24, color:'#fff',
            display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ width:46, height:46, borderRadius:10, background:'rgba(255,255,255,0.2)',
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <CalendarDays size={22} color="#fff"/>
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:11, opacity:0.8, margin:0 }}>PROCHAIN RENDEZ-VOUS</p>
              <p style={{ fontSize:16, fontWeight:700, margin:'2px 0' }}>
                {stats.prochain_rdv.medecin?.nom_complet} — {stats.prochain_rdv.medecin?.specialite}
              </p>
              <p style={{ fontSize:13, opacity:0.9, margin:0 }}>
                📅 {fmt(stats.prochain_rdv.date_rdv)} à {stats.prochain_rdv.heure_rdv?.slice(0,5)} · {stats.prochain_rdv.motif}
              </p>
            </div>
            <button
              onClick={() => navigate('/patient/rendez-vous')}
              style={{ background:'rgba(255,255,255,0.25)', border:'none', padding:'8px 16px',
                borderRadius:20, fontSize:12, fontWeight:600, color:'#fff', cursor:'pointer',
                display:'flex', alignItems:'center', gap:6 }}>
              <Plus size={14} /> Prendre un RDV
            </button>
          </div>
        )}
        {!stats?.prochain_rdv && (
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/patient/rendez-vous')}>
              <Plus size={14} /> Prendre un rendez-vous
            </button>
          </div>
        )}

        {/* Onglets */}
        <div style={{ display:'flex', gap:8, marginBottom:20, borderBottom:'2px solid #eee', paddingBottom:0, flexWrap:'wrap' }}>
          {[
            { id:'dossiers',      icon:<FileHeart size={15}/>,    label:'Dossiers',     count:dossiers.length },
            { id:'rdvs',          icon:<CalendarDays size={15}/>, label:'Rendez-vous',  count:rdvs.length },
            { id:'consultations', icon:<Stethoscope size={15}/>,  label:'Consultations',count:consults.length },
            { id:'chronologie',   icon:<ListOrdered size={15}/>,  label:'Chronologie',  count:chronologie.length },
            { id:'notifications', icon:<Bell size={15}/>,         label:'Notifications', count: nonLues || notifications.length },
          ].map(o => (
            <button key={o.id} onClick={() => setOnglet(o.id)}
              style={{
                display:'flex', alignItems:'center', gap:6, padding:'9px 16px',
                border:'none', borderBottom: onglet === o.id ? '2px solid #1F5C9E' : '2px solid transparent',
                background:'none', cursor:'pointer', fontSize:13, fontWeight:600,
                color: onglet === o.id ? '#1F5C9E' : '#888',
                marginBottom:-2, transition:'all 0.15s',
              }}>
              {o.icon} {o.label}
              <span style={{ background: onglet === o.id ? '#1F5C9E' : '#ddd',
                color: onglet === o.id ? '#fff' : '#666',
                fontSize:11, padding:'1px 7px', borderRadius:20, fontWeight:700 }}>
                {o.count}
              </span>
            </button>
          ))}
          <button onClick={charger} style={{ marginLeft:'auto', background:'none', border:'1px solid #ddd',
            borderRadius:6, padding:'6px 12px', cursor:'pointer', color:'#888', fontSize:12,
            display:'flex', alignItems:'center', gap:4 }}>
            <RefreshCw size={13}/> Actualiser
          </button>
        </div>

        {/* ── Onglet Dossiers ── */}
        {onglet === 'dossiers' && (
          <div>
            {dossiers.length === 0 ? (
              <div className="empty-state">
                <FileHeart size={48} color="#ccc"/>
                <p>Aucun dossier médical enregistré.</p>
                <p style={{ fontSize:12, color:'#aaa' }}>
                  Contactez le personnel médical pour ouvrir votre dossier.
                </p>
              </div>
            ) : (
              dossiers.map(d => <DossierCard key={d.id} dossier={d} />)
            )}
          </div>
        )}

        {/* ── Onglet Rendez-vous (M5 — tous les RDV passés et à venir) ── */}
        {onglet === 'rdvs' && (
          <div>
            {/* Filtre */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[['tous', 'Tous'], ['a_venir', 'À venir'], ['passes', 'Passés']].map(([val, lbl]) => (
                <button key={val} onClick={() => setFiltreRdv(val)}
                  style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                    background: filtreRdv === val ? '#1F5C9E' : '#eee',
                    color: filtreRdv === val ? '#fff' : '#666' }}>
                  {lbl}
                </button>
              ))}
            </div>
            {(() => {
              const today = new Date().toISOString().split('T')[0];
              const liste = rdvs.filter(r => {
                if (filtreRdv === 'a_venir') return r.date_rdv >= today && !['annule','termine'].includes(r.statut);
                if (filtreRdv === 'passes')  return r.date_rdv < today;
                return true;
              });
              if (liste.length === 0) return (
                <div className="empty-state">
                  <CalendarDays size={48} color="#ccc"/>
                  <p>Aucun rendez-vous pour ce filtre.</p>
                </div>
              );
              return (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {liste.map(r => {
                    const rb = badge(r.statut);
                    const estPasse = r.date_rdv < today;
                    return (
                      <div key={r.id} style={{ background: estPasse ? '#f9f9f9' : '#fff', border:'1px solid #e5e7eb',
                        borderRadius:10, padding:'16px 20px', display:'flex', gap:16, alignItems:'center',
                        opacity: estPasse ? 0.75 : 1 }}>
                        <div style={{ textAlign:'center', minWidth:52, background: estPasse ? '#f0f0f0' : '#eaf2fb',
                          borderRadius:8, padding:'10px 8px', flexShrink:0 }}>
                          <p style={{ fontSize:18, fontWeight:800, color: estPasse ? '#999' : '#1F5C9E', margin:0, lineHeight:1 }}>
                            {new Date(r.date_rdv + 'T00:00:00').getDate()}
                          </p>
                          <p style={{ fontSize:10, color: estPasse ? '#999' : '#1F5C9E', margin:0, textTransform:'uppercase' }}>
                            {new Date(r.date_rdv + 'T00:00:00').toLocaleDateString('fr-FR', { month:'short' })}
                          </p>
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                            <strong style={{ fontSize:14 }}>{r.medecin?.nom_complet}</strong>
                            <span style={{ fontSize:11, color:'#888' }}>— {r.medecin?.specialite}</span>
                            {r.priorite !== 'normale' && (
                              <span style={{ fontSize:10, fontWeight:700,
                                color: r.priorite === 'urgente' ? '#C0392B' : '#e67e22' }}>
                                ⚡ {r.priorite}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize:12, color:'#666', margin:0 }}>
                            🕐 {r.heure_rdv?.slice(0,5)} · 📋 {r.motif}
                          </p>
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                          <span style={{ fontSize:12, padding:'4px 12px', borderRadius:20, fontWeight:600,
                            background:rb.bg, color:rb.color }}>{label(r.statut)}</span>
                          {r.bon && (
                            <span style={{ fontSize:10, color:'#888', display:'flex', alignItems:'center', gap:3 }}>
                              <CreditCard size={11}/> {r.bon.code_unique}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Onglet Consultations ── */}
        {onglet === 'consultations' && (
          <div>
            {consults.length === 0 ? (
              <div className="empty-state">
                <Stethoscope size={48} color="#ccc"/>
                <p>Aucune consultation enregistrée.</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {consults.map(c => (
                  <div key={c.id} style={{ background:'#fff', border:'1px solid #e5e7eb',
                    borderRadius:10, padding:'16px 20px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:36, height:36, borderRadius:8, background:'#f5eef8',
                            display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <Stethoscope size={16} color="#8e44ad"/>
                          </div>
                          <div>
                            <strong style={{ fontSize:14 }}>{c.medecin?.nom_complet}</strong>
                            <p style={{ fontSize:11, color:'#888', margin:0 }}>
                              {c.medecin?.specialite} · {fmt(c.date_consultation)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize:11, padding:'4px 12px', borderRadius:20, fontWeight:600,
                        background:badge(c.statut).bg, color:badge(c.statut).color }}>
                        {label(c.statut)}
                      </span>
                    </div>

                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      <div style={{ background:'#f8f9fa', borderRadius:8, padding:'10px 12px' }}>
                        <p style={{ fontSize:10, color:'#888', margin:'0 0 4px', fontWeight:600 }}>
                          🔬 DIAGNOSTIC
                        </p>
                        <p style={{ fontSize:13, color:'#333', margin:0 }}>{c.diagnostic}</p>
                      </div>
                      <div style={{ background:'#f8f9fa', borderRadius:8, padding:'10px 12px' }}>
                        <p style={{ fontSize:10, color:'#888', margin:'0 0 4px', fontWeight:600 }}>
                          💊 TRAITEMENT
                        </p>
                        <p style={{ fontSize:13, color:'#333', margin:0 }}>{c.traitement}</p>
                      </div>
                      {c.orientation && (
                        <div style={{ gridColumn:'1/-1', background:'#eaf2fb',
                          borderRadius:8, padding:'10px 12px' }}>
                          <p style={{ fontSize:10, color:'#1F5C9E', margin:'0 0 4px', fontWeight:600 }}>
                            ↪ ORIENTATION
                          </p>
                          <p style={{ fontSize:13, color:'#1F5C9E', margin:0 }}>{c.orientation}</p>
                        </div>
                      )}
                      {c.notes && (
                        <div style={{ gridColumn:'1/-1', background:'#fef9e7',
                          borderRadius:8, padding:'10px 12px' }}>
                          <p style={{ fontSize:10, color:'#9A7D0A', margin:'0 0 4px', fontWeight:600 }}>
                            📝 NOTES
                          </p>
                          <p style={{ fontSize:13, color:'#78350f', margin:0 }}>{c.notes}</p>
                        </div>
                      )}
                    </div>

                    {c.bon && (
                      <div style={{ marginTop:10, padding:'8px 12px', background:'#eafaf1',
                        borderRadius:8, display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#1A7A4A' }}>
                        <CheckCircle size={14}/>
                        Bon de consultation utilisé :
                        <code style={{ fontWeight:700 }}>{c.bon.code_unique}</code>
                        — {c.bon.type_bon?.nom}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Onglet Chronologie ── */}
        {onglet === 'chronologie' && (
          <div>
            {chronologie.length === 0 ? (
              <div className="empty-state">
                <ListOrdered size={48} color="#ccc"/>
                <p>Aucun événement clinique enregistré.</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {chronologie.map((e, idx) => (
                  <div key={`${e.type}-${e.date}-${idx}`} style={{
                    background:'#fff',
                    border:'1px solid #e5e7eb',
                    borderRadius:10,
                    padding:'14px 18px',
                    display:'flex',
                    gap:12,
                    alignItems:'center',
                  }}>
                    <div style={{
                      width:36, height:36, borderRadius:8, background:'#eaf2fb',
                      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                    }}>
                      {e.type === 'paiement' ? <CreditCard size={16} color="#1F5C9E"/> :
                        e.type === 'consultation' ? <Stethoscope size={16} color="#1F5C9E"/> :
                        e.type === 'rendez_vous' ? <CalendarDays size={16} color="#1F5C9E"/> :
                        <FileHeart size={16} color="#1F5C9E"/>}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                        <strong style={{ fontSize:13 }}>{e.titre}</strong>
                        <span style={{ fontSize:11, color:'#888' }}>
                          {fmt(e.date)} {e.heure ? `à ${e.heure}` : ''}
                        </span>
                        {e.statut && (
                          <span style={{
                            fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:600,
                            background:badge(e.statut).bg, color:badge(e.statut).color,
                          }}>
                            {label(e.statut)}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize:12, color:'#666', margin:'4px 0 0' }}>{e.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Onglet Notifications (M3) ── */}
        {onglet === 'notifications' && (
          <div>
            {notifications.length === 0 ? (
              <div className="empty-state">
                <Bell size={48} color="#ccc"/>
                <p>Aucune notification pour le moment.</p>
                <p style={{ fontSize: 12, color: '#aaa' }}>Vous serez notifié(e) lors des changements de statut de vos rendez-vous.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {notifications.map((n, idx) => {
                  const isRecent = new Date(n.created_at) >= new Date(Date.now() - 7 * 24 * 3600 * 1000);
                  const icones = {
                    rendez_vous_confirme:           { icon: <CheckCircle size={16} color="#1A7A4A"/>, bg: '#eafaf1' },
                    rendez_vous_annule:             { icon: <AlertCircle size={16} color="#C0392B"/>, bg: '#fdecea' },
                    rendez_vous_refuse_par_medecin: { icon: <AlertCircle size={16} color="#C0392B"/>, bg: '#fdecea' },
                    rendez_vous_cree:               { icon: <CalendarDays size={16} color="#1F5C9E"/>, bg: '#eaf2fb' },
                    consultation_terminee:          { icon: <Stethoscope size={16} color="#8e44ad"/>, bg: '#f5eef8' },
                  };
                  const style = icones[n.action] || { icon: <Clock size={16} color="#888"/>, bg: '#f5f5f5' };
                  return (
                    <div key={`notif-${idx}`} style={{
                      background: isRecent ? '#fffdf5' : '#fff',
                      border: isRecent ? '1px solid #f0a500' : '1px solid #e5e7eb',
                      borderRadius: 10, padding: '14px 18px',
                      display: 'flex', gap: 12, alignItems: 'flex-start',
                    }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: style.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {style.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <strong style={{ fontSize: 13 }}>{n.description?.split(' — ')[1] || n.action}</strong>
                          {isRecent && <span style={{ fontSize: 10, background: '#f0a500', color: '#fff', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>Nouveau</span>}
                        </div>
                        <p style={{ fontSize: 12, color: '#666', margin: 0 }}>{n.description}</p>
                        <p style={{ fontSize: 11, color: '#aaa', margin: '4px 0 0' }}>
                          {new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default MonDossierMedical;
