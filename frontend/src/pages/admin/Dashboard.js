import React, { useEffect, useState, useCallback } from 'react';
import {
  CalendarDays, Stethoscope, Users, CreditCard, TrendingUp,
  AlertTriangle, Clock, CheckCircle, BarChart2, RefreshCw,
  ArrowRight, Activity, UserCheck,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import API from '../../api/axios';

const fmt  = (n) => new Intl.NumberFormat('fr-FR').format(n || 0);
const today = () => new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
const extraireData = (payload) => payload?.data?.data ?? payload?.data ?? payload ?? {};

const KPI = ({ icon, label, value, sub, color = '#1F5C9E', bg = '#eaf2fb', onClick }) => (
  <div onClick={onClick}
    style={{
      background:'#fff', border:`1px solid ${bg}`, borderRadius:12, padding:'20px 22px',
      display:'flex', alignItems:'center', gap:16, boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
      cursor: onClick ? 'pointer' : 'default',
      transition:'transform .15s, box-shadow .15s',
    }}
    onMouseEnter={e => { if(onClick){ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.1)'; }}}
    onMouseLeave={e => { if(onClick){ e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'; }}}
  >
    <div style={{ width:50,height:50,borderRadius:12,background:bg,display:'flex',
      alignItems:'center',justifyContent:'center',flexShrink:0 }}>
      {React.cloneElement(icon, { size:24, color })}
    </div>
    <div style={{ flex:1 }}>
      <p style={{ fontSize:26,fontWeight:800,color:'#111',margin:0,lineHeight:1 }}>{value}</p>
      <p style={{ fontSize:12,color:'#888',margin:'3px 0 0',fontWeight:500 }}>{label}</p>
      {sub && <p style={{ fontSize:11,color,margin:'2px 0 0',fontWeight:600 }}>{sub}</p>}
    </div>
    {onClick && <ArrowRight size={16} color="#ccc"/>}
  </div>
);

const StatusPill = ({ statut }) => {
  const map = {
    en_attente: { bg:'#fef9e7',color:'#9A7D0A',  label:'En attente', dot:'#F1C40F' },
    confirme:   { bg:'#eaf2fb',color:'#1F5C9E',  label:'Confirmé',   dot:'#2E86DE' },
    termine:    { bg:'#eafaf1',color:'#1A7A4A',  label:'Terminé',    dot:'#27AE60' },
    annule:     { bg:'#fdecea',color:'#C0392B',  label:'Annulé',     dot:'#E74C3C' },
  };
  const s = map[statut] || map.en_attente;
  return (
    <span style={{ background:s.bg,color:s.color,padding:'3px 10px',borderRadius:20,
      fontSize:11,fontWeight:700,display:'inline-flex',alignItems:'center',gap:4 }}>
      <span style={{ width:6,height:6,borderRadius:'50%',background:s.dot,display:'inline-block' }}/>
      {s.label}
    </span>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats]     = useState({});
  const [flux, setFlux]       = useState({});
  const [loading, setLoading] = useState(true);

  const charger = useCallback(async () => {
    try {
      const [statsRes, fluxRes] = await Promise.allSettled([
        API.get('/admin/tableau-bord'),
        API.get('/admin/flux-du-jour'),
      ]);

      const statsOk = statsRes.status === 'fulfilled';
      const fluxOk = fluxRes.status === 'fulfilled';

      if (statsOk) setStats(extraireData(statsRes.value.data));
      if (fluxOk) setFlux(extraireData(fluxRes.value.data));

      if (!statsOk && !fluxOk) {
        toast.error('Erreur de chargement du tableau de bord.');
      }
    } catch {
      toast.error('Erreur de chargement du tableau de bord.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    charger();
    const interval = setInterval(charger, 60000); // refresh auto 1min
    return () => clearInterval(interval);
  }, [charger]);

  const changerStatutRdv = async (id, statut) => {
    try {
      await API.put(`/admin/rendez-vous/${id}/statut`, { statut });
      toast.success('Statut mis à jour.');
      charger();
    } catch { toast.error('Erreur.'); }
  };

  if (loading) return <div className="loading"><Activity size={24} color="#1F5C9E"/> Chargement du tableau de bord...</div>;

  const taux = stats?.rdv_aujourd_hui > 0
    ? Math.round((stats.rdv_termines / stats.rdv_aujourd_hui) * 100)
    : 0;

  return (
    <div className="layout">
      <Navbar />
      <div className="main-content">

        {/* En-tête */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
          <div>
            <h1 style={{ fontSize:22,fontWeight:800,color:'#111',margin:0 }}>
              🏥 Tableau de bord clinique
            </h1>
            <p style={{ color:'#888',margin:'4px 0 0',fontSize:13,textTransform:'capitalize' }}>
              {today()} · Taux de réalisation : <strong style={{ color:'#27AE60' }}>{taux}%</strong>
            </p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={charger} className="btn btn-outline btn-sm">
              <RefreshCw size={14}/> Actualiser
            </button>
            <button onClick={() => navigate('/admin/reception')} className="btn btn-primary btn-sm">
              🚪 Accueillir un patient
            </button>
          </div>
        </div>

        {/* Alerte bons expirant */}
        {stats?.bons_expirant_bientot > 0 && (
          <div style={{ background:'#fef9e7',border:'1px solid #F1C40F',borderRadius:10,
            padding:'12px 18px',marginBottom:20,display:'flex',alignItems:'center',gap:10 }}>
            <AlertTriangle size={18} color="#E67E22"/>
            <strong style={{ fontSize:13,color:'#9A7D0A' }}>
              {stats.bons_expirant_bientot} bon(s) expirent dans les 3 prochains jours.
            </strong>
            <button onClick={() => navigate('/admin/bons')}
              style={{ marginLeft:'auto',background:'none',border:'1px solid #E67E22',
                color:'#E67E22',padding:'4px 12px',borderRadius:6,cursor:'pointer',fontSize:12 }}>
              Voir →
            </button>
          </div>
        )}

        {/* KPIs opérationnels du jour */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:14, marginBottom:24 }}>
          <KPI icon={<CalendarDays/>} label="RDV aujourd'hui"
            value={stats?.rdv_aujourd_hui ?? 0}
            sub={`${stats?.rdv_termines ?? 0} terminés`}
            color="#1F5C9E" bg="#eaf2fb"
            onClick={() => navigate('/admin/salle-attente')} />
          <KPI icon={<Clock/>} label="En attente"
            value={stats?.rdv_en_attente ?? 0}
            color="#E67E22" bg="#fef5e7"
            onClick={() => navigate('/admin/salle-attente')} />
          <KPI icon={<Stethoscope/>} label="Consultations du jour"
            value={stats?.consultations_jour ?? 0}
            color="#8e44ad" bg="#f5eef8" />
          <KPI icon={<Users/>} label="Patients inscrits"
            value={stats?.total_patients ?? 0}
            sub={`${stats?.total_dossiers ?? 0} dossiers`}
            color="#27ae60" bg="#eafaf1"
            onClick={() => navigate('/admin/utilisateurs')} />
          <KPI icon={<CreditCard/>} label="Bons valides"
            value={stats?.bons_valides ?? 0}
            sub={`${stats?.bons_utilises ?? 0} utilisés`}
            color="#16a085" bg="#e8f8f5" />
          <KPI icon={<TrendingUp/>} label="Revenus du mois"
            value={`${fmt(stats?.revenus_mois)} F`}
            sub={`${fmt(stats?.revenus_today)} F aujourd'hui`}
            color="#2980b9" bg="#eaf2fb" />
        </div>

        {/* Médecins présents aujourd'hui */}
        {stats?.medecins_du_jour?.length > 0 && (
          <div className="card" style={{ marginBottom:20 }}>
            <div className="card-header">
              <h2><UserCheck size={16} color="#1F5C9E"/> Médecins en service aujourd'hui</h2>
              <span className="badge badge-valide">{stats.medecins_du_jour.length}</span>
            </div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {stats.medecins_du_jour.map(m => (
                <div key={m.id} style={{ background:'#f8f9fa',borderRadius:8,padding:'10px 14px',
                  display:'flex',alignItems:'center',gap:10,border:'1px solid #eee' }}>
                  <div style={{ width:34,height:34,borderRadius:8,background:'#eaf2fb',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontWeight:700,fontSize:12,color:'#1F5C9E',flexShrink:0 }}>
                    {m.prenom?.charAt(0)}{m.nom?.charAt(0)}
                  </div>
                  <div>
                    <p style={{ fontSize:13,fontWeight:600,margin:0 }}>Dr {m.prenom} {m.nom}</p>
                    <p style={{ fontSize:11,color:'#888',margin:0 }}>
                      {m.specialite} · <strong style={{ color:'#1F5C9E' }}>{m.rdv_jour}</strong> RDV
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Flux du jour + Graphique */}
        <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:20, marginBottom:20 }}>

          {/* Graphique */}
          <div className="card">
            <div className="card-header">
              <h2><BarChart2 size={16} color="#1F5C9E"/> Activité des 6 derniers mois</h2>
            </div>
            <div style={{ width:'100%', height:260 }}>
              {stats?.ventes_mensuelles ? (
                <ResponsiveContainer>
                  <BarChart data={stats.ventes_mensuelles} barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill:'#888', fontSize:11 }}/>
                    <YAxis axisLine={false} tickLine={false} tick={{ fill:'#888', fontSize:11 }}
                      tickFormatter={v => v >= 1000 ? `${v/1000}k` : v}/>
                    <Tooltip contentStyle={{ borderRadius:8, border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}
                      formatter={(val, name) => [
                        name === 'revenus' ? `${fmt(val)} FCFA` : val,
                        name === 'revenus' ? 'Revenus' : 'Consultations'
                      ]}/>
                    <Legend iconType="circle" iconSize={8}/>
                    <Bar dataKey="revenus" fill="#1F5C9E" radius={[4,4,0,0]} name="revenus"/>
                    <Bar dataKey="consultations" fill="#27AE60" radius={[4,4,0,0]} name="consultations"/>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="empty-state">Pas de données</div>}
            </div>
          </div>

          {/* Salle d'attente mini */}
          <div className="card">
            <div className="card-header">
              <h2><Clock size={16} color="#E67E22"/> File d'attente</h2>
              <button onClick={() => navigate('/admin/salle-attente')}
                style={{ background:'none',border:'none',color:'#1F5C9E',cursor:'pointer',fontSize:12,
                  display:'flex',alignItems:'center',gap:4 }}>
                Voir tout <ArrowRight size={13}/>
              </button>
            </div>
            {(!flux?.tous_rdv || flux.tous_rdv.length === 0) ? (
              <div className="empty-state" style={{ padding:'30px 0' }}>
                <CheckCircle size={32} color="#ccc"/>
                <p style={{ fontSize:12 }}>Aucun patient aujourd'hui</p>
              </div>
            ) : (
              <div style={{ maxHeight:230, overflowY:'auto', display:'flex', flexDirection:'column', gap:6 }}>
                {flux.tous_rdv.slice(0,8).map(r => (
                  <div key={r.id} style={{ display:'flex',alignItems:'center',gap:8,
                    padding:'8px 10px',borderRadius:8,background:'#f8f9fa' }}>
                    <span style={{ fontSize:12,fontWeight:700,color:'#1F5C9E',minWidth:38 }}>
                      {r.heure_rdv?.slice(0,5)}
                    </span>
                    <div style={{ flex:1,overflow:'hidden' }}>
                      <p style={{ fontSize:12,fontWeight:600,margin:0,
                        whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>
                        {r.utilisateur?.prenom} {r.utilisateur?.nom}
                      </p>
                      <p style={{ fontSize:10,color:'#888',margin:0 }}>{r.medecin?.specialite}</p>
                    </div>
                    <StatusPill statut={r.statut}/>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Flux par médecin */}
        {flux?.par_medecin?.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h2><Stethoscope size={16} color="#1F5C9E"/> Flux par médecin aujourd'hui</h2>
              <button onClick={() => navigate('/admin/salle-attente')} className="btn btn-outline btn-sm">
                Gérer la salle d'attente <ArrowRight size={13}/>
              </button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:14 }}>
              {flux.par_medecin.map(g => (
                <div key={g.medecin?.id}
                  style={{ border:'1px solid #eee',borderRadius:10,overflow:'hidden' }}>
                  {/* En-tête médecin */}
                  <div style={{ background:'#1F5C9E',color:'#fff',padding:'10px 14px',
                    display:'flex',alignItems:'center',gap:8 }}>
                    <div style={{ width:30,height:30,borderRadius:6,background:'rgba(255,255,255,0.2)',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:11,fontWeight:700 }}>
                      {g.medecin?.prenom?.charAt(0)}{g.medecin?.nom?.charAt(0)}
                    </div>
                    <div>
                      <p style={{ fontSize:12,fontWeight:700,margin:0 }}>Dr {g.medecin?.prenom} {g.medecin?.nom}</p>
                      <p style={{ fontSize:10,opacity:0.8,margin:0 }}>{g.medecin?.specialite}</p>
                    </div>
                    <div style={{ marginLeft:'auto',display:'flex',gap:6 }}>
                      {[
                        { k:'en_attente', bg:'#F39C12', v:g.stats.en_attente },
                        { k:'confirme',   bg:'#2980B9', v:g.stats.confirme   },
                        { k:'termine',    bg:'#27AE60', v:g.stats.termine    },
                      ].map(s => s.v > 0 && (
                        <span key={s.k} style={{ background:s.bg,color:'#fff',padding:'2px 7px',
                          borderRadius:20,fontSize:10,fontWeight:700 }}>{s.v}</span>
                      ))}
                    </div>
                  </div>
                  {/* Liste patients */}
                  <div style={{ maxHeight:160,overflowY:'auto' }}>
                    {g.rendez_vous.slice(0,5).map(r => (
                      <div key={r.id} style={{ display:'flex',alignItems:'center',gap:8,
                        padding:'8px 12px',borderBottom:'1px solid #f5f5f5' }}>
                        <span style={{ fontSize:11,fontWeight:700,color:'#1F5C9E',minWidth:36 }}>
                          {r.heure_rdv?.slice(0,5)}
                        </span>
                        <span style={{ fontSize:12,flex:1 }}>
                          {r.utilisateur?.prenom} {r.utilisateur?.nom}
                        </span>
                        {r.statut === 'en_attente' && (
                          <button onClick={() => changerStatutRdv(r.id, 'confirme')}
                            style={{ background:'#eaf2fb',color:'#1F5C9E',border:'none',
                              borderRadius:4,padding:'2px 8px',cursor:'pointer',fontSize:10 }}>
                            → Appeler
                          </button>
                        )}
                        {r.statut === 'confirme' && (
                          <button onClick={() => changerStatutRdv(r.id, 'termine')}
                            style={{ background:'#eafaf1',color:'#1A7A4A',border:'none',
                              borderRadius:4,padding:'2px 8px',cursor:'pointer',fontSize:10 }}>
                            ✓ Terminé
                          </button>
                        )}
                        {(r.statut === 'termine' || r.statut === 'annule') && (
                          <StatusPill statut={r.statut}/>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;