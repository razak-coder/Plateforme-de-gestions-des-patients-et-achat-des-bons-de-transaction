import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '../../components/Navbar';
import API from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Users, Search, UserCheck, UserX, Eye, RefreshCw,
  Plus, X, Lock, CreditCard, FileHeart, Key,
  AlertTriangle, CheckCircle, Stethoscope,
} from 'lucide-react';

const FORM_VIDE = {
  prenom:'', nom:'', email:'', telephone:'', password:'Ctm@2026',
  role:'patient', medecin_id:'', date_naissance:'', sexe:'', groupe_sanguin:'', adresse:'',
};

const fmt = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

const GestionUsers = () => {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [recherche, setRecherche]       = useState('');
  const [filtre, setFiltre]             = useState('tous');

  // Modals
  const [modalCreation, setModalCreation] = useState(false);
  const [modalReset, setModalReset]     = useState(false);
  const [modalProfil, setModalProfil]   = useState(false);

  const [userDetail, setUserDetail]     = useState(null);
  const [profilStats, setProfilStats]   = useState(null);
  const [loadingProfil, setLoadingProfil] = useState(false);

  const [formPatient, setFormPatient]   = useState(FORM_VIDE);
  const [medecins, setMedecins]         = useState([]);
  const [nouveauMdp, setNouveauMdp]     = useState('');
  const [mdpGenere, setMdpGenere]       = useState(null);
  const [traitement, setTraitement]     = useState(false);

  /* ── Chargement ─────────────────────────────────────────────── */
  const chargerUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/utilisateurs?per_page=100');
      setUtilisateurs((res.data.data?.data) || res.data.data || []);
    } catch { toast.error('Impossible de charger les utilisateurs.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { chargerUsers(); }, [chargerUsers]);

  useEffect(() => {
    if (!modalCreation) return;
    (async () => {
      try {
        const res = await API.get('/admin/medecins?per_page=200');
        const list = res.data?.data?.data ?? res.data?.data ?? [];
        setMedecins((list || []).filter((m) => m.statut === 'actif'));
      } catch {
        setMedecins([]);
      }
    })();
  }, [modalCreation]);

  /* ── Ouvrir profil complet ────────────────────────────────── */
  const ouvrirProfil = async (u) => {
    setUserDetail(u);
    setModalProfil(true);
    setLoadingProfil(true);
    setProfilStats(null);
    try {
      const res = await API.get(`/admin/utilisateurs/${u.id_utilisateur}`);
      setProfilStats(res.data.stats);
    } catch { toast.error('Impossible de charger le profil complet.'); }
    finally { setLoadingProfil(false); }
  };

  /* ── Activer / Désactiver ─────────────────────────────────── */
  const toggleStatut = async (u) => {
    const nowActif = !u.actif;
    if (!window.confirm(`${nowActif ? 'Activer' : 'Désactiver'} ce compte ?`)) return;
    setTraitement(true);
    try {
      // Envoyer la valeur de statut directement (colonne DB = statut varchar)
      await API.put(`/admin/utilisateurs/${u.id_utilisateur}`, {
        statut: nowActif ? 'actif' : 'inactif',
      });
      toast.success(`Compte ${nowActif ? 'activé' : 'désactivé'}.`);
      setModalProfil(false);
      chargerUsers();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur.'); }
    finally { setTraitement(false); }
  };

  /* ── Créer patient ────────────────────────────────────────── */
  const creerPatient = async (e) => {
    e.preventDefault();
    setTraitement(true);
    try {
      const payload = { ...formPatient };
      if (formPatient.role === 'medecin') {
        payload.medecin_id = formPatient.medecin_id || null;
      } else {
        delete payload.medecin_id;
      }
      const res = await API.post('/admin/utilisateurs', payload);
      const u   = res.data.data;
      toast.success(res.data.message || `Compte ${u.prenom} ${u.nom} créé.`);
      setModalCreation(false);
      setFormPatient(FORM_VIDE);
      chargerUsers();
    } catch (err) {
      const msg = err.response?.data?.message ||
        Object.values(err.response?.data?.errors || {})[0]?.[0] || 'Erreur.';
      toast.error(msg);
    } finally { setTraitement(false); }
  };

  /* ── Reset mot de passe ───────────────────────────────────── */
  const resetMdp = async (e) => {
    e.preventDefault();
    setTraitement(true);
    setMdpGenere(null);
    try {
      const res = await API.post(
        `/admin/utilisateurs/${userDetail.id_utilisateur}/reset-password`,
        nouveauMdp ? { nouveau_mot_de_passe: nouveauMdp } : {}
      );
      setMdpGenere(res.data.mot_de_passe_temp);
      toast.success('Mot de passe réinitialisé. Le patient devra le changer à la prochaine connexion.');
      setNouveauMdp('');
      chargerUsers();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur.'); }
    finally { setTraitement(false); }
  };

  /* ── Filtre local ─────────────────────────────────────────── */
  const usersFiltres = utilisateurs.filter(u => {
    const matchRole   = filtre === 'tous' || u.role === filtre ||
      (filtre === 'actif' && u.actif) || (filtre === 'inactif' && !u.actif) ||
      (filtre === 'mdp'   && u.doit_changer_mdp) ||
      (filtre === 'medecin' && u.role === 'medecin');
    const q = recherche.toLowerCase();
    const matchSearch = !q || u.nom?.toLowerCase().includes(q) ||
      u.prenom?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) ||
      u.numero_patient?.toLowerCase().includes(q) || u.telephone?.includes(q);
    return matchRole && matchSearch;
  });

  const nbMdpForce = utilisateurs.filter(u => u.doit_changer_mdp).length;

  if (loading) return <div className="loading">Chargement des utilisateurs...</div>;

  return (
    <div className="layout">
      <Navbar />
      <div className="main-content">

        {/* En-tête */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, margin:0 }}>
              <Users size={22} style={{ verticalAlign:'middle', marginRight:8 }}/>
              Comptes utilisateurs
            </h1>
            <p style={{ color:'#888', margin:'4px 0 0', fontSize:13 }}>
              {utilisateurs.length} compte(s) · {utilisateurs.filter(u=>u.role==='patient').length} patients
              {' · '}{utilisateurs.filter(u=>u.role==='medecin').length} praticien(s)
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setModalCreation(true)}>
            <Plus size={14}/> Nouveau compte
          </button>
        </div>

        {/* Alerte mdp à changer */}
        {nbMdpForce > 0 && (
          <div style={{ background:'#fef9e7', border:'1px solid #F1C40F', borderRadius:10,
            padding:'10px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
            <AlertTriangle size={16} color="#E67E22"/>
            <strong style={{ fontSize:13, color:'#9A7D0A' }}>
              {nbMdpForce} compte(s) n'ont pas encore changé leur mot de passe temporaire.
            </strong>
            <button onClick={() => setFiltre('mdp')}
              style={{ marginLeft:'auto', background:'none', border:'1px solid #E67E22',
                color:'#E67E22', padding:'3px 10px', borderRadius:6, cursor:'pointer', fontSize:11 }}>
              Filtrer →
            </button>
          </div>
        )}

        <div className="card">
          {/* Filtres */}
          <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ position:'relative', flex:1, minWidth:200 }}>
              <Search size={15} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#888' }}/>
              <input style={{ paddingLeft:34, width:'100%', padding:'9px 9px 9px 34px',
                border:'1px solid #ddd', borderRadius:6, fontSize:13, boxSizing:'border-box' }}
                placeholder="Nom, prénom, email, N° patient..."
                value={recherche} onChange={e => setRecherche(e.target.value)} />
            </div>
            <select value={filtre} onChange={e => setFiltre(e.target.value)}
              style={{ padding:'9px 12px', border:'1px solid #ddd', borderRadius:6, fontSize:13 }}>
              <option value="tous">Tous</option>
              <option value="patient">Patients</option>
              <option value="medecin">Praticiens</option>
              <option value="admin">Admins</option>
              <option value="actif">Actifs</option>
              <option value="inactif">Inactifs</option>
              <option value="mdp">Mdp à changer</option>
            </select>
            <button className="btn btn-outline btn-sm" onClick={chargerUsers}>
              <RefreshCw size={14}/> Actualiser
            </button>
            <span style={{ fontSize:12, color:'#888', marginLeft:'auto' }}>{usersFiltres.length} résultat(s)</span>
          </div>

          {/* Tableau */}
          {usersFiltres.length === 0 ? (
            <div className="empty-state"><Users size={40} color="#ccc"/><p>Aucun utilisateur trouvé.</p></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Contact</th>
                  <th>N° Patient</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th>Inscrit le</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersFiltres.map(u => (
                  <tr key={u.id_utilisateur}
                    style={{ background: u.doit_changer_mdp ? '#fffdf0' : '' }}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:34, height:34, borderRadius:8, flexShrink:0,
                          background: u.actif ? '#eaf2fb' : '#f5f5f5',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:12, fontWeight:700, color: u.actif ? '#1F5C9E' : '#aaa' }}>
                          {u.prenom?.charAt(0)}{u.nom?.charAt(0)}
                        </div>
                        <div>
                          <p style={{ fontSize:13, fontWeight:600, margin:0 }}>{u.prenom} {u.nom}</p>
                          {u.doit_changer_mdp && (
                            <span style={{ fontSize:9, background:'#fef9e7', color:'#9A7D0A',
                              padding:'1px 5px', borderRadius:4, fontWeight:700 }}>
                              🔑 Mdp temporaire
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <p style={{ fontSize:12, margin:0 }}>{u.email}</p>
                      <p style={{ fontSize:11, color:'#888', margin:0 }}>{u.telephone}</p>
                    </td>
                    <td><code style={{ fontSize:11 }}>{u.numero_patient || '—'}</code></td>
                    <td>
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20,
                        background: u.role==='admin'?'#f5eef8':u.role==='medecin'?'#e8f8f5':'#eaf2fb',
                        color: u.role==='admin'?'#8e44ad':u.role==='medecin'?'#1A7A4A':'#1F5C9E' }}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20,
                        background: u.actif?'#eafaf1':'#fdecea',
                        color: u.actif?'#1A7A4A':'#C0392B' }}>
                        {u.actif ? '✓ Actif' : '✗ Inactif'}
                      </span>
                    </td>
                    <td style={{ fontSize:12 }}>{fmt(u.created_at)}</td>
                    <td>
                      <div style={{ display:'flex', gap:5 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => ouvrirProfil(u)}>
                          <Eye size={12}/> Profil
                        </button>
                        <button className="btn btn-outline btn-sm" title="Réinitialiser le mot de passe"
                          onClick={() => { setUserDetail(u); setMdpGenere(null); setModalReset(true); }}>
                          <Key size={12}/>
                        </button>
                        <button className={`btn btn-sm ${u.actif ? 'btn-danger' : 'btn-success'}`}
                          onClick={() => toggleStatut(u)} disabled={traitement}
                          title={u.actif ? 'Désactiver' : 'Activer'}>
                          {u.actif ? <UserX size={12}/> : <UserCheck size={12}/>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Modal Profil complet ─────────────────────────────── */}
        {modalProfil && userDetail && (
          <div className="modal-overlay" onClick={() => setModalProfil(false)}>
            <div className="modal" style={{ maxWidth:600 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3><Eye size={16}/> Profil — {userDetail.prenom} {userDetail.nom}</h3>
                <button className="modal-close" onClick={() => setModalProfil(false)}><X size={16}/></button>
              </div>

              {/* Identité */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
                {[
                  ['N° Patient', userDetail.numero_patient || '—'],
                  ['Email',      userDetail.email],
                  ['Téléphone',  userDetail.telephone || '—'],
                  ['Naissance',  fmt(userDetail.date_naissance)],
                  ['Sexe',       { M:'Masculin', F:'Féminin' }[userDetail.sexe] || '—'],
                  ['Groupe sg.', userDetail.groupe_sanguin || '—'],
                  ['Adresse',    userDetail.adresse || '—'],
                  ['Inscrit le', fmt(userDetail.created_at)],
                ].map(([l, v]) => (
                  <div key={l} style={{ background:'#f8f9fa', borderRadius:6, padding:'7px 10px' }}>
                    <p style={{ fontSize:10, color:'#888', margin:0 }}>{l}</p>
                    <p style={{ fontSize:12, fontWeight:600, color:'#333', margin:0 }}>{v}</p>
                  </div>
                ))}
              </div>

              {/* Badges statut */}
              <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
                <span style={{ fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:20,
                  background: userDetail.actif?'#eafaf1':'#fdecea',
                  color: userDetail.actif?'#1A7A4A':'#C0392B' }}>
                  {userDetail.actif ? '✓ Compte actif' : '✗ Compte inactif'}
                </span>
                {userDetail.doit_changer_mdp && (
                  <span style={{ fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:20,
                    background:'#fef9e7', color:'#9A7D0A' }}>
                    🔑 Mot de passe temporaire non changé
                  </span>
                )}
              </div>

              {/* Stats */}
              {loadingProfil ? (
                <div style={{ textAlign:'center', padding:'20px 0', color:'#888', fontSize:13 }}>
                  Chargement des statistiques...
                </div>
              ) : profilStats && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
                  {[
                    { label:'Bons valides',    val:profilStats.bons_valides,       color:'#1A7A4A', icon:<CreditCard size={16}/> },
                    { label:'Consultations',   val:profilStats.total_consultations, color:'#1F5C9E', icon:<FileHeart size={16}/> },
                    { label:'Dossiers',        val:profilStats.dossiers_ouverts,   color:'#8e44ad', icon:<FileHeart size={16}/> },
                    { label:'Total dépensé',   val:`${new Intl.NumberFormat('fr-FR').format(profilStats.total_depense)} F`, color:'#E67E22', icon:<CreditCard size={16}/> },
                  ].map(s => (
                    <div key={s.label} style={{ background:'#f8f9fa', borderRadius:8,
                      padding:'10px', textAlign:'center', border:'1px solid #eee' }}>
                      <p style={{ fontSize:18, fontWeight:800, color:s.color, margin:0 }}>{s.val}</p>
                      <p style={{ fontSize:10, color:'#888', margin:0 }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', flexWrap:'wrap' }}>
                <button className="btn btn-outline btn-sm"
                  onClick={() => { setModalProfil(false); setMdpGenere(null); setModalReset(true); }}>
                  <Key size={13}/> Réinitialiser mdp
                </button>
                <button className={`btn btn-sm ${userDetail.actif ? 'btn-danger' : 'btn-success'}`}
                  onClick={() => toggleStatut(userDetail)} disabled={traitement}>
                  {userDetail.actif ? <><UserX size={13}/> Désactiver</> : <><UserCheck size={13}/> Activer</>}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setModalProfil(false)}>
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal Réinitialiser mot de passe ─────────────────── */}
        {modalReset && userDetail && (
          <div className="modal-overlay" onClick={() => !mdpGenere && setModalReset(false)}>
            <div className="modal" style={{ maxWidth:420 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3><Key size={16}/> Réinitialiser le mot de passe</h3>
                <button className="modal-close" onClick={() => { setModalReset(false); setMdpGenere(null); }}><X size={16}/></button>
              </div>

              {mdpGenere ? (
                <div>
                  <div style={{ background:'#eafaf1', border:'1px solid #27AE60', borderRadius:8,
                    padding:'14px 16px', marginBottom:16, textAlign:'center' }}>
                    <CheckCircle size={24} color="#27AE60" style={{ marginBottom:8 }}/>
                    <p style={{ fontSize:13, color:'#1A7A4A', fontWeight:700, margin:0 }}>
                      Mot de passe réinitialisé avec succès !
                    </p>
                    <p style={{ fontSize:12, color:'#555', margin:'8px 0 4px' }}>
                      Mot de passe temporaire à communiquer au patient :
                    </p>
                    <code style={{ fontSize:20, fontWeight:900, background:'#fff',
                      padding:'6px 16px', borderRadius:6, color:'#1F5C9E', letterSpacing:2 }}>
                      {mdpGenere}
                    </code>
                    <p style={{ fontSize:10, color:'#888', margin:'8px 0 0' }}>
                      ⚠ Ce mot de passe ne sera plus affiché après fermeture.
                    </p>
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ width:'100%' }}
                    onClick={() => { setModalReset(false); setMdpGenere(null); }}>
                    <CheckCircle size={13}/> Compris, fermer
                  </button>
                </div>
              ) : (
                <form onSubmit={resetMdp}>
                  <p style={{ fontSize:13, color:'#555', marginBottom:14 }}>
                    Réinitialiser le mot de passe de <strong>{userDetail.prenom} {userDetail.nom}</strong>.
                    Le patient devra le changer à sa prochaine connexion.
                  </p>
                  <div className="form-group">
                    <label>Nouveau mot de passe (optionnel)</label>
                    <input type="text" value={nouveauMdp}
                      onChange={e => setNouveauMdp(e.target.value)}
                      placeholder="Laisser vide pour générer automatiquement" />
                    <small style={{ fontSize:10, color:'#888' }}>
                      Si vide, un mot de passe sécurisé sera généré automatiquement.
                    </small>
                  </div>
                  <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:14 }}>
                    <button type="button" className="btn btn-secondary btn-sm"
                      onClick={() => setModalReset(false)}>Annuler</button>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={traitement}>
                      <Lock size={13}/> {traitement ? '...' : 'Réinitialiser'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ── Modal Créer compte ───────────────────────────────── */}
        {modalCreation && (
          <div className="modal-overlay" onClick={() => setModalCreation(false)}>
            <div className="modal" style={{ maxWidth:560 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3><Plus size={16}/> Nouveau compte</h3>
                <button className="modal-close" onClick={() => setModalCreation(false)}><X size={16}/></button>
              </div>
              <form onSubmit={creerPatient}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 14px' }}>
                  <div className="form-group" style={{ gridColumn:'1/-1' }}>
                    <label>Type de compte *</label>
                    <select
                      value={formPatient.role}
                      onChange={e => setFormPatient({ ...formPatient, role: e.target.value, medecin_id: '' })}
                    >
                      <option value="patient">Patient</option>
                      <option value="medecin">Praticien (accès agenda + consultations)</option>
                    </select>
                  </div>
                  {formPatient.role === 'medecin' && (
                    <div className="form-group" style={{ gridColumn:'1/-1' }}>
                      <label>Fiche médecin liée *</label>
                      <select
                        required
                        value={formPatient.medecin_id}
                        onChange={e => setFormPatient({ ...formPatient, medecin_id: e.target.value })}
                      >
                        <option value="">— Choisir le praticien (annuaire) —</option>
                        {medecins.map((m) => (
                          <option key={m.id} value={m.id}>
                            Dr {m.prenom} {m.nom} — {m.specialite}
                          </option>
                        ))}
                      </select>
                      <small style={{ fontSize:10, color:'#888' }}>
                        Un seul compte de connexion par fiche médecin. Créez d&apos;abord le praticien dans « Médecins » si besoin.
                      </small>
                    </div>
                  )}
                  {[['Prénom *','prenom','text',true], ['Nom *','nom','text',true],
                    ['Email *','email','email',true], ['Téléphone','telephone','tel',false],
                  ].map(([lbl,key,type,req]) => (
                    <div className="form-group" key={key}>
                      <label>{lbl}</label>
                      <input type={type} required={req} value={formPatient[key]}
                        onChange={e => setFormPatient({...formPatient,[key]:e.target.value})}
                        placeholder={lbl.replace(' *','')} />
                    </div>
                  ))}
                  {formPatient.role === 'patient' && (
                    <>
                      {[
                        ['Date de naissance','date_naissance','date',false],
                        ['Groupe sanguin','groupe_sanguin','text',false],
                      ].map(([lbl,key,type,req]) => (
                        <div className="form-group" key={key}>
                          <label>{lbl}</label>
                          <input type={type} required={req} value={formPatient[key]}
                            onChange={e => setFormPatient({...formPatient,[key]:e.target.value})}
                            placeholder={lbl.replace(' *','')} />
                        </div>
                      ))}
                      <div className="form-group">
                        <label>Sexe</label>
                        <select value={formPatient.sexe}
                          onChange={e => setFormPatient({...formPatient,sexe:e.target.value})}>
                          <option value="">Non précisé</option>
                          <option value="M">Masculin</option>
                          <option value="F">Féminin</option>
                        </select>
                      </div>
                    </>
                  )}
                  <div className="form-group">
                    <label>Mot de passe temporaire</label>
                    <input type="text" value={formPatient.password}
                      onChange={e => setFormPatient({...formPatient,password:e.target.value})} />
                  </div>
                  {formPatient.role === 'patient' && (
                    <div className="form-group" style={{ gridColumn:'1/-1' }}>
                      <label>Adresse</label>
                      <input type="text" value={formPatient.adresse}
                        onChange={e => setFormPatient({...formPatient,adresse:e.target.value})}
                        placeholder="Quartier, ville..." />
                    </div>
                  )}
                </div>
                <div style={{ background:'#fef9e7', borderRadius:8, padding:'10px 12px', marginTop:8 }}>
                  <p style={{ fontSize:11, color:'#9A7D0A', margin:0 }}>
                    🔑 {formPatient.role === 'medecin'
                      ? 'Le praticien devra changer ce mot de passe à sa première connexion (espace Médecin).'
                      : 'Le patient sera obligé de changer ce mot de passe à sa première connexion.'}
                  </p>
                </div>
                <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:14 }}>
                  <button type="button" className="btn btn-secondary btn-sm"
                    onClick={() => setModalCreation(false)}>Annuler</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={traitement}>
                    <Stethoscope size={13}/> {traitement ? '...' : 'Créer le compte'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default GestionUsers;
