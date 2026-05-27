import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Search, UserPlus, FileHeart, CalendarDays, CreditCard,
  Stethoscope, Plus, CheckCircle, X, QrCode, RefreshCw, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import API from '../../api/axios';

const fmt = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR');
};

const Reception = () => {
  const navigate = useNavigate();

  // Recherche patient
  const [recherche, setRecherche]       = useState('');
  const [patients, setPatients]         = useState([]);
  const [loading, setLoading]           = useState(false);
  const [patientSel, setPatientSel]     = useState(null);
  const [fiche, setFiche]               = useState(null);
  const [loadingFiche, setLoadingFiche] = useState(false);

  // Médecins & créneaux
  const [medecins, setMedecins]               = useState([]);
  const [creneaux, setCreneaux]               = useState([]);
  const [loadingCreneaux, setLoadingCreneaux] = useState(false);

  // Formulaire RDV
  const [showFormRdv, setShowFormRdv] = useState(false);
  const [formRdv, setFormRdv]         = useState({
    medecin_id: '', date: new Date().toISOString().split('T')[0],
    heure_rdv: '', motif: '', priorite: 'normale', bon_id: '',
  });
  const [savingRdv, setSavingRdv] = useState(false);

  // Vérification bon — OBLIGATOIRE pour créer le RDV
  const [bonCode, setBonCode]           = useState('');
  const [bonVerifie, setBonVerifie]     = useState(null);
  const [bonErreur, setBonErreur]       = useState('');
  const [verifiantBon, setVerifiantBon] = useState(false);

  // Formulaire nouveau patient
  const [showFormPatient, setShowFormPatient] = useState(false);
  const [formPatient, setFormPatient]         = useState({
    prenom: '', nom: '', email: '', telephone: '', password: 'Ctm@2026',
    role: 'patient', date_naissance: '', sexe: '', groupe_sanguin: '', adresse: '',
  });
  const [savingPatient, setSavingPatient] = useState(false);

  // Ref pour fermer le dropdown suggestions au clic extérieur
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setPatients([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ── Recherche patient ────────────────────────────────────────── */
  const rechercherPatient = useCallback(async (terme) => {
    setRecherche(terme);
    if (terme.length < 2) { setPatients([]); return; }
    setLoading(true);
    try {
      const res = await API.get(`/admin/utilisateurs?role=patient&recherche=${encodeURIComponent(terme)}&per_page=10`);
      setPatients((res.data.data?.data) || res.data.data || []);
    } catch {
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Charger créneaux disponibles ───────────────────────────── */
  const chargerCreneaux = useCallback(async (medecinId, date) => {
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
  }, []);

  /* ── Sélectionner un patient → charger fiche ────────────────── */
  const selectionnerPatient = useCallback(async (p) => {
    setPatientSel(p);
    setPatients([]);
    setRecherche(`${p.prenom} ${p.nom}`);
    setLoadingFiche(true);
    setFiche(null);
    setShowFormRdv(false);

    try {
      // Dossiers et médecins en parallèle — critiques
      const [dossiersRes, medeRes] = await Promise.all([
        API.get(`/admin/dossiers-patients?utilisateur_id=${p.id_utilisateur}`),
        API.get('/admin/medecins?statut=actif&per_page=100'),
      ]);

      // ✅ Bons isolés — un échec n'empêche pas la fiche de s'afficher
      let bons = [];
      try {
        const bonRes = await API.get(`/admin/bons?utilisateur_id=${p.id_utilisateur}&statut=valide`);
        bons = (bonRes.data.data?.data) || bonRes.data.data || [];
      } catch (bonErr) {
        console.error('Erreur chargement bons:', bonErr.response?.status, bonErr.response?.data);
        toast.error("Les bons du patient n'ont pas pu être chargés.");
      }

      setFiche({
        dossiers: (dossiersRes.data.data?.data) || dossiersRes.data.data || [],
        bons,
      });
      setMedecins((medeRes.data.data?.data) || medeRes.data.data || []);
    } catch {
      toast.error('Impossible de charger la fiche patient.');
    } finally {
      setLoadingFiche(false);
    }
  }, []);

  /* ── Recharger dossiers + bons après création RDV ───────────── */
  const rechargerDossiers = useCallback(async (patientId) => {
    try {
      const dossiersRes = await API.get(`/admin/dossiers-patients?utilisateur_id=${patientId}`);
      setFiche(prev => ({
        ...prev,
        dossiers: (dossiersRes.data.data?.data) || dossiersRes.data.data || [],
      }));
    } catch {
      toast.error('Impossible de rafraîchir les dossiers.');
    }

    // Bons séparés pour la même raison
    try {
      const bonRes = await API.get(`/admin/bons?utilisateur_id=${patientId}&statut=valide`);
      setFiche(prev => ({
        ...prev,
        bons: (bonRes.data.data?.data) || bonRes.data.data || [],
      }));
    } catch (bonErr) {
      console.error('Erreur refresh bons:', bonErr.response?.status, bonErr.response?.data);
    }
  }, []);

  /* ── Vérification bon obligatoire ───────────────────────────── */
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
      if (!bon) { setBonErreur('Aucun bon trouvé pour ce code.'); return; }
      if (bon.statut !== 'valide') { setBonErreur(`Ce bon est "${bon.statut}" — non utilisable.`); return; }
      if (bon.date_expiration && new Date(bon.date_expiration) < new Date()) {
        setBonErreur('Ce bon a expiré.'); return;
      }
      if (patientSel && String(bon.utilisateur_id) !== String(patientSel.id_utilisateur)) {
        setBonErreur(`Ce bon appartient à ${bon.utilisateur?.prenom} ${bon.utilisateur?.nom} — pas à ce patient.`);
        return;
      }
      setBonVerifie(bon);
      setBonCode(bon.code_unique);
      setFormRdv(prev => ({ ...prev, bon_id: String(bon.id) }));
      toast.success(`Bon valide — ${bon.type_bon?.nom}`);
    } catch {
      setBonErreur('Erreur de vérification. Réessayez.');
    } finally {
      setVerifiantBon(false);
    }
  }, [bonCode, patientSel]);

  const reinitialiserBon = () => {
    setBonCode(''); setBonVerifie(null); setBonErreur('');
    setFormRdv(prev => ({ ...prev, bon_id: '' }));
  };

  /* ── Créer le rendez-vous ────────────────────────────────────── */
  const creerRdv = async (e) => {
    e.preventDefault();
    if (!patientSel) return;
    if (!bonVerifie) {
      toast.error('Un bon de consultation vérifié est requis.');
      return;
    }

    const dossierExistant = fiche?.dossiers?.find(d => d.statut === 'ouvert');

    setSavingRdv(true);
    try {
      let dossierId = dossierExistant?.id;

      if (!dossierId) {
        const dRes = await API.post('/admin/dossiers-patients', {
          utilisateur_id: patientSel.id_utilisateur,
          service:        medecins.find(m => String(m.id) === String(formRdv.medecin_id))?.specialite || 'Médecine générale',
          date_ouverture: formRdv.date,
          statut:         'ouvert',
        });
        dossierId = dRes.data.data?.id;
      }

      await API.post('/admin/rendez-vous', {
        dossier_id:     dossierId,
        utilisateur_id: patientSel.id_utilisateur,
        medecin_id:     formRdv.medecin_id,
        bon_id:         formRdv.bon_id || null,
        date_rdv:       formRdv.date,
        heure_rdv:      formRdv.heure_rdv,
        motif:          formRdv.motif,
        priorite:       formRdv.priorite,
      });

      toast.success(`✅ Rendez-vous créé pour ${patientSel.prenom} ${patientSel.nom}`);
      setShowFormRdv(false);
      setBonVerifie(null);
      setBonCode('');
      setBonErreur('');
      setFormRdv(prev => ({ ...prev, bon_id: '' }));
      rechargerDossiers(patientSel.id_utilisateur);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la création du RDV.');
    } finally {
      setSavingRdv(false);
    }
  };

  /* ── Créer un nouveau patient ────────────────────────────────── */
  const creerPatient = async (e) => {
    e.preventDefault();
    setSavingPatient(true);
    try {
      const res = await API.post('/admin/utilisateurs', formPatient);
      const nouveauPatient = res.data.data;
      toast.success(`Patient ${nouveauPatient.prenom} ${nouveauPatient.nom} créé (N° ${nouveauPatient.numero_patient})`);
      setShowFormPatient(false);
      selectionnerPatient(nouveauPatient);
    } catch (err) {
      const msg = err.response?.data?.message ||
        Object.values(err.response?.data?.errors || {})[0]?.[0] || 'Erreur.';
      toast.error(msg);
    } finally {
      setSavingPatient(false);
    }
  };

  return (
    <div className="layout">
      <Navbar />
      <div className="main-content">

        {/* En-tête */}
        <div className="page-title">
          <h1>🚪 Réception — Accueil patient</h1>
          <p>Recherchez un patient, consultez sa fiche et planifiez son rendez-vous en quelques secondes.</p>
        </div>

        {/* Barre de recherche */}
        <div className="card" style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 10 }}>
            Rechercher un patient existant
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div ref={searchRef} style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%',
                transform: 'translateY(-50%)', color: '#888' }}/>
              <input
                style={{ paddingLeft: 38, width: '100%', padding: '11px 11px 11px 38px',
                  border: '2px solid #e5e7eb', borderRadius: 8, fontSize: 14,
                  outline: 'none', transition: 'border .2s' }}
                placeholder="Nom, prénom, numéro patient ou email..."
                value={recherche}
                onChange={e => rechercherPatient(e.target.value)}
                onFocus={e => e.target.style.borderColor = '#1F5C9E'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
              {loading && (
                <span style={{ position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)', color: '#888', fontSize: 11 }}>...</span>
              )}
              {/* Suggestions */}
              {patients.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0,
                  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100,
                  maxHeight: 240, overflowY: 'auto' }}>
                  {patients.map(p => (
                    <div key={p.id_utilisateur}
                      onClick={() => selectionnerPatient(p)}
                      style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', gap: 10, borderBottom: '1px solid #f5f5f5',
                        transition: 'background .1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: '#eaf2fb',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: '#1F5C9E', flexShrink: 0 }}>
                        {p.prenom?.charAt(0)}{p.nom?.charAt(0)}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{p.prenom} {p.nom}</p>
                        <p style={{ fontSize: 11, color: '#888', margin: 0 }}>
                          {p.numero_patient || p.email} · {p.telephone}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => setShowFormPatient(true)}>
              <UserPlus size={14}/> Nouveau patient
            </button>
          </div>
          {recherche.length >= 2 && patients.length === 0 && !loading && (
            <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
              Aucun résultat pour "{recherche}".&nbsp;
              <span style={{ color: '#1F5C9E', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => setShowFormPatient(true)}>
                Créer un nouveau patient →
              </span>
            </p>
          )}
        </div>

        {/* Chargement fiche */}
        {loadingFiche && (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
            <Stethoscope size={28} color="#1F5C9E"/> Chargement de la fiche...
          </div>
        )}

        {/* Fiche patient */}
        {patientSel && fiche && !loadingFiche && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 20 }}>

            {/* Colonne gauche — info patient */}
            <div>
              {/* Carte identité */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 12, background: '#eaf2fb',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 800, color: '#1F5C9E', flexShrink: 0 }}>
                    {patientSel.prenom?.charAt(0)}{patientSel.nom?.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>
                      {patientSel.prenom} {patientSel.nom}
                    </h3>
                    <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
                      {patientSel.numero_patient || patientSel.email}
                    </p>
                  </div>
                  <span style={{ marginLeft: 'auto', background: '#eafaf1', color: '#1A7A4A',
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                    {patientSel.actif ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    ['📞 Tél',       patientSel.telephone],
                    ['📧 Email',     patientSel.email],
                    ['🎂 Naissance', fmt(patientSel.date_naissance)],
                    ['🩸 Groupe',    patientSel.groupe_sanguin || '—'],
                    ['⚧ Sexe',      { M: 'Masculin', F: 'Féminin' }[patientSel.sexe] || '—'],
                    ['📍 Adresse',   patientSel.adresse || '—'],
                  ].map(([l, v]) => (
                    <div key={l} style={{ background: '#f8f9fa', borderRadius: 8, padding: '8px 10px' }}>
                      <p style={{ fontSize: 10, color: '#888', margin: 0 }}>{l}</p>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#333', margin: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bons valides */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header">
                  <h3 style={{ fontSize: 14 }}><CreditCard size={14}/> Bons valides</h3>
                  <span className="badge badge-valide">{fiche.bons.length}</span>
                </div>
                {fiche.bons.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: '#aaa', fontSize: 12 }}>
                    Aucun bon valide.
                    <br/>
                    <span style={{ color: '#1F5C9E', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => navigate('/admin/bons')}>Gérer les bons →</span>
                  </div>
                ) : fiche.bons.map(b => (
                  <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}><code>{b.code_unique}</code></p>
                      <p style={{ fontSize: 11, color: '#888', margin: 0 }}>
                        {b.type_bon?.nom} · Expire {fmt(b.date_expiration)}
                      </p>
                    </div>
                    <span style={{ background: '#eafaf1', color: '#1A7A4A', padding: '2px 8px',
                      borderRadius: 20, fontSize: 10, fontWeight: 700 }}>Valide</span>
                  </div>
                ))}
              </div>

              {/* Dossiers */}
              <div className="card">
                <div className="card-header">
                  <h3 style={{ fontSize: 14 }}><FileHeart size={14}/> Dossiers médicaux</h3>
                  <span className="badge badge-attente">{fiche.dossiers.length}</span>
                </div>
                {fiche.dossiers.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#aaa', textAlign: 'center', padding: '12px 0' }}>
                    Aucun dossier ouvert.
                  </p>
                ) : fiche.dossiers.slice(0, 3).map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>{d.numero_dossier}</p>
                      <p style={{ fontSize: 11, color: '#888', margin: 0 }}>{d.service} · {fmt(d.date_ouverture)}</p>
                    </div>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
                      background: d.statut === 'ouvert' ? '#eafaf1' : '#f5f5f5',
                      color:      d.statut === 'ouvert' ? '#1A7A4A' : '#888' }}>
                      {d.statut}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Colonne droite — Planifier RDV */}
            <div>
              <div className="card">
                <div className="card-header">
                  <h3 style={{ fontSize: 14 }}><CalendarDays size={14}/> Planifier un rendez-vous</h3>
                </div>

                {!showFormRdv ? (
                  <div style={{ textAlign: 'center', padding: '30px 0' }}>
                    <CalendarDays size={40} color="#ddd"/>
                    <p style={{ fontSize: 13, color: '#888', margin: '10px 0 16px' }}>
                      Prêt à planifier le rendez-vous de {patientSel.prenom} ?
                    </p>
                    <button className="btn btn-primary" onClick={() => setShowFormRdv(true)}>
                      <Plus size={15}/> Créer un rendez-vous
                    </button>
                  </div>
                ) : (
                  <form onSubmit={creerRdv}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

                      <div className="form-group">
                        <label>Médecin *</label>
                        <select required value={formRdv.medecin_id} onChange={e => {
                          const id = e.target.value;
                          setFormRdv(prev => ({ ...prev, medecin_id: id, heure_rdv: '' }));
                          chargerCreneaux(id, formRdv.date);
                        }}>
                          <option value="">-- Choisir --</option>
                          {medecins.map(m => (
                            <option key={m.id} value={m.id}>
                              Dr {m.prenom} {m.nom} — {m.specialite}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Date *</label>
                        <input type="date" required value={formRdv.date}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={e => {
                            const d = e.target.value;
                            setFormRdv(prev => ({ ...prev, date: d, heure_rdv: '' }));
                            chargerCreneaux(formRdv.medecin_id, d);
                          }} />
                      </div>

                      <div className="form-group" style={{ gridColumn: '1/-1' }}>
                        <label>
                          Créneau horaire *
                          {loadingCreneaux && (
                            <span style={{ color: '#888', fontSize: 11 }}> — chargement...</span>
                          )}
                        </label>
                        {creneaux.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                            {creneaux.map(c => (
                              <button key={c.heure} type="button"
                                disabled={!c.disponible}
                                aria-label={!c.disponible ? `${c.heure} — indisponible` : `Choisir ${c.heure}`}
                                onClick={() => setFormRdv(prev => ({ ...prev, heure_rdv: c.heure }))}
                                style={{
                                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                                  cursor: c.disponible ? 'pointer' : 'not-allowed',
                                  border: formRdv.heure_rdv === c.heure ? '2px solid #1F5C9E' : '1px solid #ddd',
                                  background: !c.disponible ? '#f5f5f5'
                                    : formRdv.heure_rdv === c.heure ? '#eaf2fb' : '#fff',
                                  color: !c.disponible ? '#ccc'
                                    : formRdv.heure_rdv === c.heure ? '#1F5C9E' : '#333',
                                }}>
                                {c.heure} {!c.disponible ? '✗' : ''}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <input type="time" required value={formRdv.heure_rdv}
                            onChange={e => setFormRdv(prev => ({ ...prev, heure_rdv: e.target.value }))}/>
                        )}
                      </div>

                      <div className="form-group" style={{ gridColumn: '1/-1' }}>
                        <label>Motif de consultation *</label>
                        <input type="text" required value={formRdv.motif}
                          onChange={e => setFormRdv(prev => ({ ...prev, motif: e.target.value }))}
                          placeholder="Ex: Douleur abdominale, contrôle annuel..." />
                      </div>

                      <div className="form-group">
                        <label>Priorité</label>
                        <select value={formRdv.priorite}
                          onChange={e => setFormRdv(prev => ({ ...prev, priorite: e.target.value }))}>
                          <option value="normale">Normale</option>
                          <option value="haute">Haute</option>
                          <option value="urgente">Urgente</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          Bon de consultation
                          <span style={{
                            fontSize: 10, padding: '2px 6px', borderRadius: 4,
                            background: '#fdecea', color: '#C0392B', fontWeight: 700,
                          }}>OBLIGATOIRE</span>
                        </label>

                        {bonVerifie ? (
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 12px', borderRadius: 8,
                            background: '#eafaf1', border: '1px solid #27ae60',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <CheckCircle size={16} color="#27ae60" />
                              <div>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#1A7A4A' }}>
                                  {bonVerifie.code_unique}
                                </p>
                                <p style={{ margin: 0, fontSize: 11, color: '#555' }}>
                                  {bonVerifie.type_bon?.nom} · Expire {bonVerifie.date_expiration
                                    ? new Date(bonVerifie.date_expiration).toLocaleDateString('fr-FR') : '—'}
                                </p>
                              </div>
                            </div>
                            <button type="button" onClick={reinitialiserBon}
                              style={{ background: 'none', border: 'none', color: '#C0392B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                              <XCircle size={13} /> Changer
                            </button>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <input
                                type="text"
                                placeholder="Code bon (ex: CTM-XXXX)"
                                value={bonCode}
                                onChange={e => { setBonCode(e.target.value.toUpperCase()); setBonErreur(''); }}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), verifierBon())}
                                style={{
                                  flex: 1, padding: '8px 10px',
                                  border: `2px solid ${bonErreur ? '#e74c3c' : '#ddd'}`,
                                  borderRadius: 6, fontSize: 12, fontFamily: 'monospace', textTransform: 'uppercase',
                                }}
                              />
                              <button type="button" onClick={() => verifierBon()} disabled={verifiantBon}
                                style={{ padding: '8px 10px', background: '#1F5C9E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                                {verifiantBon ? <RefreshCw size={12} /> : <CheckCircle size={12} />}
                                {verifiantBon ? '...' : 'Vérif.'}
                              </button>
                              <button type="button" onClick={() => navigate('/admin/qr-scanner')}
                                style={{ padding: '8px 10px', background: '#f0f0f0', color: '#555', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                                title="Scanner un QR">
                                <QrCode size={12} />
                              </button>
                            </div>
                            {bonErreur && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, padding: '4px 8px', background: '#fdecea', borderRadius: 4 }}>
                                <XCircle size={11} color="#C0392B" />
                                <small style={{ color: '#C0392B', fontSize: 11 }}>{bonErreur}</small>
                              </div>
                            )}
                            {/* Suggestion bons du patient */}
                            {fiche?.bons?.length > 0 && !bonCode && (
                              <div style={{ marginTop: 6 }}>
                                <p style={{ fontSize: 11, color: '#888', margin: '0 0 4px' }}>Bons disponibles pour ce patient :</p>
                                {fiche.bons.slice(0, 3).map(b => (
                                  <button key={b.id} type="button"
                                    onClick={() => verifierBon(b.code_unique)}
                                    style={{ fontSize: 11, padding: '3px 8px', marginRight: 4, marginBottom: 4,
                                      background: '#eaf2fb', border: '1px solid #1F5C9E', borderRadius: 4, cursor: 'pointer', color: '#1F5C9E' }}>
                                    {b.code_unique} — {b.type_bon?.nom}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                      <button type="button" className="btn btn-secondary btn-sm"
                        onClick={() => setShowFormRdv(false)}>
                        <X size={13}/> Annuler
                      </button>
                      <button type="submit" className="btn btn-primary btn-sm" disabled={savingRdv}>
                        {savingRdv ? '...' : <><CheckCircle size={13}/> Confirmer le RDV</>}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal nouveau patient */}
        {showFormPatient && (
          <div className="modal-overlay" onClick={() => setShowFormPatient(false)}>
            <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3><UserPlus size={16}/> Enregistrer un nouveau patient</h3>
                <button className="modal-close" onClick={() => setShowFormPatient(false)}>
                  <X size={16}/>
                </button>
              </div>
              <form onSubmit={creerPatient}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px' }}>
                  {[
                    ['Prénom *',          'prenom',         'text',  true],
                    ['Nom *',             'nom',            'text',  true],
                    ['Email *',           'email',          'email', true],
                    ['Téléphone *',       'telephone',      'tel',   true],
                    ['Date de naissance', 'date_naissance', 'date',  false],
                    ['Groupe sanguin',    'groupe_sanguin', 'text',  false],
                  ].map(([lbl, key, type, req]) => (
                    <div className="form-group" key={key}>
                      <label>{lbl}</label>
                      <input type={type} required={req} value={formPatient[key]}
                        onChange={e => setFormPatient(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={lbl.replace(' *', '')} />
                    </div>
                  ))}
                  <div className="form-group">
                    <label>Sexe</label>
                    <select value={formPatient.sexe}
                      onChange={e => setFormPatient(prev => ({ ...prev, sexe: e.target.value }))}>
                      <option value="">Non précisé</option>
                      <option value="M">Masculin</option>
                      <option value="F">Féminin</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label>Adresse</label>
                    <input type="text" value={formPatient.adresse}
                      onChange={e => setFormPatient(prev => ({ ...prev, adresse: e.target.value }))}
                      placeholder="Quartier, ville..." />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label>Mot de passe temporaire</label>
                    <input type="text" value={formPatient.password}
                      onChange={e => setFormPatient(prev => ({ ...prev, password: e.target.value }))}/>
                    <small style={{ color: '#888', fontSize: 10 }}>
                      Le patient pourra le changer après connexion.
                    </small>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                  <button type="button" className="btn btn-secondary btn-sm"
                    onClick={() => setShowFormPatient(false)}>Annuler</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={savingPatient}>
                    {savingPatient ? '...' : <><UserPlus size={13}/> Enregistrer</>}
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

export default Reception;