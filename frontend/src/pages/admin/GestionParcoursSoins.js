import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, Download, Plus, RefreshCw, Stethoscope, Users, QrCode, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';
import API from '../../api/axios';

const onglets = [
  { id: 'rendezVous',    label: 'Rendez-vous',   icon: <CalendarDays size={16} /> },
  { id: 'consultations', label: 'Suivi consultations', icon: <Stethoscope size={16} /> },
];

const aujourdHui = () => new Date().toISOString().split('T')[0];

const formInitial = {
  // commun
  utilisateur_id: '', date: aujourdHui(),
  // rdv
  medecin_id: '', heure_rdv: '', motif: '', priorite: 'normale', bon_id: '',
};

const GestionParcoursSoins = () => {
  const location = useLocation();
  const navigate = useNavigate();

  /* ── State ─────────────────────────────────────────────────── */
  const [data, setData]               = useState({ dossiers: [], rendezVous: [], consultations: [] });
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [ongletActif, setOngletActif] = useState('rendezVous');
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const [filtreDate, setFiltreDate]   = useState('');
  const [form, setForm]               = useState(formInitial);
  const [dossierPatientId, setDossierPatientId] = useState('');

  // État de vérification du bon — OBLIGATOIRE avant création RDV
  const [bonCode, setBonCode]           = useState('');
  const [bonVerifie, setBonVerifie]     = useState(null);  // null | {id, code_unique, type_bon, utilisateur}
  const [bonErreur, setBonErreur]       = useState('');
  const [verifiantBon, setVerifiantBon] = useState(false);
  const bonObligatoire                  = ongletActif === 'rendezVous';  // bon requis uniquement pour RDV

  /* ─── Listes de référence ───────────────────────────────────── */
  const [patients, setPatients]       = useState([]);
  const [medecins, setMedecins]       = useState([]);
  const [creneaux, setCreneaux]       = useState([]);
  const [loadingCreneaux, setLoadingCreneaux] = useState(false);

  /* ─── Réception du prefill depuis QrScanner ─────────────────── */
  useEffect(() => {
    const prefill = location.state?.prefill;
    if (!prefill) return;
    // L'utilisateur vient du scanner avec un bon déjà validé
    if (prefill.utilisateur_id) {
      setForm(f => ({ ...f, utilisateur_id: String(prefill.utilisateur_id) }));
      setDossierPatientId(String(prefill.utilisateur_id));
    }
    if (prefill.bon_id) {
      setForm(f => ({ ...f, bon_id: String(prefill.bon_id) }));
    }
    if (prefill.bon_code && prefill.bon_info) {
      setBonCode(prefill.bon_code);
      setBonVerifie(prefill.bon_info);
      setForm(f => ({
        ...f,
        utilisateur_id: String(prefill.bon_info.utilisateur?.id_utilisateur || prefill.bon_info.utilisateur?.id || ''),
        bon_id:         String(prefill.bon_info.id || ''),
      }));
      setDossierPatientId(String(prefill.bon_info.utilisateur?.id_utilisateur || prefill.bon_info.utilisateur?.id || ''));
      toast.success('Bon pré-rempli depuis le scanner. Complétez le formulaire.');
    }
    // Nettoyer le state pour éviter les re-renders en boucle
    window.history.replaceState({}, '');
  }, []); // eslint-disable-line

  /* ── Chargement principal ──────────────────────────────────── */
  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const [resDossiers, resRdv, resConsult, resMedecins, resPatients] =
        await Promise.allSettled([
          API.get('/admin/dossiers-patients?per_page=500'),
          API.get('/admin/rendez-vous?per_page=200'),
          API.get('/admin/consultations?per_page=200'),
          API.get('/admin/medecins?per_page=200'),
          API.get('/admin/utilisateurs?role=patient&per_page=200'),
        ]);

      const ok = r => r.status === 'fulfilled';
      const list = r => r.value?.data?.data?.data || r.value?.data?.data || [];

      setData({
        dossiers:      ok(resDossiers)  ? list(resDossiers)  : data.dossiers,
        rendezVous:    ok(resRdv)       ? list(resRdv)       : data.rendezVous,
        consultations: ok(resConsult)   ? list(resConsult)   : data.consultations,
      });
      if (ok(resMedecins))  setMedecins(list(resMedecins));
      if (ok(resPatients))  setPatients(list(resPatients));

    } catch {
      toast.error('Erreur lors du chargement.');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => { charger(); }, [charger]);

  /* ── Créneaux disponibles ──────────────────────────────────── */
  const chargerCreneaux = async (medecinId, date) => {
    if (!medecinId || !date) { setCreneaux([]); return; }
    setLoadingCreneaux(true);
    try {
      const res = await API.get(`/admin/medecins/${medecinId}/disponibilites?date=${date}`);
      setCreneaux(res.data.creneaux || []);
    } catch {
      setCreneaux([]);
    } finally {
      setLoadingCreneaux(false);
    }
  };

  /* ─── Vérification du bon par code ──────────────────────────── */
  const verifierBon = useCallback(async (codeOverride) => {
    const c = (codeOverride || bonCode).trim().toUpperCase();
    if (!c) { toast.error('Entrez un code de bon.'); return; }
    setBonErreur('');
    setBonVerifie(null);
    setVerifiantBon(true);
    try {
      const res = await API.get(`/admin/bons?recherche=${encodeURIComponent(c)}&per_page=1`);
      const list = res.data?.data?.data || res.data?.data || [];
      const bon  = list.find(b => b.code_unique?.toUpperCase() === c);
      if (!bon) {
        setBonErreur('Aucun bon trouvé pour ce code.');
        return;
      }
      if (bon.statut !== 'valide') {
        setBonErreur(`Ce bon est "${bon.statut}" — non utilisable.`);
        return;
      }
      if (bon.date_expiration && new Date(bon.date_expiration) < new Date()) {
        setBonErreur('Ce bon a expiré.');
        return;
      }
      setBonVerifie(bon);
      setBonCode(bon.code_unique);
      // Auto-remplir le patient et le bon_id
      const patId = String(bon.utilisateur?.id_utilisateur || bon.utilisateur?.id || bon.utilisateur_id || '');
      setForm(f => ({ ...f, bon_id: String(bon.id), utilisateur_id: f.utilisateur_id || patId }));
      if (!dossierPatientId && patId) setDossierPatientId(patId);
      toast.success(`Bon valide — Patient : ${bon.utilisateur?.prenom} ${bon.utilisateur?.nom}`);
    } catch {
      setBonErreur('Erreur lors de la vérification. Réessayez.');
    } finally {
      setVerifiantBon(false);
    }
  }, [bonCode, dossierPatientId]);

  const reinitialiserBon = () => {
    setBonCode('');
    setBonVerifie(null);
    setBonErreur('');
    setForm(f => ({ ...f, bon_id: '' }));
  };

  /* ── Soumission formulaire ─────────────────────────────────── */
  const soumettre = async (e) => {
    e.preventDefault();
    // Bloquer si aucun bon vérifié pour un RDV
    if (bonObligatoire && !bonVerifie) {
      toast.error('Un bon de consultation vérifié est obligatoire pour créer un rendez-vous.');
      return;
    }
    setSaving(true);
    try {
      if (ongletActif !== 'rendezVous') {
        toast.error('Les consultations sont remplies par les médecins dans leur espace.');
        return;
      }

        await API.post('/admin/rendez-vous', {
          utilisateur_id:form.utilisateur_id,
          medecin_id:    form.medecin_id,
          bon_id:        form.bon_id,
          date_rdv:      form.date,
          heure_rdv:     form.heure_rdv,
          motif:         form.motif,
          priorite:      form.priorite,
        });
        toast.success('Rendez-vous créé. Le dossier patient est créé automatiquement si nécessaire.');

      setForm(formInitial);
      setBonVerifie(null);
      setBonCode('');
      setBonErreur('');
      setCreneaux([]);
      charger();
    } catch (err) {
      const msg = err.response?.data?.message ||
        Object.values(err.response?.data?.errors || {})[0]?.[0] ||
        'Erreur lors de l\'enregistrement.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  /* ── Changer statut RDV ────────────────────────────────────── */
  const changerStatutRdv = async (id, statut) => {
    try {
      await API.put(`/admin/rendez-vous/${id}/statut`, { statut });
      toast.success('Statut mis à jour.');
      charger();
    } catch { toast.error('Erreur statut.'); }
  };

  /* ── Export CSV ─────────────────────────────────────────────── */
  const exporterCsv = () => {
    const lignes = donneesFiltrees;
    if (!lignes.length) { toast.error('Aucune donnée.'); return; }
    const rows = lignes.map(i => [
      i.utilisateur?.prenom || i.patient || '',
      i.utilisateur?.nom || '',
      i.numero_dossier || i.date_rdv || i.date_consultation || '',
      i.service || i.motif || i.diagnostic || '',
      i.statut || '',
    ].join(';'));
    const csv = ['Prénom;Nom;Référence;Détail;Statut', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `parcours-${ongletActif}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exporté.');
  };

  /* ── Données filtrées ───────────────────────────────────────── */
  const donneesFiltrees = useMemo(() => {
    let lignes = data[ongletActif] || [];
    if (filtreStatut !== 'tous') lignes = lignes.filter(i => i.statut === filtreStatut);
    if (filtreDate) {
      lignes = lignes.filter(i => {
        const d = i.date_rdv || i.date_consultation || '';
        return d.startsWith(filtreDate);
      });
    }
    return lignes;
  }, [data, ongletActif, filtreStatut, filtreDate]);

  /* ── Stats ──────────────────────────────────────────────────── */
  const stats = useMemo(() => ({
    dossiers:      data.dossiers.length,
    rendezVous:    data.rendezVous.length,
    consultations: data.consultations.length,
    rdvAujourdhui: data.rendezVous.filter(r =>
      r.date_rdv?.startsWith(aujourdHui()) && r.statut !== 'annule'
    ).length,
  }), [data]);

  const dossierPatient = useMemo(
    () => patients.find((p) => String(p.id_utilisateur) === String(dossierPatientId)),
    [patients, dossierPatientId],
  );
  const dossiersDuPatient = useMemo(
    () => data.dossiers
      .filter((d) => String(d.utilisateur_id) === String(dossierPatientId))
      .sort((a, b) => new Date(b.date_ouverture || b.created_at) - new Date(a.date_ouverture || a.created_at)),
    [data.dossiers, dossierPatientId],
  );
  const rendezVousDuPatient = useMemo(
    () => data.rendezVous
      .filter((r) => String(r.utilisateur_id) === String(dossierPatientId))
      .sort((a, b) => new Date(`${b.date_rdv || ''}T${b.heure_rdv || '00:00:00'}`) - new Date(`${a.date_rdv || ''}T${a.heure_rdv || '00:00:00'}`)),
    [data.rendezVous, dossierPatientId],
  );
  const consultationsDuPatient = useMemo(
    () => data.consultations
      .filter((c) => String(c.utilisateur_id) === String(dossierPatientId))
      .sort((a, b) => new Date(b.date_consultation || b.created_at) - new Date(a.date_consultation || a.created_at)),
    [data.consultations, dossierPatientId],
  );

  if (loading) return <div className="loading">Chargement...</div>;

  /* ── Helpers ────────────────────────────────────────────────── */
  const badge = (s) => {
    if (s === 'confirme'  || s === 'ouvert'   || s === 'valide')  return 'badge-valide';
    if (s === 'termine'   || s === 'utilise')                     return 'badge-confirme';
    if (s === 'annule'    || s === 'expire'   || s === 'archive') return 'badge-annule';
    return 'badge-attente';
  };
  const label = (s) => ({
    en_attente:'En attente', confirme:'Confirmé', termine:'Terminé',
    annule:'Annulé',
    en_cours:'En cours',
  }[s] || s);

  /* ── Formulaire spécifique par onglet ───────────────────────── */
  const renderFormSpecifique = () => {
    if (ongletActif === 'rendezVous') return (
      <>
        <div className="form-group">
          <label>Médecin *</label>
          <select required value={form.medecin_id}
            onChange={e => { setForm({...form, medecin_id: e.target.value, heure_rdv: ''}); chargerCreneaux(e.target.value, form.date); }}>
            <option value="">-- Choisir un médecin --</option>
            {medecins.filter(m => m.statut === 'actif').map(m => (
              <option key={m.id} value={m.id}>{m.nom_complet} — {m.specialite}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Créneau *
            {loadingCreneaux && <span style={{fontSize:11,color:'#888'}}> Chargement...</span>}
          </label>
          {creneaux.length > 0 ? (
            <select required value={form.heure_rdv}
              onChange={e => setForm({...form, heure_rdv: e.target.value})}>
              <option value="">-- Choisir un créneau --</option>
              {creneaux.filter(c => c.disponible).map(c => (
                <option key={c.heure} value={c.heure}>{c.heure} ✓ Disponible</option>
              ))}
              {creneaux.filter(c => !c.disponible).map(c => (
                <option key={c.heure} value={c.heure} disabled>{c.heure} ✗ Occupé</option>
              ))}
            </select>
          ) : (
            <input type="time" required value={form.heure_rdv}
              onChange={e => setForm({...form, heure_rdv: e.target.value})} />
          )}
        </div>
        <div className="form-group">
          <label>Motif *</label>
          <input type="text" required value={form.motif}
            onChange={e => setForm({...form, motif: e.target.value})}
            placeholder="Contrôle, douleur..." />
        </div>
        <div className="form-group">
          <label>Priorité</label>
          <select value={form.priorite} onChange={e => setForm({...form, priorite: e.target.value})}>
            <option value="normale">Normale</option>
            <option value="haute">Haute</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
        {/* ── Zone vérification bon OBLIGATOIRE ────────────── */}
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Bon de consultation</span>
            <span style={{
              fontSize: 10, padding: '2px 6px', borderRadius: 4,
              background: '#fdecea', color: '#C0392B', fontWeight: 700,
            }}>OBLIGATOIRE</span>
          </label>

          {/* Si le bon est déjà vérifié : affichage de la carte */}
          {bonVerifie ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: 8,
              background: '#eafaf1', border: '1px solid #27ae60',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle size={20} color="#27ae60" />
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#1A7A4A' }}>
                    Bon valide — {bonVerifie.code_unique}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: '#555' }}>
                    Patient : {bonVerifie.utilisateur?.prenom} {bonVerifie.utilisateur?.nom}
                    {' · '}Type : {bonVerifie.type_bon?.nom || bonVerifie.typeBon?.nom || '—'}
                    {' · '}Expire le : {bonVerifie.date_expiration
                      ? new Date(bonVerifie.date_expiration).toLocaleDateString('fr-FR') : '—'}
                  </p>
                </div>
              </div>
              <button type="button" onClick={reinitialiserBon}
                style={{
                  background: 'none', border: 'none', color: '#C0392B',
                  cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
                }}>
                <XCircle size={14} /> Changer
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Ex : CTM-ABCD1234 ou BON-XXXXXXXXXX"
                  value={bonCode}
                  onChange={e => { setBonCode(e.target.value.toUpperCase()); setBonErreur(''); }}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), verifierBon())}
                  style={{
                    flex: 1, padding: '9px 12px', border: `2px solid ${bonErreur ? '#e74c3c' : '#ccc'}`,
                    borderRadius: 8, fontSize: 13, fontFamily: 'monospace', textTransform: 'uppercase',
                  }}
                />
                <button type="button" onClick={() => verifierBon()} disabled={verifiantBon}
                  className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>
                  {verifiantBon ? <RefreshCw size={13} /> : <CheckCircle size={13} />}
                  {' '}{verifiantBon ? 'Vérif...' : 'Vérifier'}
                </button>
                <button type="button" onClick={() => navigate('/admin/qr-scanner')}
                  className="btn btn-outline btn-sm" title="Scanner un QR code" style={{ whiteSpace: 'nowrap' }}>
                  <QrCode size={13} /> Scanner
                </button>
              </div>
              {bonErreur && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6,
                  padding: '6px 10px', background: '#fdecea', borderRadius: 6 }}>
                  <XCircle size={13} color="#C0392B" />
                  <small style={{ color: '#C0392B', fontSize: 12 }}>{bonErreur}</small>
                </div>
              )}
              <small style={{ color: '#888', fontSize: 11, marginTop: 4, display: 'block' }}>
                Saisissez le code du bon acheté par le patient ou scannez son QR Code. (Appuyez sur Entrée pour vérifier)
              </small>
            </>
          )}
        </div>
      </>
    );

    return (
      <>
        <div className="alert alert-info" style={{ gridColumn:'1 / -1', marginBottom: 0 }}>
          Les consultations sont désormais saisies et terminées par les médecins depuis leur espace
          (Salle d'attente / Consultations). Cette vue est un suivi administratif.
        </div>
      </>
    );
  };

  /* ── Rendu tableau ──────────────────────────────────────────── */
  const renderLigne = (item) => {
    if (ongletActif === 'rendezVous') return (
      <tr key={item.id}>
        <td><strong>{item.utilisateur?.prenom} {item.utilisateur?.nom}</strong></td>
        <td>{item.medecin?.nom_complet}</td>
        <td>{item.date_rdv ? new Date(item.date_rdv).toLocaleDateString('fr-FR') : '—'}</td>
        <td>{item.heure_rdv?.slice(0,5)}</td>
        <td style={{fontSize:11}}>{item.motif}</td>
        <td><span className={`badge ${item.priorite === 'urgente' ? 'badge-annule' : item.priorite === 'haute' ? 'badge-expire' : 'badge-confirme'}`}>{item.priorite}</span></td>
        <td>
          <select value={item.statut} onChange={e => changerStatutRdv(item.id, e.target.value)}
            className={`badge ${badge(item.statut)}`} style={{border:0,cursor:'pointer',background:'transparent'}}>
            <option value="en_attente">En attente</option>
            <option value="confirme">Confirmé</option>
            <option value="annule">Annulé</option>
            <option value="termine">Terminé</option>
          </select>
        </td>
        <td style={{fontSize:11}}>{item.bon?.code_unique || '—'}</td>
      </tr>
    );

    return (
      <tr key={item.id}>
        <td><strong>{item.utilisateur?.prenom} {item.utilisateur?.nom}</strong></td>
        <td>{item.medecin?.nom_complet}</td>
        <td>{item.date_consultation ? new Date(item.date_consultation).toLocaleDateString('fr-FR') : '—'}</td>
        <td style={{fontSize:11}}>{item.rendez_vous_id ? `#${item.rendez_vous_id}` : '—'}</td>
        <td style={{fontSize:11}}>{item.diagnostic}</td>
        <td style={{fontSize:11}}>{item.traitement}</td>
        <td><span className={`badge ${badge(item.statut)}`}>{label(item.statut)}</span></td>
        <td style={{fontSize:11}}>{item.bon?.code_unique || '—'}</td>
      </tr>
    );
  };

  const colonnes = {
    rendezVous:    ['Patient', 'Médecin', 'Date', 'Heure', 'Motif', 'Priorité', 'Statut', 'Bon'],
    consultations: ['Patient', 'Médecin', 'Date', 'RDV', 'Diagnostic', 'Traitement', 'Statut', 'Bon'],
  };

  return (
    <div className="layout">
      <Navbar />
      <div className="main-content">
        <div className="page-title">
          <h1><Users size={22} /> Parcours de soins</h1>
          <p>Flux concret : 1) planifier le RDV, 2) dossier auto au 1er RDV, 3) consultation faite par le médecin.</p>
        </div>

        <div className="alert alert-info">
          Un dossier patient est créé automatiquement lors du premier rendez-vous si aucun dossier ouvert n'existe.
          Ici, vous planifiez les rendez-vous. Les actes de consultation sont saisis côté médecin.
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{marginBottom:16}}>
          <div className="stat-card"><div className="stat-info"><p>{stats.dossiers}</p><p>Dossiers patients</p></div></div>
          <div className="stat-card"><div className="stat-info"><p>{stats.rendezVous}</p><p>Rendez-vous</p></div></div>
          <div className="stat-card"><div className="stat-info"><p>{stats.consultations}</p><p>Consultations</p></div></div>
          <div className="stat-card"><div className="stat-info"><p>{stats.rdvAujourdhui}</p><p>RDV aujourd'hui</p></div></div>
        </div>

        {/* Recherche dossier patient */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <h2>Recherche dossier patient</h2>
            <span className="badge badge-attente">{dossiersDuPatient.length} dossier(s)</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'minmax(280px, 1fr) 2fr', gap:12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Patient</label>
              <select value={dossierPatientId} onChange={(e) => setDossierPatientId(e.target.value)}>
                <option value="">-- Choisir un patient --</option>
                {patients.map((p) => (
                  <option key={p.id_utilisateur} value={p.id_utilisateur}>
                    {p.prenom} {p.nom} — {p.numero_patient || p.email}
                  </option>
                ))}
              </select>
            </div>
            {!dossierPatient ? (
              <div className="empty-state" style={{ margin: 0 }}><p>Sélectionnez un patient pour voir son dossier complet.</p></div>
            ) : (
              <div style={{ display:'grid', gap:10 }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:8 }}>
                  <div style={{ background:'#f8f9fa', border:'1px solid #eee', borderRadius:8, padding:10 }}>
                    <p style={{ fontSize:10, color:'#888', margin:0 }}>Nom complet</p>
                    <p style={{ fontSize:12, fontWeight:700, margin:0 }}>{dossierPatient.prenom} {dossierPatient.nom}</p>
                  </div>
                  <div style={{ background:'#f8f9fa', border:'1px solid #eee', borderRadius:8, padding:10 }}>
                    <p style={{ fontSize:10, color:'#888', margin:0 }}>N° Patient</p>
                    <p style={{ fontSize:12, fontWeight:700, margin:0 }}>{dossierPatient.numero_patient || '—'}</p>
                  </div>
                  <div style={{ background:'#f8f9fa', border:'1px solid #eee', borderRadius:8, padding:10 }}>
                    <p style={{ fontSize:10, color:'#888', margin:0 }}>Contact</p>
                    <p style={{ fontSize:12, fontWeight:700, margin:0 }}>{dossierPatient.telephone || dossierPatient.email || '—'}</p>
                  </div>
                  <div style={{ background:'#f8f9fa', border:'1px solid #eee', borderRadius:8, padding:10 }}>
                    <p style={{ fontSize:10, color:'#888', margin:0 }}>Dossiers</p>
                    <p style={{ fontSize:12, fontWeight:700, margin:0 }}>{dossiersDuPatient.length}</p>
                  </div>
                  <div style={{ background:'#f8f9fa', border:'1px solid #eee', borderRadius:8, padding:10 }}>
                    <p style={{ fontSize:10, color:'#888', margin:0 }}>RDV historiques</p>
                    <p style={{ fontSize:12, fontWeight:700, margin:0 }}>{rendezVousDuPatient.length}</p>
                  </div>
                  <div style={{ background:'#f8f9fa', border:'1px solid #eee', borderRadius:8, padding:10 }}>
                    <p style={{ fontSize:10, color:'#888', margin:0 }}>Consultations</p>
                    <p style={{ fontSize:12, fontWeight:700, margin:0 }}>{consultationsDuPatient.length}</p>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div style={{ border:'1px solid #eee', borderRadius:8, padding:10 }}>
                    <p style={{ fontWeight:700, margin:'0 0 8px', fontSize:12 }}>Dossiers du patient</p>
                    {dossiersDuPatient.length === 0 ? <p style={{ fontSize:12, color:'#888', margin:0 }}>Aucun dossier enregistré.</p> : dossiersDuPatient.map((d) => (
                      <div key={d.id} style={{ padding:'6px 0', borderBottom:'1px solid #f5f5f5' }}>
                        <p style={{ margin:0, fontSize:12, fontWeight:700 }}>{d.numero_dossier}</p>
                        <p style={{ margin:0, fontSize:11, color:'#777' }}>{d.service} · {d.date_ouverture ? new Date(d.date_ouverture).toLocaleDateString('fr-FR') : '—'} · {label(d.statut)}</p>
                        {d.antecedents ? <p style={{ margin:'2px 0 0', fontSize:11, color:'#555' }}>ATCD: {d.antecedents}</p> : null}
                      </div>
                    ))}
                  </div>
                  <div style={{ border:'1px solid #eee', borderRadius:8, padding:10 }}>
                    <p style={{ fontWeight:700, margin:'0 0 8px', fontSize:12 }}>Historique soins</p>
                    {rendezVousDuPatient.length === 0 && consultationsDuPatient.length === 0 ? (
                      <p style={{ fontSize:12, color:'#888', margin:0 }}>Aucun historique trouvé.</p>
                    ) : (
                      <>
                        {rendezVousDuPatient.slice(0, 8).map((r) => (
                          <div key={`r-${r.id}`} style={{ padding:'6px 0', borderBottom:'1px solid #f5f5f5' }}>
                            <p style={{ margin:0, fontSize:12, fontWeight:700 }}>
                              RDV · {r.date_rdv ? new Date(r.date_rdv).toLocaleDateString('fr-FR') : '—'} {r.heure_rdv?.slice(0, 5) || ''}
                            </p>
                            <p style={{ margin:0, fontSize:11, color:'#777' }}>{r.motif} · Dr {r.medecin?.nom || '—'} · {label(r.statut)}</p>
                          </div>
                        ))}
                        {consultationsDuPatient.slice(0, 8).map((c) => (
                          <div key={`c-${c.id}`} style={{ padding:'6px 0', borderBottom:'1px solid #f5f5f5' }}>
                            <p style={{ margin:0, fontSize:12, fontWeight:700 }}>
                              Consultation · {c.date_consultation ? new Date(c.date_consultation).toLocaleDateString('fr-FR') : '—'}
                            </p>
                            <p style={{ margin:0, fontSize:11, color:'#777' }}>
                              Diag: {c.diagnostic || '—'} · Dr {c.medecin?.nom || '—'} · {label(c.statut)}
                            </p>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Onglets + Formulaire */}
        <div className="card" style={{marginBottom:16}}>
          <div className="card-header" style={{gap:8,flexWrap:'wrap'}}>
            {onglets.map(o => (
              <button key={o.id} type="button"
                className={`btn btn-sm ${ongletActif === o.id ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => { setOngletActif(o.id); setForm(formInitial); setCreneaux([]); }}>
                {o.icon} {o.label}
              </button>
            ))}
            <button type="button" className="btn btn-outline btn-sm" style={{marginLeft:'auto'}} onClick={charger}>
              <RefreshCw size={14}/> Actualiser
            </button>
          </div>

          <form onSubmit={soumettre}
            style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:10, alignItems:'end', marginTop:12}}>
            {ongletActif === 'rendezVous' && (
              <>
                <div className="form-group">
                  <label>Patient *</label>
                  <select required value={form.utilisateur_id}
                    onChange={(e) => setForm((f) => ({ ...f, utilisateur_id: e.target.value }))}>
                    <option value="">-- Choisir un patient --</option>
                    {patients.map(p => (
                      <option key={p.id_utilisateur} value={p.id_utilisateur}>
                        {p.prenom} {p.nom} — {p.numero_patient || p.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={e => {
                      setForm({...form, date: e.target.value});
                      if (form.medecin_id) chargerCreneaux(form.medecin_id, e.target.value);
                    }} />
                </div>
              </>
            )}
            {renderFormSpecifique()}
            {ongletActif === 'rendezVous' && (
              <div style={{ gridColumn: '1 / -1' }}>
                {bonObligatoire && !bonVerifie && (
                  <div style={{
                    padding: '8px 12px', borderRadius: 8, marginBottom: 8,
                    background: '#fff8e6', border: '1px solid #f0c050',
                    fontSize: 12, color: '#c87a00', display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    ⚠️ Vérifiez le bon du patient avant de programmer le rendez-vous.
                  </div>
                )}
                <button
                  type="submit"
                  className={`btn btn-sm ${bonVerifie ? 'btn-success' : 'btn-outline'}`}
                  style={{ height: 38, width: '100%', opacity: bonVerifie ? 1 : 0.6 }}
                  disabled={saving || (bonObligatoire && !bonVerifie)}
                >
                  <Plus size={14}/> {saving ? 'Enregistrement...' : 'Programmer le RDV'}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Tableau */}
        <div className="card">
          <div className="card-header" style={{gap:8,flexWrap:'wrap'}}>
            <h2>{onglets.find(o => o.id === ongletActif)?.label}</h2>
            <span className="badge badge-attente">{donneesFiltrees.length}</span>
            <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}
              style={{padding:'6px 10px', border:'1px solid #ccc', borderRadius:6, fontSize:12}}>
              <option value="tous">Tous statuts</option>
              <option value="en_attente">En attente</option>
              <option value="confirme">Confirmé</option>
              <option value="termine">Terminé</option>
              <option value="annule">Annulé</option>
              <option value="en_cours">En cours</option>
            </select>
            <input type="date" value={filtreDate} onChange={e => setFiltreDate(e.target.value)}
              style={{padding:'6px 10px', border:'1px solid #ccc', borderRadius:6, fontSize:12}} />
            <button className="btn btn-outline btn-sm" onClick={() => {setFiltreDate(''); setFiltreStatut('tous');}}>Réinitialiser</button>
            <button className="btn btn-primary btn-sm" style={{marginLeft:'auto'}} onClick={exporterCsv}>
              <Download size={13}/> Export CSV
            </button>
          </div>

          {donneesFiltrees.length === 0 ? (
            <div className="empty-state"><p>Aucune donnée pour le moment.</p></div>
          ) : (
            <table>
              <thead><tr>{colonnes[ongletActif].map(c => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>{donneesFiltrees.map(renderLigne)}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default GestionParcoursSoins;
