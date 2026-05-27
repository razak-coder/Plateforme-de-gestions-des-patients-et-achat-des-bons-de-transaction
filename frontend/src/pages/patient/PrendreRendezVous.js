import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Calendar, CalendarDays, CheckCircle, ChevronLeft, ChevronRight, Clock, RefreshCw, Stethoscope, User } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';
import API from '../../api/axios';
import { useNavigate } from 'react-router-dom';

const ETAPES = { SPECIALITE: 1, MEDECIN: 2, DATE: 3, CRENEAU: 4, CONFIRMATION: 5 };

const PrendreRendezVous = () => {
  const navigate = useNavigate();

  /* ── State principal ─────────────────────────────────────────── */
  const [etape, setEtape] = useState(ETAPES.SPECIALITE);
  const [medecins, setMedecins] = useState([]);
  const [specialites, setSpecialites] = useState([]);
  const [bons, setBons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCreneaux, setLoadingCreneaux] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* ── Sélections ─────────────────────────────────────────────── */
  const [specialiteChoisie, setSpecialiteChoisie] = useState('');
  const [medecinChoisi, setMedecinChoisi] = useState(null);
  const [dateChoisie, setDateChoisie] = useState('');
  const [creneaux, setCreneaux] = useState([]);
  const [creneauChoisi, setCreneauChoisi] = useState('');
  const [motif, setMotif] = useState('');
  const [bonId, setBonId] = useState('');
  const [priorite, setPriorite] = useState('normale');
  const [rdvCree, setRdvCree] = useState(null);

  /* ── Chargement initial ─────────────────────────────────────── */
  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const [resMedecins, resBons] = await Promise.all([
        API.get('/patient/medecins-disponibles'),
        API.get('/patient/bons'),
      ]);
      setMedecins(resMedecins.data.data || []);
      setSpecialites(resMedecins.data.specialites || []);
      setBons((resBons.data.data || []).filter(b => b.statut === 'valide'));
    } catch {
      toast.error('Impossible de charger les données.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  /* ── Filtrage médecins par spécialité ───────────────────────── */
  const medecinsFiltres = useMemo(() =>
    specialiteChoisie
      ? medecins.filter(m => m.specialite === specialiteChoisie)
      : medecins,
    [medecins, specialiteChoisie]
  );

  const bonsCompatibles = useMemo(() => {
    if (!medecinChoisi) return [];
    return bons.filter((b) => {
      const specialiteBon = (b.type_bon?.specialite || b.typeBon?.specialite || '').trim();
      if (!specialiteBon) return false; // types sans spécialité ne sont plus proposés à l'achat
      return specialiteBon.toLowerCase() === String(medecinChoisi.specialite || '').toLowerCase();
    });
  }, [bons, medecinChoisi]);

  useEffect(() => {
    if (!bonId) return;
    const existe = bonsCompatibles.some((b) => String(b.id) === String(bonId));
    if (!existe) setBonId('');
  }, [bonId, bonsCompatibles]);

  /* ── Chargement créneaux ────────────────────────────────────── */
  const chargerCreneaux = async (medecinId, date) => {
    if (!medecinId || !date) { setCreneaux([]); return; }
    setLoadingCreneaux(true);
    try {
      const res = await API.get(`/patient/medecins/${medecinId}/creneaux?date=${date}`);
      setCreneaux(res.data.creneaux || []);
    } catch {
      toast.error('Impossible de charger les créneaux.');
      setCreneaux([]);
    } finally {
      setLoadingCreneaux(false);
    }
  };

  /* ── Soumission ──────────────────────────────────────────────── */
  const soumettre = async () => {
    if (!motif.trim()) { toast.error('Veuillez saisir le motif de la consultation.'); return; }
    setSubmitting(true);
    try {
      const res = await API.post('/patient/rendez-vous', {
        medecin_id: medecinChoisi.id,
        date_rdv:   dateChoisie,
        heure_rdv:  creneauChoisi,
        motif:      motif.trim(),
        bon_id:     bonId,
        priorite,
      });
      setRdvCree(res.data.data);
      setEtape(ETAPES.CONFIRMATION);
      toast.success('Rendez-vous soumis ! En attente de confirmation.');
    } catch (err) {
      const msg = err.response?.data?.message ||
        Object.values(err.response?.data?.errors || {})[0]?.[0] ||
        'Erreur lors de la soumission.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Helpers ─────────────────────────────────────────────────── */
  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 60 * 24 * 3600000).toISOString().split('T')[0];

  const etapes = [
    { num: 1, label: 'Spécialité' },
    { num: 2, label: 'Médecin' },
    { num: 3, label: 'Date' },
    { num: 4, label: 'Créneau' },
    { num: 5, label: 'Confirmation' },
  ];

  if (loading) return (
    <div className="layout">
      <Navbar />
      <div className="main-content loading">Chargement des médecins disponibles...</div>
    </div>
  );

  return (
    <div className="layout">
      <Navbar />
      <div className="main-content">
        <div className="page-title">
          <h1><CalendarDays size={22} /> Prendre un rendez-vous</h1>
          <p>Prenez rendez-vous avec un médecin en quelques étapes.</p>
        </div>

        {/* Indicateur d'étapes */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {etapes.map((e) => (
            <div key={e.num} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 20, fontSize: 13,
              background: etape === e.num ? '#1F5C9E' : etape > e.num ? '#1A7A4A' : '#eeeeee',
              color: etape >= e.num ? '#fff' : '#999',
              fontWeight: etape === e.num ? 700 : 400,
              transition: 'all 0.2s',
            }}>
              {etape > e.num ? <CheckCircle size={14} /> : <span>{e.num}</span>}
              {e.label}
            </div>
          ))}
        </div>

        {/* ─── ÉTAPE 1 : Spécialité ──────────────────────────────── */}
        {etape === ETAPES.SPECIALITE && (
          <div className="card">
            <div className="card-header">
              <h2><Stethoscope size={16} /> Choisissez une spécialité</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginTop: 16 }}>
              <div
                onClick={() => { setSpecialiteChoisie(''); setEtape(ETAPES.MEDECIN); }}
                style={{
                  padding: 16, borderRadius: 10, border: '2px solid #e5e7eb',
                  cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                  background: '#f9fafb',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#1F5C9E'; e.currentTarget.style.background = '#eaf2fb'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#f9fafb'; }}
              >
                <User size={28} color="#1F5C9E" style={{ marginBottom: 8 }} />
                <p style={{ fontWeight: 700, margin: 0 }}>Toutes spécialités</p>
                <p style={{ fontSize: 12, color: '#888', margin: 0 }}>{medecins.length} médecins</p>
              </div>
              {specialites.map(sp => {
                const count = medecins.filter(m => m.specialite === sp).length;
                return (
                  <div key={sp}
                    onClick={() => { setSpecialiteChoisie(sp); setEtape(ETAPES.MEDECIN); }}
                    style={{
                      padding: 16, borderRadius: 10, border: '2px solid #e5e7eb',
                      cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                      background: '#f9fafb',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#1F5C9E'; e.currentTarget.style.background = '#eaf2fb'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#f9fafb'; }}
                  >
                    <Stethoscope size={28} color="#1F5C9E" style={{ marginBottom: 8 }} />
                    <p style={{ fontWeight: 700, margin: 0, fontSize: 14 }}>{sp}</p>
                    <p style={{ fontSize: 12, color: '#888', margin: 0 }}>{count} médecin{count > 1 ? 's' : ''}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── ÉTAPE 2 : Médecin ─────────────────────────────────── */}
        {etape === ETAPES.MEDECIN && (
          <div className="card">
            <div className="card-header">
              <h2><User size={16} /> Choisissez un médecin {specialiteChoisie && `— ${specialiteChoisie}`}</h2>
              <button className="btn btn-outline btn-sm" onClick={() => setEtape(ETAPES.SPECIALITE)}>
                <ChevronLeft size={14} /> Retour
              </button>
            </div>
            {medecinsFiltres.length === 0 ? (
              <div className="empty-state"><p>Aucun médecin disponible pour cette spécialité.</p></div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginTop: 16 }}>
                {medecinsFiltres.map(m => (
                  <div key={m.id}
                    onClick={() => { setMedecinChoisi(m); setBonId(''); setEtape(ETAPES.DATE); }}
                    style={{
                      padding: 16, borderRadius: 10, border: '2px solid #e5e7eb',
                      cursor: 'pointer', transition: 'all 0.2s', background: '#f9fafb',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#1F5C9E'; e.currentTarget.style.background = '#eaf2fb'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#f9fafb'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <div style={{ background: '#dbeafe', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={22} color="#1F5C9E" />
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, margin: 0, fontSize: 14 }}>Dr {m.nom_complet}</p>
                        <p style={{ fontSize: 12, color: '#1F5C9E', margin: 0 }}>{m.specialite}</p>
                      </div>
                    </div>
                    {m.cabinet_adresse && (
                      <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>📍 {m.cabinet_adresse}</p>
                    )}
                    <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                      <span className="badge badge-valide">Disponible</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── ÉTAPE 3 : Date ────────────────────────────────────── */}
        {etape === ETAPES.DATE && medecinChoisi && (
          <div className="card" style={{ maxWidth: 440 }}>
            <div className="card-header">
              <h2><Calendar size={16} /> Choisissez une date</h2>
              <button className="btn btn-outline btn-sm" onClick={() => setEtape(ETAPES.MEDECIN)}>
                <ChevronLeft size={14} /> Retour
              </button>
            </div>
            <div style={{ padding: '12px 0' }}>
              <p style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>
                Médecin : <strong>Dr {medecinChoisi.nom_complet}</strong> — {medecinChoisi.specialite}
              </p>
              <div className="form-group">
                <label>Date du rendez-vous *</label>
                <input
                  type="date"
                  min={today}
                  max={maxDate}
                  value={dateChoisie}
                  onChange={e => {
                    setDateChoisie(e.target.value);
                    setCreneauChoisi('');
                    chargerCreneaux(medecinChoisi.id, e.target.value);
                  }}
                />
              </div>
              {dateChoisie && (
                <button
                  className="btn btn-primary"
                  disabled={!dateChoisie}
                  onClick={() => setEtape(ETAPES.CRENEAU)}
                >
                  Voir les créneaux <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── ÉTAPE 4 : Créneau + Motif ──────────────────────────── */}
        {etape === ETAPES.CRENEAU && (
          <div className="card" style={{ maxWidth: 560 }}>
            <div className="card-header">
              <h2><Clock size={16} /> Choisissez un créneau</h2>
              <button className="btn btn-outline btn-sm" onClick={() => setEtape(ETAPES.DATE)}>
                <ChevronLeft size={14} /> Retour
              </button>
            </div>
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>
                Dr <strong>{medecinChoisi.nom_complet}</strong> — {new Date(dateChoisie + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>

              {loadingCreneaux ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#888' }}>
                  <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} /> Chargement des créneaux...
                </div>
              ) : creneaux.filter(c => c.disponible).length === 0 ? (
                <div className="alert" style={{ background: '#fff3cd', borderColor: '#ffc107', color: '#856404', borderRadius: 8, padding: 12 }}>
                  Aucun créneau disponible pour cette date. Veuillez choisir une autre date.
                  <button className="btn btn-outline btn-sm" style={{ marginLeft: 12 }} onClick={() => setEtape(ETAPES.DATE)}>Changer la date</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8, marginBottom: 16 }}>
                  {creneaux.map(c => (
                    <button key={c.heure} type="button"
                      disabled={!c.disponible}
                      onClick={() => setCreneauChoisi(c.heure)}
                      style={{
                        padding: '10px 8px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                        border: creneauChoisi === c.heure ? '2px solid #1F5C9E' : '1px solid #ddd',
                        background: !c.disponible ? '#f5f5f5' : creneauChoisi === c.heure ? '#eaf2fb' : '#fff',
                        color: !c.disponible ? '#ccc' : creneauChoisi === c.heure ? '#1F5C9E' : '#333',
                        cursor: c.disponible ? 'pointer' : 'not-allowed',
                        transition: 'all 0.15s',
                      }}
                    >
                      {c.heure}
                      {!c.disponible && <div style={{ fontSize: 10, color: '#ccc' }}>Pris</div>}
                    </button>
                  ))}
                </div>
              )}

              {creneauChoisi && (
                <>
                  <div className="form-group">
                    <label>Motif de la consultation *</label>
                    <input
                      type="text"
                      value={motif}
                      onChange={e => setMotif(e.target.value)}
                      placeholder="Ex: Douleurs lombaires, contrôle annuel..."
                      maxLength={255}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label>Priorité</label>
                      <select value={priorite} onChange={e => setPriorite(e.target.value)}>
                        <option value="normale">Normale</option>
                        <option value="haute">Haute</option>
                        <option value="urgente">Urgente</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Bon de consultation *</label>
                      {bonsCompatibles.length === 0 ? (
                        <div style={{
                          padding: '10px 14px', borderRadius: 8,
                          background: '#fff8e6', border: '1px solid #f0c050',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          gap: 10,
                        }}>
                          <div>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#c87a00' }}>
                              Aucun bon compatible disponible
                            </p>
                            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#888' }}>
                              Cette consultation ({medecinChoisi?.specialite}) nécessite un bon lié à cette spécialité.
                            </p>
                          </div>
                          <button type="button" onClick={() => navigate('/patient/acheter')}
                            style={{ padding: '6px 12px', background: '#1F5C9E', color: '#fff',
                              border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                              fontWeight: 600, whiteSpace: 'nowrap' }}>
                            Acheter un bon
                          </button>
                        </div>
                      ) : (
                        <>
                          <select value={bonId} onChange={e => setBonId(e.target.value)}>
                            <option value="">-- Choisir un bon compatible --</option>
                            {bonsCompatibles.map(b => (
                              <option key={b.id} value={b.id}>
                                {b.code_unique} — {b.type_bon?.nom || b.typeBon?.nom}
                                {b.date_expiration ? ` (exp. ${new Date(b.date_expiration).toLocaleDateString('fr-FR')})` : ''}
                              </option>
                            ))}
                          </select>
                          {bonId && (() => {
                            const bon = bons.find(b => String(b.id) === String(bonId));
                            if (!bon) return null;
                            const jRestants = Math.ceil((new Date(bon.date_expiration) - new Date()) / 86400000);
                            return (
                              <div style={{ marginTop: 6, padding: '6px 10px', borderRadius: 6,
                                background: jRestants <= 7 ? '#fff8e6' : '#eafaf1',
                                border: `1px solid ${jRestants <= 7 ? '#f0c050' : '#27ae60'}`,
                                fontSize: 12, color: jRestants <= 7 ? '#c87a00' : '#1A7A4A',
                                display: 'flex', alignItems: 'center', gap: 6 }}>
                                {jRestants <= 7 ? '⚠️' : '✓'}
                                Bon valide · Expire dans <strong>{jRestants} jour{jRestants > 1 ? 's' : ''}</strong>
                                {jRestants <= 7 && ' — Pensez à l\'utiliser avant expiration'}
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  </div>
                  <button className="btn btn-success" onClick={soumettre} disabled={submitting || !motif.trim() || !bonId}>
                    {submitting ? 'Envoi en cours...' : <><CheckCircle size={16} /> Confirmer le rendez-vous</>}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ─── ÉTAPE 5 : Confirmation ───────────────────────────── */}
        {etape === ETAPES.CONFIRMATION && rdvCree && (
          <div className="card" style={{ maxWidth: 480, textAlign: 'center' }}>
            <div style={{
              background: 'linear-gradient(135deg, #eafaf1, #d5f5e3)',
              borderRadius: 12, padding: 32, marginBottom: 16,
            }}>
              <CheckCircle size={56} color="#1A7A4A" style={{ marginBottom: 16 }} />
              <h2 style={{ color: '#1A7A4A', marginBottom: 8 }}>Demande envoyée !</h2>
              <p style={{ color: '#555', marginBottom: 0 }}>
                Votre demande de rendez-vous a été transmise au Dr <strong>{rdvCree.medecin?.nom_complet}</strong>.
                Vous serez informé(e) de la confirmation.
              </p>
            </div>

            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16, textAlign: 'left', marginBottom: 16 }}>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: '#888' }}>Récapitulatif</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['Médecin', `Dr ${rdvCree.medecin?.nom_complet}`],
                  ['Date', new Date(rdvCree.date_rdv + 'T00:00:00').toLocaleDateString('fr-FR')],
                  ['Heure', String(rdvCree.heure_rdv || '').slice(0, 5)],
                  ['Statut', 'En attente de confirmation'],
                  ['Motif', rdvCree.motif],
                  ['Priorité', rdvCree.priorite],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>{k}</p>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => navigate('/patient/mon-dossier')}>
                Mon dossier
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => {
                setEtape(ETAPES.SPECIALITE);
                setMedecinChoisi(null); setDateChoisie(''); setCreneauChoisi('');
                setMotif(''); setBonId(''); setRdvCree(null);
              }}>
                Autre RDV
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrendreRendezVous;
