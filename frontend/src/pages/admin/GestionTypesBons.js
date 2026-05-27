import React, { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import API from '../../api/axios';
import toast from 'react-hot-toast';
import { CreditCard, Plus, Pencil, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';

const GestionTypesBons = () => {
  const [typesBons, setTypesBons]   = useState([]);
  const [listeSpecialites, setListeSpecialites] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [modeEdition, setModeEdition] = useState(false);
  const [traitement, setTraitement] = useState(false);
  const [form, setForm] = useState({ nom:'', description:'', prix:'', specialite:'', validite_jours:'' });
  const [idEdition, setIdEdition]   = useState(null);

  const charger = async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/type-bons');
      setTypesBons(res.data.data || []);
    } catch {
      toast.error('Impossible de charger les types de bons.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    charger();
    API.get('/admin/medecins/specialites')
      .then((r) => setListeSpecialites(r.data.data || []))
      .catch(() => {});
  }, []);

  const ouvrirCreation = () => {
    setForm({ nom:'', description:'', prix:'', specialite:'', validite_jours:'' });
    setModeEdition(false);
    setIdEdition(null);
    setModalOuvert(true);
  };

  const ouvrirEdition = (bon) => {
    setForm({ nom: bon.nom, description: bon.description || '', prix: bon.prix, specialite: bon.specialite || '', validite_jours: bon.validite_jours });
    setModeEdition(true);
    setIdEdition(bon.id);
    setModalOuvert(true);
  };

  const fermerModal = () => {
    setModalOuvert(false);
    setForm({ nom:'', description:'', prix:'', specialite:'', validite_jours:'' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!(form.specialite || '').trim()) {
      toast.error('La spécialité médicale est obligatoire.');
      return;
    }
    setTraitement(true);
    try {
      const payload = { ...form, specialite: (form.specialite || '').trim() };
      if (modeEdition) {
        await API.put(`/admin/type-bons/${idEdition}`, payload);
        toast.success('Type de bon modifié avec succès.');
      } else {
        await API.post('/admin/type-bons', payload);
        toast.success('Type de bon créé avec succès.');
      }
      fermerModal();
      charger();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setTraitement(false);
    }
  };

  const toggleStatut = async (bon) => {
    const nouveauStatut = !bon.actif;
    try {
      await API.put(`/admin/type-bons/${bon.id}`, { actif: nouveauStatut });
      toast.success(`Type de bon ${!nouveauStatut ? 'désactivé' : 'activé'}.`);
      charger();
    } catch {
      toast.error('Erreur lors de la modification du statut.');
    }
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="layout">
      <Navbar />
      <div className="main-content">

        <div className="page-title">
          <h1><CreditCard size={22}/> Types de bons</h1>
          <p>Créez et gérez les types de bons de consultation</p>
        </div>

        <div className="card">
          <div className="card-header">
            <h2><CreditCard size={18}/> Liste des types de bons</h2>
            <button className="btn btn-success btn-sm" onClick={ouvrirCreation}>
              <Plus size={14}/> Nouveau type
            </button>
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'12px' }}>
            <button className="btn btn-outline btn-sm" onClick={charger}>
              <RefreshCw size={14}/> Actualiser
            </button>
          </div>

          {typesBons.length === 0 ? (
            <div className="empty-state">
              <CreditCard size={40} color="#ccc"/>
              <p>Aucun type de bon configuré.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Intitulé</th>
                  <th>Montant (FCFA)</th>
                  <th>Validité (jours)</th>
                  <th>Spécialité</th>
                  <th>Date création</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {typesBons.map((bon) => (
                  <tr key={bon.id}>
                    <td><strong>{bon.nom}</strong></td>
                    <td>{bon.prix} FCFA</td>
                    <td>{bon.validite_jours} jours</td>
                    <td><span className="badge badge-confirme">{bon.specialite?.trim() || '—'}</span></td>
                    <td>{new Date(bon.created_at).toLocaleDateString('fr-FR')}</td>
                    <td>
                      <span className={`badge ${bon.actif ? 'badge-valide' : 'badge-annule'}`}>
                        {bon.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td style={{ display:'flex', gap:'6px' }}>
                      <button className="btn btn-primary btn-sm"
                        onClick={() => ouvrirEdition(bon)}>
                        <Pencil size={13}/> Modifier
                      </button>
                      <button
                        className={`btn btn-sm ${bon.actif ? 'btn-warning' : 'btn-success'}`}
                        onClick={() => toggleStatut(bon)}>
                        {bon.actif
                          ? <><ToggleLeft size={13}/> Désactiver</>
                          : <><ToggleRight size={13}/> Activer</>
                        }
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal création/édition */}
        {modalOuvert && (
          <div className="modal-overlay" onClick={fermerModal}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3><CreditCard size={16}/>
                  {modeEdition ? ' Modifier le type de bon' : ' Nouveau type de bon'}
                </h3>
                <button className="modal-close" onClick={fermerModal}>✕</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Intitulé</label>
                  <input type="text" value={form.nom}
                    onChange={e => setForm({...form, nom: e.target.value})}
                    placeholder="Ex: Consultation générale" required />
                </div>
                <div className="form-group">
                  <label>Description <span style={{fontSize:'11px',color:'#999'}}>(optionnel)</span></label>
                  <textarea value={form.description} rows={2}
                    onChange={e => setForm({...form, description: e.target.value})}
                    placeholder="Ex: Bon valable pour une consultation avec n'importe quel médecin généraliste"
                    style={{ width:'100%', padding:'8px', border:'1px solid #ccc', borderRadius:'6px', fontSize:'13px', resize:'vertical' }}/>
                </div>
                <div className="form-group">
                  <label>Spécialité médicale *</label>
                  <input
                    type="text"
                    required
                    value={form.specialite}
                    onChange={(e) => setForm({ ...form, specialite: e.target.value })}
                    placeholder="Liste des médecins ou saisie libre (ex: Cardiologie)"
                    list="gestion-types-bons-specialites"
                  />
                  <datalist id="gestion-types-bons-specialites">
                    {listeSpecialites.map((sp) => (
                      <option key={sp} value={sp} />
                    ))}
                  </datalist>
                  <small style={{ fontSize: 11, color: '#888' }}>
                    Alignez la valeur sur la spécialité des médecins (ex: même libellé que dans « Médecins ») pour lier automatiquement le bon aux consultations concernées.
                  </small>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                  <div className="form-group">
                    <label>Montant (FCFA)</label>
                    <input type="number" min="0" value={form.prix}
                      onChange={e => setForm({...form, prix: e.target.value})}
                      placeholder="Ex: 2000" required />
                  </div>
                  <div className="form-group">
                    <label>Durée de validité (jours)</label>
                    <input type="number" min="1" value={form.validite_jours}
                      onChange={e => setForm({...form, validite_jours: e.target.value})}
                      placeholder="Ex: 30" required />
                  </div>
                </div>
                <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'8px' }}>
                  <button type="button" className="btn btn-secondary btn-sm"
                    onClick={fermerModal}>Annuler</button>
                  <button type="submit" className="btn btn-success btn-sm" disabled={traitement}>
                    {traitement ? 'Sauvegarde...' : modeEdition ? 'Modifier' : 'Créer'}
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

export default GestionTypesBons;
