import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { BookOpen, HeartPulse, Plus, RefreshCw, Stethoscope, User } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';
import API from '../../api/axios';

const API_M = '/medecin';

const aujourdHui = () => new Date().toISOString().split('T')[0];

const formInitial = {
  utilisateur_id: '',
  rendez_vous_id: '',
  _dossier_id: '',
  date: aujourdHui(),
  diagnostic: '',
  traitement: '',
  orientation: '',
  bon_id: '',
};

const MesConsultations = () => {
  const [data, setData] = useState({ rendezVous: [], consultations: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(formInitial);
  const [patients, setPatients] = useState([]);
  const [historiquePatient, setHistoriquePatient] = useState(null);
  const [loadingHistorique, setLoadingHistorique] = useState(false);

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const [resRdv, resConsult, resPatients] = await Promise.all([
        API.get(`${API_M}/rendez-vous?per_page=200`),
        API.get(`${API_M}/consultations?per_page=200`),
        API.get(`${API_M}/patients`),
      ]);
      const listRdv = resRdv.data?.data?.data ?? resRdv.data?.data ?? [];
      const listC = resConsult.data?.data?.data ?? resConsult.data?.data ?? [];
      const listP = Array.isArray(resPatients.data?.data) ? resPatients.data.data : [];
      setData({ rendezVous: listRdv, consultations: listC });
      setPatients(listP);
    } catch {
      toast.error('Impossible de charger les données.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  /* ── Charger l'historique du patient sélectionné (M1) ─────── */
  const chargerHistoriquePatient = useCallback(async (patientId) => {
    if (!patientId) { setHistoriquePatient(null); return; }
    setLoadingHistorique(true);
    try {
      const res = await API.get(`${API_M}/patients/${patientId}/historique`);
      setHistoriquePatient(res.data.data);
    } catch {
      setHistoriquePatient(null);
    } finally {
      setLoadingHistorique(false);
    }
  }, []);

  const rdvEligibles = useMemo(() => {
    if (!form.utilisateur_id) return [];
    const rdvTermines = new Set(
      (data.consultations || [])
        .filter((c) => c.statut === 'termine' && c.rendez_vous_id)
        .map((c) => c.rendez_vous_id),
    );
    return (data.rendezVous || []).filter((r) =>
      String(r.utilisateur_id) === String(form.utilisateur_id) &&
      !['annule', 'termine'].includes(r.statut) &&
      !rdvTermines.has(r.id),
    );
  }, [data.rendezVous, data.consultations, form.utilisateur_id]);

  const selectedRdv = useMemo(
    () => (data.rendezVous || []).find((r) => String(r.id) === String(form.rendez_vous_id)),
    [data.rendezVous, form.rendez_vous_id],
  );

  const soumettre = async (e) => {
    e.preventDefault();
    if (!form.rendez_vous_id || !form._dossier_id) {
      toast.error('Choisissez un rendez-vous valide.');
      return;
    }
    setSaving(true);
    try {
      const existante = (data.consultations || []).find(
        (c) => String(c.rendez_vous_id) === String(form.rendez_vous_id) && c.statut === 'en_cours',
      );
      if (existante) {
        await API.put(`${API_M}/consultations/${existante.id}`, {
          diagnostic: form.diagnostic,
          traitement: form.traitement,
          orientation: form.orientation || null,
        });
        toast.success('Consultation mise à jour.');
      } else {
        await API.post(`${API_M}/consultations`, {
          rendez_vous_id: form.rendez_vous_id,
          dossier_id: form._dossier_id,
          utilisateur_id: form.utilisateur_id,
          bon_id: form.bon_id || null,
          date_consultation: form.date,
          diagnostic: form.diagnostic,
          traitement: form.traitement,
          orientation: form.orientation || null,
        });
        toast.success('Consultation enregistrée.');
      }
      setForm(formInitial);
      charger();
    } catch (err) {
      const msg = err.response?.data?.message ||
        Object.values(err.response?.data?.errors || {})[0]?.[0] ||
        'Erreur.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const terminer = async (id) => {
    if (!window.confirm('Terminer cette consultation ? Le bon sera marqué utilisé.')) return;
    try {
      await API.put(`${API_M}/consultations/${id}/terminer`);
      toast.success('Consultation terminée.');
      charger();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.');
    }
  };

  if (loading) return <div className="layout"><Navbar /><div className="main-content loading">Chargement...</div></div>;

  return (
    <div className="layout">
      <Navbar />
      <div className="main-content">
        <div className="page-title">
          <h1><Stethoscope size={22} /> Mes consultations</h1>
          <p>Enregistrement des comptes rendus pour vos rendez-vous uniquement.</p>
        </div>

        {/* ── Panneau Historique Patient (M1) ──────────────────── */}
        {loadingHistorique && (
          <div className="card" style={{ marginBottom: 16, padding: 12, color: '#888' }}>
            <RefreshCw size={14} /> Chargement du dossier patient...
          </div>
        )}
        {historiquePatient && !loadingHistorique && (
          <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #1F5C9E' }}>
            <div className="card-header">
              <h2 style={{ color: '#1F5C9E' }}>
                <BookOpen size={16} /> Dossier — {historiquePatient.patient?.prenom} {historiquePatient.patient?.nom}
              </h2>
              <div style={{ display: 'flex', gap: 12 }}>
                <span className="badge badge-attente">{historiquePatient.stats?.total_consultations} consultation(s)</span>
                <span className="badge badge-valide">{historiquePatient.stats?.total_dossiers} dossier(s)</span>
                <span className="badge badge-confirme">{historiquePatient.stats?.total_rdv} RDV total</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              {/* Antécédents */}
              <div>
                <p style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: '#555', textTransform: 'uppercase' }}>
                  Dossiers & Antécédents
                </p>
                {!historiquePatient.dossiers?.length ? (
                  <p style={{ fontSize: 12, color: '#888' }}>Aucun dossier enregistré.</p>
                ) : historiquePatient.dossiers.map(d => (
                  <div key={d.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{d.numero_dossier} — {d.service}</p>
                    {d.antecedents && (
                      <p style={{ fontSize: 12, color: '#C0392B', margin: '3px 0 0', background: '#fdf2f2', padding: '4px 8px', borderRadius: 4 }}>
                        ⚠️ ATCD : {d.antecedents}
                      </p>
                    )}
                    {d.allergies && (
                      <p style={{ fontSize: 12, color: '#E67E22', margin: '3px 0 0', background: '#fef9f0', padding: '4px 8px', borderRadius: 4 }}>
                        🚫 Allergies : {d.allergies}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {/* Consultations récentes */}
              <div>
                <p style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: '#555', textTransform: 'uppercase' }}>
                  Consultations récentes
                </p>
                {!historiquePatient.dernieres_consultations?.length ? (
                  <p style={{ fontSize: 12, color: '#888' }}>Aucune consultation antérieure.</p>
                ) : historiquePatient.dernieres_consultations.map(c => (
                  <div key={c.id} style={{ padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>
                      {c.date_consultation ? new Date(c.date_consultation).toLocaleDateString('fr-FR') : '—'}
                      {' · Dr '}{c.medecin?.nom || '—'}
                    </p>
                    <p style={{ fontSize: 11, color: '#666', margin: '2px 0 0' }}>
                      <strong>Diag :</strong> {c.diagnostic || '—'}
                    </p>
                    <p style={{ fontSize: 11, color: '#777', margin: '1px 0 0' }}>
                      <strong>Trait :</strong> {c.traitement || '—'}
                    </p>
                    {c.orientation && (
                      <p style={{ fontSize: 11, color: '#1F5C9E', margin: '1px 0 0' }}>
                        → Orientation : {c.orientation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Formulaire de saisie ──────────────────────────────── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <h2><Plus size={16} /> Nouvelle saisie ou brouillon</h2>
            <button type="button" className="btn btn-outline btn-sm" onClick={charger}>
              <RefreshCw size={14} /> Actualiser
            </button>
          </div>
          <form onSubmit={soumettre} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, alignItems: 'end', marginTop: 12 }}>
            <div className="form-group">
              <label>Patient *</label>
              <select
                required
                value={form.utilisateur_id}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({ ...f, utilisateur_id: v, rendez_vous_id: '', _dossier_id: '', bon_id: '' }));
                  chargerHistoriquePatient(v);
                }}
              >
                <option value="">— Patient —</option>
                {patients.map((p) => (
                  <option key={p.id_utilisateur} value={p.id_utilisateur}>
                    {p.prenom} {p.nom}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Rendez-vous *</label>
              <select
                required
                value={form.rendez_vous_id}
                onChange={(e) => {
                  const id = e.target.value;
                  const r = data.rendezVous.find((x) => String(x.id) === String(id));
                  const consult = (data.consultations || []).find(
                    (c) => String(c.rendez_vous_id) === String(id) && c.statut === 'en_cours',
                  );
                  setForm((f) => ({
                    ...f,
                    rendez_vous_id: id,
                    _dossier_id: r ? String(r.dossier_id) : '',
                    date: r?.date_rdv ? String(r.date_rdv).slice(0, 10) : f.date,
                    bon_id: r?.bon_id ? String(r.bon_id) : '',
                    ...(consult
                      ? { diagnostic: consult.diagnostic || '', traitement: consult.traitement || '', orientation: consult.orientation || '' }
                      : { diagnostic: '', traitement: '', orientation: '' }),
                  }));
                }}
              >
                <option value="">— Choisir —</option>
                {rdvEligibles.map((r) => {
                  const encours = (data.consultations || []).some(
                    (c) => String(c.rendez_vous_id) === String(r.id) && c.statut === 'en_cours',
                  );
                  return (
                    <option key={r.id} value={r.id}>
                      #{r.id} · {String(r.date_rdv || '').slice(0, 10)} {r.heure_rdv?.slice?.(0, 5)} · {r.motif}
                      {encours ? ' (brouillon)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" readOnly value={form.date} style={{ background: '#f5f5f5' }} />
            </div>

            {/* M2 — Textarea pour diagnostic et traitement */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Diagnostic *</label>
              <textarea
                required
                rows={4}
                value={form.diagnostic}
                onChange={(e) => setForm({ ...form, diagnostic: e.target.value })}
                placeholder="Décrivez le diagnostic détaillé du patient..."
                style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: 13, padding: '8px 10px', width: '100%', borderRadius: 6, border: '1px solid #ddd' }}
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Traitement prescrit *</label>
              <textarea
                required
                rows={4}
                value={form.traitement}
                onChange={(e) => setForm({ ...form, traitement: e.target.value })}
                placeholder="Médicaments, dosages, durée du traitement, recommandations..."
                style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: 13, padding: '8px 10px', width: '100%', borderRadius: 6, border: '1px solid #ddd' }}
              />
            </div>

            <div className="form-group">
              <label>Orientation <span style={{ fontSize: 11, color: '#888' }}>(optionnel)</span></label>
              <input
                value={form.orientation}
                onChange={(e) => setForm({ ...form, orientation: e.target.value })}
                placeholder="Ex: Spécialiste cardiologie..."
              />
            </div>
            {selectedRdv?.bon_id && (
              <div className="form-group">
                <label>Bon (RDV)</label>
                <input readOnly style={{ background: '#f5f5f5' }} value={selectedRdv.bon?.code_unique || '—'} />
              </div>
            )}
            <button type="submit" className="btn btn-success btn-sm" disabled={saving} style={{ height: 38 }}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </form>
          {selectedRdv && (
            <p style={{ fontSize: 12, color: '#555', marginTop: 10 }}>
              <User size={12} /> Médecin : <strong>vous</strong> (attribué sur ce rendez-vous).
            </p>
          )}
        </div>

        {/* ── Liste consultations ───────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <h2><HeartPulse size={16} /> Liste</h2>
          </div>
          {(!data.consultations || data.consultations.length === 0) ? (
            <div className="empty-state"><p>Aucune consultation.</p></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Date</th>
                  <th>RDV</th>
                  <th>Diagnostic</th>
                  <th>Traitement</th>
                  <th>Statut</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.consultations.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.utilisateur?.prenom} {item.utilisateur?.nom}</strong></td>
                    <td>{item.date_consultation ? new Date(item.date_consultation).toLocaleDateString('fr-FR') : '—'}</td>
                    <td style={{ fontSize: 11 }}>{item.rendez_vous_id ? `#${item.rendez_vous_id}` : '—'}</td>
                    <td style={{ fontSize: 11, maxWidth: 180, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.diagnostic}</td>
                    <td style={{ fontSize: 11, maxWidth: 180, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.traitement}</td>
                    <td><span className="badge badge-attente">{item.statut}</span></td>
                    <td>
                      {item.statut !== 'termine' && (
                        <button type="button" className="btn btn-success btn-sm" onClick={() => terminer(item.id)}>
                          Terminer
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

export default MesConsultations;
