import React, { useEffect, useMemo, useState } from 'react';
import {
  Stethoscope, Plus, RefreshCw, Search, UserCheck, UserX,
  Clock, Trash2, Edit, ChevronDown, ChevronUp, X, CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';
import API from '../../api/axios';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const JOURS_LABELS = { lundi: 'Lun', mardi: 'Mar', mercredi: 'Mer', jeudi: 'Jeu', vendredi: 'Ven', samedi: 'Sam', dimanche: 'Dim' };

const formVide = {
  nom: '', prenom: '', specialite: '', email: '', telephone: '',
  numero_ordre: '', bio: '', statut: 'actif', disponibilites: [],
};

const dispoVide = { jour_semaine: 'lundi', heure_debut: '08:00', heure_fin: '12:00' };

const GestionMedecins = () => {
  const [medecins, setMedecins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const [filtreSpecialite, setFiltreSpecialite] = useState('');
  const [specialites, setSpecialites] = useState([]);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [edition, setEdition] = useState(null);
  const [form, setForm] = useState(formVide);
  const [traitement, setTraitement] = useState(false);
  const [medecinDetail, setMedecinDetail] = useState(null);
  const [dispoDate, setDispoDate] = useState('');
  const [creneaux, setCreneaux] = useState([]);
  const [loadingCreneaux, setLoadingCreneaux] = useState(false);

  const charger = async () => {
    setLoading(true);
    try {
      const [resMed, resSpe] = await Promise.all([
        API.get('/admin/medecins?per_page=100'),
        API.get('/admin/medecins/specialites'),
      ]);
      setMedecins(resMed.data.data?.data || resMed.data.data || []);
      setSpecialites(resSpe.data.data || []);
    } catch {
      toast.error('Impossible de charger les médecins.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { charger(); }, []);

  const ouvrirCreation = () => {
    setEdition(null);
    setForm(formVide);
    setModalOuvert(true);
  };

  const ouvrirEdition = (medecin) => {
    setEdition(medecin);
    setForm({
      nom: medecin.nom || '',
      prenom: medecin.prenom || '',
      specialite: medecin.specialite || '',
      email: medecin.email || '',
      telephone: medecin.telephone || '',
      numero_ordre: medecin.numero_ordre || '',
      bio: medecin.bio || '',
      statut: medecin.statut || 'actif',
      disponibilites: (medecin.disponibilites || []).map(d => ({
        jour_semaine: d.jour_semaine,
        heure_debut: d.heure_debut?.slice(0, 5) || '08:00',
        heure_fin: d.heure_fin?.slice(0, 5) || '12:00',
      })),
    });
    setModalOuvert(true);
  };

  const ajouterDispo = () => {
    setForm(f => ({ ...f, disponibilites: [...f.disponibilites, { ...dispoVide }] }));
  };

  const supprimerDispo = (idx) => {
    setForm(f => ({ ...f, disponibilites: f.disponibilites.filter((_, i) => i !== idx) }));
  };

  const modifierDispo = (idx, champ, valeur) => {
    setForm(f => ({
      ...f,
      disponibilites: f.disponibilites.map((d, i) => i === idx ? { ...d, [champ]: valeur } : d),
    }));
  };

  const soumettre = async (e) => {
    e.preventDefault();
    setTraitement(true);
    try {
      if (edition) {
        await API.put(`/admin/medecins/${edition.id}`, form);
        toast.success('Médecin mis à jour.');
      } else {
        await API.post('/admin/medecins', form);
        toast.success('Médecin créé avec succès.');
      }
      setModalOuvert(false);
      charger();
    } catch (err) {
      const msg = err.response?.data?.message || Object.values(err.response?.data?.errors || {})[0]?.[0];
      toast.error(msg || 'Erreur lors de la sauvegarde.');
    } finally {
      setTraitement(false);
    }
  };

  const toggleStatut = async (medecin) => {
    const nouveau = medecin.statut === 'actif' ? 'inactif' : 'actif';
    if (!window.confirm(`${nouveau === 'inactif' ? 'Désactiver' : 'Activer'} ce médecin ?`)) return;
    try {
      await API.put(`/admin/medecins/${medecin.id}`, { statut: nouveau });
      toast.success(`Médecin ${nouveau === 'actif' ? 'activé' : 'désactivé'}.`);
      charger();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.');
    }
  };

  const voirCreneaux = async (medecin, date) => {
    if (!date) return;
    setLoadingCreneaux(true);
    setMedecinDetail(medecin);
    try {
      const res = await API.get(`/admin/medecins/${medecin.id}/disponibilites?date=${date}`);
      setCreneaux(res.data.creneaux || []);
    } catch {
      toast.error('Impossible de charger les créneaux.');
      setCreneaux([]);
    } finally {
      setLoadingCreneaux(false);
    }
  };

  const medecinsFiltres = useMemo(() => {
    let liste = medecins;
    if (filtreStatut !== 'tous') liste = liste.filter(m => m.statut === filtreStatut);
    if (filtreSpecialite) liste = liste.filter(m => m.specialite === filtreSpecialite);
    if (recherche) {
      const t = recherche.toLowerCase();
      liste = liste.filter(m =>
        m.nom?.toLowerCase().includes(t) ||
        m.prenom?.toLowerCase().includes(t) ||
        m.email?.toLowerCase().includes(t) ||
        m.specialite?.toLowerCase().includes(t)
      );
    }
    return liste;
  }, [medecins, filtreStatut, filtreSpecialite, recherche]);

  if (loading) return <div className="loading">Chargement des médecins...</div>;

  return (
    <div className="layout">
      <Navbar />
      <div className="main-content">
        <div className="page-title">
          <h1><Stethoscope size={22} /> Gestion des médecins</h1>
          <p>Inscrivez les médecins, gérez leurs créneaux de disponibilité et suivez leurs rendez-vous.</p>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom: 16 }}>
          <div className="stat-card"><div className="stat-info"><p>{medecins.length}</p><p>Total médecins</p></div></div>
          <div className="stat-card"><div className="stat-info"><p>{medecins.filter(m => m.statut === 'actif').length}</p><p>Actifs</p></div></div>
          <div className="stat-card"><div className="stat-info"><p>{specialites.length}</p><p>Spécialités</p></div></div>
        </div>

        <div className="card">
          {/* Filtres */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
              <input
                style={{ paddingLeft: 32, width: '100%', padding: '9px 9px 9px 32px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13 }}
                placeholder="Rechercher (nom, spécialité, email)..."
                value={recherche}
                onChange={e => setRecherche(e.target.value)}
              />
            </div>
            <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}
              style={{ padding: '9px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13 }}>
              <option value="tous">Tous les statuts</option>
              <option value="actif">Actifs</option>
              <option value="inactif">Inactifs</option>
            </select>
            <select value={filtreSpecialite} onChange={e => setFiltreSpecialite(e.target.value)}
              style={{ padding: '9px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13 }}>
              <option value="">Toutes spécialités</option>
              {specialites.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="btn btn-outline btn-sm" onClick={charger}><RefreshCw size={14} /> Actualiser</button>
            <button className="btn btn-primary btn-sm" onClick={ouvrirCreation}><Plus size={14} /> Nouveau médecin</button>
          </div>

          {/* Vérificateur de créneaux */}
          <div style={{ background: '#f0f7ff', border: '1px solid #b5d4f4', borderRadius: 8, padding: 14, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Clock size={18} color="#1F5C9E" />
            <strong style={{ fontSize: 13, color: '#1F5C9E' }}>Vérifier disponibilité</strong>
            <select value={medecinDetail?.id || ''} onChange={e => {
              const m = medecins.find(x => String(x.id) === e.target.value);
              setMedecinDetail(m || null);
              setCreneaux([]);
            }} style={{ padding: '7px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13 }}>
              <option value="">Choisir un médecin</option>
              {medecins.filter(m => m.statut === 'actif').map(m => <option key={m.id} value={m.id}>{m.nom_complet}</option>)}
            </select>
            <input type="date" value={dispoDate} min={new Date().toISOString().split('T')[0]}
              onChange={e => { setDispoDate(e.target.value); if (medecinDetail) voirCreneaux(medecinDetail, e.target.value); }}
              style={{ padding: '7px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13 }} />
          </div>

          {creneaux.length > 0 && (
            <div style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {creneaux.map(c => (
                <span key={c.heure} style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 'bold',
                  background: c.disponible ? '#eafaf1' : '#fdecea',
                  color: c.disponible ? '#1A7A4A' : '#C0392B',
                  border: `1px solid ${c.disponible ? '#1A7A4A' : '#C0392B'}`,
                }}>
                  {c.heure} {c.disponible ? '✓' : '✗'}
                </span>
              ))}
              {loadingCreneaux && <span style={{ fontSize: 12, color: '#888' }}>Chargement...</span>}
            </div>
          )}

          {/* Tableau */}
          {medecinsFiltres.length === 0 ? (
            <div className="empty-state"><Stethoscope size={40} color="#ccc" /><p>Aucun médecin trouvé.</p></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Médecin</th>
                  <th>Spécialité</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>N° Ordre</th>
                  <th>Disponibilités</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {medecinsFiltres.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#eaf2fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 12, color: '#1F5C9E' }}>
                          {m.prenom?.charAt(0)}{m.nom?.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{m.prenom} {m.nom}</div>
                          <div style={{ fontSize: 11, color: '#888' }}>Dr</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge" style={{ background: '#f0f0ff', color: '#5050cc' }}>{m.specialite}</span></td>
                    <td style={{ fontSize: 12 }}>{m.email}</td>
                    <td style={{ fontSize: 12 }}>{m.telephone || '—'}</td>
                    <td style={{ fontSize: 12 }}>{m.numero_ordre || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(m.disponibilites || []).length === 0
                          ? <span style={{ color: '#aaa', fontSize: 11 }}>Aucune</span>
                          : (m.disponibilites || []).map((d, i) => (
                            <span key={i} style={{ fontSize: 10, background: '#eaf2fb', color: '#1F5C9E', padding: '2px 6px', borderRadius: 10 }}>
                              {JOURS_LABELS[d.jour_semaine]} {d.heure_debut?.slice(0,5)}-{d.heure_fin?.slice(0,5)}
                            </span>
                          ))
                        }
                      </div>
                    </td>
                    <td><span className={`badge ${m.statut === 'actif' ? 'badge-valide' : 'badge-annule'}`}>{m.statut}</span></td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => ouvrirEdition(m)}><Edit size={13} /></button>
                      <button className={`btn btn-sm ${m.statut === 'actif' ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleStatut(m)}>
                        {m.statut === 'actif' ? <UserX size={13} /> : <UserCheck size={13} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={{ marginTop: 10, fontSize: 12, color: '#888' }}>{medecinsFiltres.length} médecin(s) affiché(s)</p>
        </div>
      </div>

      {/* Modal Création / Édition */}
      {modalOuvert && (
        <div className="modal-overlay" onClick={() => setModalOuvert(false)}>
          <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Stethoscope size={16} /> {edition ? 'Modifier le médecin' : 'Nouveau médecin'}</h3>
              <button className="modal-close" onClick={() => setModalOuvert(false)}><X size={16} /></button>
            </div>

            <form onSubmit={soumettre}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                {[
                  { label: 'Prénom *', key: 'prenom', required: true },
                  { label: 'Nom *', key: 'nom', required: true },
                  { label: 'Spécialité *', key: 'specialite', required: true },
                  { label: 'Email *', key: 'email', type: 'email', required: true },
                  { label: 'Téléphone', key: 'telephone' },
                  { label: 'N° Ordre médical', key: 'numero_ordre' },
                ].map(({ label, key, type = 'text', required }) => (
                  <div className="form-group" key={key}>
                    <label>{label}</label>
                    <input type={type} value={form[key]} required={required}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      placeholder={label.replace(' *', '')} />
                  </div>
                ))}

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Biographie / Présentation</label>
                  <textarea value={form.bio} rows={2}
                    onChange={e => setForm({ ...form, bio: e.target.value })}
                    placeholder="Formations, expériences..." style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 13 }} />
                </div>

                <div className="form-group">
                  <label>Statut</label>
                  <select value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })}>
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                  </select>
                </div>
              </div>

              {/* Créneaux de disponibilité */}
              <div style={{ marginTop: 20, borderTop: '1px solid #eee', paddingTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <strong style={{ fontSize: 14 }}>Créneaux de disponibilité</strong>
                  <button type="button" className="btn btn-outline btn-sm" onClick={ajouterDispo}><Plus size={13} /> Ajouter</button>
                </div>

                {form.disponibilites.length === 0 && (
                  <p style={{ color: '#aaa', fontSize: 12, marginBottom: 8 }}>Aucun créneau ajouté. Cliquez sur "Ajouter" pour définir les disponibilités.</p>
                )}

                {form.disponibilites.map((d, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'end', marginBottom: 8, background: '#f8f9fa', padding: '10px 12px', borderRadius: 6 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: 11 }}>Jour</label>
                      <select value={d.jour_semaine} onChange={e => modifierDispo(idx, 'jour_semaine', e.target.value)}>
                        {JOURS.map(j => <option key={j} value={j}>{j.charAt(0).toUpperCase() + j.slice(1)}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: 11 }}>Heure début</label>
                      <input type="time" value={d.heure_debut} onChange={e => modifierDispo(idx, 'heure_debut', e.target.value)} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: 11 }}>Heure fin</label>
                      <input type="time" value={d.heure_fin} onChange={e => modifierDispo(idx, 'heure_fin', e.target.value)} />
                    </div>
                    <button type="button" onClick={() => supprimerDispo(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C0392B', padding: 4 }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setModalOuvert(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={traitement}>
                  {traitement ? '...' : <><CheckCircle size={14} /> {edition ? 'Enregistrer' : 'Créer le médecin'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionMedecins;
