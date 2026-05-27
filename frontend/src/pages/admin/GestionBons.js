import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '../../components/Navbar';
import API from '../../api/axios';
import toast from 'react-hot-toast';
import {
  ClipboardList, Search, Filter, CheckCircle, XCircle, Eye,
  RefreshCw, Plus, CalendarDays, TrendingUp, CreditCard, Gift,
  Clock, X,
} from 'lucide-react';

/* ─── Helpers ─────────────────────────────────────────────────────── */
const fmt  = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const fmtn = (n) => new Intl.NumberFormat('fr-FR').format(n || 0);

const BADGE = {
  valide:     { bg:'#eafaf1', color:'#1A7A4A' },
  utilise:    { bg:'#eaf2fb', color:'#1F5C9E' },
  expire:     { bg:'#fdecea', color:'#C0392B' },
  annule:     { bg:'#fdecea', color:'#C0392B' },
  en_attente: { bg:'#fef9e7', color:'#9A7D0A' },
};
const badgeStyle = (s) => BADGE[s] || BADGE.en_attente;

const JOURS_VALIDITE_DEFAUT = 30;

/* ─── Composant ───────────────────────────────────────────────────── */
const GestionBons = () => {
  const [bons, setBons]                   = useState([]);
  const [typesBons, setTypesBons]         = useState([]);
  const [patients, setPatients]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [recherche, setRecherche]         = useState('');
  const [filtre, setFiltre]               = useState('tous');
  const [bonDetail, setBonDetail]         = useState(null);
  const [traitement, setTraitement]       = useState(false);

  // Modals
  const [modalDetail, setModalDetail]     = useState(false);
  const [modalProlonger, setModalProlonger] = useState(false);
  const [modalGenerer, setModalGenerer]   = useState(false);
  const [modalConfirmAnnule, setModalConfirmAnnule] = useState(false);

  // Formulaires
  const [joursProlong, setJoursProlong]   = useState(15);
  const [formGen, setFormGen]             = useState({
    utilisateur_id:'', type_bon_id:'', nb_jours: JOURS_VALIDITE_DEFAUT, notes:'',
  });
  const [loadingGen, setLoadingGen]       = useState(false);

  const chargerBons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/bons?per_page=100');
      setBons((res.data.data?.data) || res.data.data || []);
    } catch {
      toast.error('Impossible de charger les bons.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    chargerBons();
    API.get('/admin/type-bons').then(r => setTypesBons(r.data.data || [])).catch(() => {});
    API.get('/admin/utilisateurs?role=patient&per_page=200').then(r =>
      setPatients((r.data.data?.data) || r.data.data || [])
    ).catch(() => {});

    // Filtre initial depuis localStorage (e.g. venant du dashboard)
    const init = localStorage.getItem('admin_bons_recherche_init');
    if (init) { setRecherche(init); localStorage.removeItem('admin_bons_recherche_init'); }
  }, [chargerBons]);

  /* ── Actions ────────────────────────────────────────────────────── */
  const annulerBon = async (id) => {
    setModalConfirmAnnule(false);
    setTraitement(true);
    try {
      await API.put(`/admin/bons/${id}/annuler`);
      toast.success('Bon annulé.');
      setModalDetail(false);
      chargerBons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.');
    } finally { setTraitement(false); }
  };

  const validerPaiement = async () => {
    if (!bonDetail) return;
    setTraitement(true);
    try {
      await API.post('/admin/bons/valider', { code_unique: bonDetail.code_unique });
      toast.success('Paiement validé. Bon activé.');
      setModalDetail(false);
      chargerBons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.');
    } finally { setTraitement(false); }
  };

  const prolongerBon = async (e) => {
    e.preventDefault();
    if (!bonDetail) return;
    setTraitement(true);
    try {
      await API.put(`/admin/bons/${bonDetail.id_bon}/prolonger`, { jours: Number(joursProlong) });
      toast.success(`Bon prolongé de ${joursProlong} jours.`);
      setModalProlonger(false);
      setModalDetail(false);
      chargerBons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la prolongation.');
    } finally { setTraitement(false); }
  };

  const genererBonDirect = async (e) => {
    e.preventDefault();
    setLoadingGen(true);
    try {
      const res = await API.post('/admin/bons/generer-direct', {
        utilisateur_id: formGen.utilisateur_id,
        type_bon_id:    formGen.type_bon_id,
        nb_jours:       Number(formGen.nb_jours),
        notes:          formGen.notes,
      });
      const bon = res.data.data;
      toast.success(`Bon ${bon.code_unique} généré pour le patient.`);
      setModalGenerer(false);
      setFormGen({ utilisateur_id:'', type_bon_id:'', nb_jours: JOURS_VALIDITE_DEFAUT, notes:'' });
      chargerBons();
    } catch (err) {
      const msg = err.response?.data?.message ||
        Object.values(err.response?.data?.errors || {})[0]?.[0] || 'Erreur.';
      toast.error(msg);
    } finally { setLoadingGen(false); }
  };

  /* ── Filtre local ────────────────────────────────────────────────── */
  const bonsFiltres = bons.filter(b => {
    const matchFiltre = filtre === 'tous' || b.statut === filtre;
    const nom    = (b.utilisateur?.nom    || b.patient?.nom    || '').toLowerCase();
    const prenom = (b.utilisateur?.prenom || b.patient?.prenom || '').toLowerCase();
    const q = recherche.toLowerCase();
    const matchRecherche = b.code_unique?.toLowerCase().includes(q)
      || nom.includes(q) || prenom.includes(q)
      || b.utilisateur?.numero_patient?.toLowerCase().includes(q);
    return matchFiltre && matchRecherche;
  });

  /* ── Stats rapides ───────────────────────────────────────────────── */
  const statsRapides = {
    total:      bons.length,
    valides:    bons.filter(b => b.statut === 'valide').length,
    utilises:   bons.filter(b => b.statut === 'utilise').length,
    expires:    bons.filter(b => b.statut === 'expire').length,
    attente:    bons.filter(b => b.statut === 'en_attente').length,
    montant:    bons.reduce((s, b) => s + (b.type_bon?.prix || 0), 0),
  };

  const expirantBientot = bons.filter(b => {
    if (b.statut !== 'valide') return false;
    const diff = (new Date(b.date_expiration) - new Date()) / 86400000;
    return diff >= 0 && diff <= 5;
  }).length;

  if (loading) return <div className="loading">Chargement des bons...</div>;

  return (
    <div className="layout">
      <Navbar />
      <div className="main-content">

        {/* En-tête */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, margin:0 }}>
              <ClipboardList size={22} style={{ verticalAlign:'middle', marginRight:8 }}/>
              Gestion des bons de consultation
            </h1>
            <p style={{ color:'#888', margin:'4px 0 0', fontSize:13 }}>
              Consultez, gérez, prolongez et générez des bons.
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setModalGenerer(true)}>
            <Gift size={14}/> Générer un bon direct
          </button>
        </div>

        {/* Alerte expiration */}
        {expirantBientot > 0 && (
          <div style={{ background:'#fef9e7', border:'1px solid #F1C40F', borderRadius:10,
            padding:'10px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
            <Clock size={16} color="#E67E22"/>
            <strong style={{ fontSize:13, color:'#9A7D0A' }}>
              {expirantBientot} bon(s) expirent dans moins de 5 jours.
            </strong>
            <button onClick={() => { setFiltre('valide'); setRecherche(''); }}
              style={{ marginLeft:'auto', background:'none', border:'1px solid #E67E22',
                color:'#E67E22', padding:'3px 10px', borderRadius:6, cursor:'pointer', fontSize:11 }}>
              Voir les valides →
            </button>
          </div>
        )}

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px,1fr))', gap:12, marginBottom:20 }}>
          {[
            { label:'Total', val:statsRapides.total, color:'#1F5C9E', bg:'#eaf2fb', icon:<CreditCard size={18}/> },
            { label:'Valides', val:statsRapides.valides, color:'#1A7A4A', bg:'#eafaf1', icon:<CheckCircle size={18}/> },
            { label:'Utilisés', val:statsRapides.utilises, color:'#2980B9', bg:'#eaf2fb', icon:<TrendingUp size={18}/> },
            { label:'Expirés', val:statsRapides.expires, color:'#C0392B', bg:'#fdecea', icon:<XCircle size={18}/> },
            { label:'En attente', val:statsRapides.attente, color:'#E67E22', bg:'#fef5e7', icon:<Clock size={18}/> },
          ].map(s => (
            <div key={s.label} onClick={() => setFiltre(s.label === 'Total' ? 'tous' : s.label.toLowerCase().replace('é','e').replace('és','es'))}
              style={{ background:'#fff', border:`1px solid ${s.bg}`, borderRadius:10, padding:'14px 16px',
                cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', transition:'box-shadow .15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.05)'}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <div style={{ background:s.bg, borderRadius:6, padding:4 }}>
                  {React.cloneElement(s.icon, { color:s.color })}
                </div>
              </div>
              <p style={{ fontSize:22, fontWeight:800, color:s.color, margin:0 }}>{s.val}</p>
              <p style={{ fontSize:11, color:'#888', margin:0 }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div className="card">
          {/* Filtres */}
          <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ position:'relative', flex:1, minWidth:200 }}>
              <Search size={15} style={{ position:'absolute', left:10, top:'50%',
                transform:'translateY(-50%)', color:'#888' }}/>
              <input style={{ paddingLeft:34, width:'100%', padding:'9px 9px 9px 34px',
                border:'1px solid #ddd', borderRadius:6, fontSize:13, boxSizing:'border-box' }}
                placeholder="Code, patient, N° patient..."
                value={recherche} onChange={e => setRecherche(e.target.value)} />
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Filter size={15} color="#888"/>
              <select value={filtre} onChange={e => setFiltre(e.target.value)}
                style={{ padding:'9px 12px', border:'1px solid #ddd', borderRadius:6, fontSize:13 }}>
                <option value="tous">Tous les statuts</option>
                <option value="valide">Valide</option>
                <option value="utilise">Utilisé</option>
                <option value="expire">Expiré</option>
                <option value="annule">Annulé</option>
                <option value="en_attente">En attente</option>
              </select>
            </div>
            <button className="btn btn-outline btn-sm" onClick={chargerBons}>
              <RefreshCw size={14}/> Actualiser
            </button>
            <span style={{ fontSize:12, color:'#888', marginLeft:'auto' }}>
              {bonsFiltres.length} bon(s)
            </span>
          </div>

          {/* Tableau */}
          {bonsFiltres.length === 0 ? (
            <div className="empty-state">
              <ClipboardList size={40} color="#ccc"/>
              <p>Aucun bon trouvé pour ce filtre.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Code unique</th>
                  <th>Patient</th>
                  <th>Type de bon</th>
                  <th>Spécialité</th>
                  <th>Montant</th>
                  <th>Achat</th>
                  <th>Expiration</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bonsFiltres.map(b => {
                  const bs   = badgeStyle(b.statut);
                  const pat  = b.utilisateur || b.patient;
                  const jRestants = Math.ceil((new Date(b.date_expiration) - new Date()) / 86400000);
                  const bientot  = b.statut === 'valide' && jRestants >= 0 && jRestants <= 5;
                  return (
                    <tr key={b.id_bon} style={{ background: bientot ? '#fffdf0' : '' }}>
                      <td>
                        <code style={{ background:'#f4f4f4', padding:'2px 7px',
                          borderRadius:4, fontSize:11 }}>{b.code_unique}</code>
                        {bientot && <span style={{ marginLeft:6, fontSize:10,
                          color:'#E67E22', fontWeight:700 }}>⚠ {jRestants}j</span>}
                      </td>
                      <td>
                        <div>
                          <p style={{ margin:0, fontSize:13, fontWeight:600 }}>
                            {pat?.prenom} {pat?.nom}
                          </p>
                          <p style={{ margin:0, fontSize:10, color:'#888' }}>
                            {pat?.numero_patient}
                          </p>
                        </div>
                      </td>
                      <td>{b.type_bon?.nom}</td>
                      <td style={{ fontSize: 12 }}>{b.type_bon?.specialite || '—'}</td>
                      <td><strong>{fmtn(b.type_bon?.prix)} FCFA</strong></td>
                      <td>{fmt(b.date_achat)}</td>
                      <td style={{ color: bientot ? '#E67E22' : '' }}>
                        {fmt(b.date_expiration)}
                      </td>
                      <td>
                        <span style={{ ...bs, padding:'3px 10px', borderRadius:20,
                          fontSize:11, fontWeight:700 }}>{b.statut}</span>
                      </td>
                      <td>
                        <button className="btn btn-primary btn-sm"
                          onClick={() => { setBonDetail(b); setModalDetail(true); }}>
                          <Eye size={13}/> Gérer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Modal détail + actions ─────────────────────────────────── */}
        {modalDetail && bonDetail && (
          <div className="modal-overlay" onClick={() => setModalDetail(false)}>
            <div className="modal" style={{ maxWidth:560 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3><Eye size={16}/> Bon — {bonDetail.code_unique}</h3>
                <button className="modal-close" onClick={() => setModalDetail(false)}><X size={16}/></button>
              </div>

              {/* Statut badge central */}
              <div style={{ textAlign:'center', marginBottom:20 }}>
                <span style={{ ...badgeStyle(bonDetail.statut), padding:'6px 20px',
                  borderRadius:20, fontSize:14, fontWeight:800 }}>
                  {bonDetail.statut?.toUpperCase()}
                </span>
                {bonDetail.statut === 'valide' && (() => {
                  const j = Math.ceil((new Date(bonDetail.date_expiration) - new Date()) / 86400000);
                  return j >= 0 ? (
                    <p style={{ fontSize:11, color: j <= 5 ? '#E67E22' : '#888', margin:'6px 0 0' }}>
                      Expire dans {j} jour(s) ({fmt(bonDetail.date_expiration)})
                    </p>
                  ) : null;
                })()}
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
                {[
                  ['Code',       bonDetail.code_unique],
                  ['Patient',    `${bonDetail.utilisateur?.prenom || '—'} ${bonDetail.utilisateur?.nom || ''}`],
                  ['N° Patient', bonDetail.utilisateur?.numero_patient || '—'],
                  ['Téléphone',  bonDetail.utilisateur?.telephone || '—'],
                  ['Type',       bonDetail.type_bon?.nom || '—'],
                  ['Spécialité', bonDetail.type_bon?.specialite || '—'],
                  ['Montant',    `${fmtn(bonDetail.type_bon?.prix)} FCFA`],
                  ['Date achat', fmt(bonDetail.date_achat)],
                  ['Expiration', fmt(bonDetail.date_expiration)],
                  ['Mode pmt',   bonDetail.transaction?.mode_paiement || 'Direct admin'],
                  ['Réf.',       bonDetail.transaction?.reference_mobile_money || '—'],
                ].map(([l, v]) => (
                  <div key={l} style={{ background:'#f8f9fa', borderRadius:6, padding:'8px 10px' }}>
                    <p style={{ fontSize:10, color:'#888', margin:0 }}>{l}</p>
                    <p style={{ fontSize:12, fontWeight:700, color:'#333', margin:0 }}>{v}</p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', flexWrap:'wrap' }}>
                {bonDetail.statut === 'en_attente' && bonDetail.transaction && (
                  <button className="btn btn-success btn-sm" disabled={traitement}
                    onClick={validerPaiement}>
                    <CheckCircle size={13}/> {traitement ? '...' : 'Valider paiement'}
                  </button>
                )}
                {(bonDetail.statut === 'valide' || bonDetail.statut === 'expire') && (
                  <button className="btn btn-outline btn-sm"
                    onClick={() => { setModalDetail(false); setJoursProlong(15); setModalProlonger(true); }}>
                    <CalendarDays size={13}/> Prolonger
                  </button>
                )}
                {bonDetail.statut === 'valide' && (
                  <button className="btn btn-danger btn-sm" disabled={traitement}
                    onClick={() => setModalConfirmAnnule(true)}>
                    <XCircle size={13}/> {traitement ? '...' : 'Annuler'}
                  </button>
                )}
                <button className="btn btn-secondary btn-sm" onClick={() => setModalDetail(false)}>
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal Prolonger ───────────────────────────────────────── */}
        {modalProlonger && bonDetail && (
          <div className="modal-overlay" onClick={() => setModalProlonger(false)}>
            <div className="modal" style={{ maxWidth:380 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3><CalendarDays size={16}/> Prolonger le bon</h3>
                <button className="modal-close" onClick={() => setModalProlonger(false)}><X size={16}/></button>
              </div>
              <p style={{ fontSize:13, color:'#555', marginBottom:16 }}>
                Bon <code>{bonDetail.code_unique}</code> — actuellement expirant le <strong>{fmt(bonDetail.date_expiration)}</strong>
              </p>
              <form onSubmit={prolongerBon}>
                <div className="form-group">
                  <label>Nombre de jours à ajouter *</label>
                  <input type="number" min={1} max={365} required value={joursProlong}
                    onChange={e => setJoursProlong(e.target.value)} />
                  <small style={{ fontSize:11, color:'#888' }}>
                    Nouvelle expiration prévue : <strong>{
                      new Date(new Date(bonDetail.date_expiration) > new Date()
                        ? new Date(bonDetail.date_expiration).getTime() + joursProlong * 86400000
                        : new Date().getTime() + joursProlong * 86400000
                      ).toLocaleDateString('fr-FR')
                    }</strong>
                  </small>
                </div>
                <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:14 }}>
                  <button type="button" className="btn btn-secondary btn-sm"
                    onClick={() => setModalProlonger(false)}>Annuler</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={traitement}>
                    <CalendarDays size={13}/> {traitement ? '...' : 'Prolonger'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modal Générer bon direct ─────────────────────────────── */}
        {modalGenerer && (
          <div className="modal-overlay" onClick={() => setModalGenerer(false)}>
            <div className="modal" style={{ maxWidth:480 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3><Gift size={16}/> Générer un bon direct</h3>
                <button className="modal-close" onClick={() => setModalGenerer(false)}><X size={16}/></button>
              </div>
              <p style={{ fontSize:12, color:'#888', marginBottom:16 }}>
                Créez un bon directement pour un patient sans paiement mobile (ex: prise en charge, don, correction).
              </p>
              <form onSubmit={genererBonDirect}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 14px' }}>
                  <div className="form-group" style={{ gridColumn:'1/-1' }}>
                    <label>Patient *</label>
                    <select required value={formGen.utilisateur_id}
                      onChange={e => setFormGen({...formGen, utilisateur_id:e.target.value})}>
                      <option value="">-- Sélectionner un patient --</option>
                      {patients.map(p => (
                        <option key={p.id_utilisateur} value={p.id_utilisateur}>
                          {p.prenom} {p.nom} ({p.numero_patient || p.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn:'1/-1' }}>
                    <label>Type de bon *</label>
                    <select required value={formGen.type_bon_id}
                      onChange={e => setFormGen({...formGen, type_bon_id:e.target.value})}>
                      <option value="">-- Choisir le type --</option>
                      {typesBons
                        .filter((t) => (t.specialite || '').trim())
                        .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nom} — {t.specialite} — {fmtn(t.prix)} FCFA
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Durée de validité (jours) *</label>
                    <input type="number" min={1} max={365} required value={formGen.nb_jours}
                      onChange={e => setFormGen({...formGen, nb_jours:e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Note / Raison</label>
                    <input type="text" value={formGen.notes}
                      onChange={e => setFormGen({...formGen, notes:e.target.value})}
                      placeholder="Ex: Prise en charge, correction..." />
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
                  <button type="button" className="btn btn-secondary btn-sm"
                    onClick={() => setModalGenerer(false)}>Annuler</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={loadingGen}>
                    <Plus size={13}/> {loadingGen ? '...' : 'Générer le bon'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modale confirmation annulation ─────────────────────── */}
        {modalConfirmAnnule && bonDetail && (
          <div className="modal-overlay" onClick={() => setModalConfirmAnnule(false)}>
            <div className="modal" style={{ maxWidth:400 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3><XCircle size={16} color="#C0392B"/> Confirmer l'annulation</h3>
                <button className="modal-close" onClick={() => setModalConfirmAnnule(false)}><X size={16}/></button>
              </div>
              <div style={{ padding:'8px 0 16px' }}>
                <p style={{ fontSize:14, color:'#333', marginBottom:8 }}>
                  Vous allez annuler le bon <strong><code>{bonDetail.code_unique}</code></strong>.
                </p>
                <div style={{ padding:'10px 14px', borderRadius:8, background:'#fdecea', border:'1px solid #e74c3c', fontSize:13, color:'#C0392B' }}>
                  ⚠️ Cette action est <strong>irréversible</strong>. Le patient ne pourra plus utiliser ce bon.
                </div>
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setModalConfirmAnnule(false)}>Annuler</button>
                <button className="btn btn-danger btn-sm" disabled={traitement}
                  onClick={() => annulerBon(bonDetail.id_bon)}>
                  <XCircle size={13}/> {traitement ? '...' : 'Confirmer l\'annulation'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default GestionBons;