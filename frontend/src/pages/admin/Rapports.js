import React, { useState } from 'react';
import Navbar from '../../components/Navbar';
import API from '../../api/axios';
import toast from 'react-hot-toast';
import {
  FileText, TrendingUp, CreditCard,
  Users, Download, Search
} from 'lucide-react';

const Rapports = () => {
  const [dateDebut, setDateDebut]   = useState('');
  const [dateFin, setDateFin]       = useState('');
  const [rapport, setRapport]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [exporting, setExporting]   = useState(false);

  const genererRapport = async (e) => {
    e.preventDefault();
    if (!dateDebut || !dateFin) {
      toast.error('Veuillez sélectionner une période.');
      return;
    }
    if (new Date(dateDebut) > new Date(dateFin)) {
      toast.error('La date de début doit être avant la date de fin.');
      return;
    }
    setLoading(true);
    try {
      const res = await API.post('/admin/rapports/generer', {
        titre:      `Rapport du ${dateDebut} au ${dateFin}`,
        type:       'personnalise',
        date_debut: dateDebut,
        date_fin:   dateFin,
      });
      // Le backend retourne { success, data: rapport }
      // On reconstruit un objet plat pour l'affichage
      const d = res.data.data?.donnees || {};
      setRapport({
        nb_transactions:    d.transactions?.total   ?? 0,
        montant_total:      d.transactions?.montant_total ?? 0,
        nb_bons_generes:    d.bons?.total            ?? 0,
        nb_bons_annules:    d.bons?.expires          ?? 0,
        nb_patients_actifs: d.utilisateurs?.nouveaux ?? 0,
        taux_succes:        d.transactions?.total
          ? Math.round((d.transactions?.reussies / d.transactions?.total) * 100)
          : 0,
        par_operateur: null,
        transactions:  null,
      });
      toast.success('Rapport généré avec succès.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la génération.');
    } finally {
      setLoading(false);
    }
  };

  const exporterRapport = async (format) => {
    setExporting(true);
    try {
      const res = await API.get('/admin/rapports/exporter', {
        params:       { date_debut: dateDebut, date_fin: dateFin, format },
        responseType: 'blob',
      });
      const url      = window.URL.createObjectURL(new Blob([res.data]));
      const link     = document.createElement('a');
      link.href      = url;
      link.setAttribute('download', `rapport_${dateDebut}_${dateFin}.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Export ${format.toUpperCase()} téléchargé.`);
    } catch {
      toast.error('Erreur lors de l\'export.');
    } finally {
      setExporting(false);
    }
  };

  const getBadge = (statut) => {
    const map = {
      valide:     'badge-valide',
      expire:     'badge-expire',
      utilise:    'badge-utilise',
      annule:     'badge-annule',
      en_attente: 'badge-attente',
      confirmee:  'badge-confirme',
      echouee:    'badge-echoue',
    };
    return map[statut] || 'badge-attente';
  };

  return (
    <div className="layout">
      <Navbar />
      <div className="main-content">

        <div className="page-title">
          <h1><FileText size={22}/> Rapports et statistiques</h1>
          <p>Générez des rapports sur les transactions et les bons</p>
        </div>

        {/* Formulaire période */}
        <div className="card">
          <div className="card-header">
            <h2><Search size={18}/> Paramètres du rapport</h2>
          </div>
          <form onSubmit={genererRapport}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
              <div className="form-group">
                <label>Date de début</label>
                <input type="date" value={dateDebut}
                  onChange={e => setDateDebut(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Date de fin</label>
                <input type="date" value={dateFin}
                  onChange={e => setDateFin(e.target.value)} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <TrendingUp size={16}/>
              {loading ? 'Génération...' : 'Générer le rapport'}
            </button>
          </form>
        </div>

        {/* Résultats */}
        {rapport && (
          <>
            {/* Stats du rapport */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon blue"><CreditCard size={22}/></div>
                <div className="stat-info">
                  <p>{rapport.nb_transactions ?? 0}</p>
                  <p>Transactions totales</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green"><TrendingUp size={22}/></div>
                <div className="stat-info">
                  <p>{rapport.montant_total ?? 0} FCFA</p>
                  <p>Montant total collecté</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green"><CreditCard size={22}/></div>
                <div className="stat-info">
                  <p>{rapport.nb_bons_generes ?? 0}</p>
                  <p>Bons générés</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon red"><CreditCard size={22}/></div>
                <div className="stat-info">
                  <p>{rapport.nb_bons_annules ?? 0}</p>
                  <p>Bons annulés</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon blue"><Users size={22}/></div>
                <div className="stat-info">
                  <p>{rapport.nb_patients_actifs ?? 0}</p>
                  <p>Patients actifs</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon orange"><TrendingUp size={22}/></div>
                <div className="stat-info">
                  <p>{rapport.taux_succes ?? 0}%</p>
                  <p>Taux de succès paiements</p>
                </div>
              </div>
            </div>

            {/* Répartition par opérateur */}
            {rapport.par_operateur && (
              <div className="card">
                <div className="card-header">
                  <h2><TrendingUp size={18}/> Répartition par opérateur Mobile Money</h2>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
                  {rapport.par_operateur.map((op) => (
                    <div key={op.mode_paiement} style={{
                      background:'#f8f9fa', borderRadius:'8px',
                      padding:'16px', display:'flex',
                      justifyContent:'space-between', alignItems:'center'
                    }}>
                      <div>
                        <p style={{ fontWeight:'bold', fontSize:'15px' }}>{op.mode_paiement}</p>
                        <p style={{ fontSize:'12px', color:'#888' }}>{op.nb_transactions} transactions</p>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <p style={{ fontWeight:'bold', color:'#1F5C9E', fontSize:'16px' }}>
                          {op.montant_total} FCFA
                        </p>
                        <p style={{ fontSize:'12px', color:'#888' }}>
                          {op.pourcentage ?? 0}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tableau des transactions */}
            {rapport.transactions && rapport.transactions.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h2><CreditCard size={18}/> Détail des transactions</h2>
                  <div style={{ display:'flex', gap:'8px' }}>
                    <button className="btn btn-danger btn-sm"
                      disabled={exporting} onClick={() => exporterRapport('pdf')}>
                      <Download size={14}/> PDF
                    </button>
                    <button className="btn btn-success btn-sm"
                      disabled={exporting} onClick={() => exporterRapport('excel')}>
                      <Download size={14}/> Excel
                    </button>
                  </div>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Patient</th>
                      <th>Type de bon</th>
                      <th>Montant</th>
                      <th>Opérateur</th>
                      <th>Référence</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rapport.transactions.map((t) => (
                      <tr key={t.id_transaction}>
                        <td>{new Date(t.date_transaction).toLocaleDateString('fr-FR')}</td>
                        <td>{t.patient?.prenom} {t.patient?.nom}</td>
                        <td>{t.bon?.type_bon?.intitule ?? '—'}</td>
                        <td><strong>{t.montant} FCFA</strong></td>
                        <td>{t.mode_paiement}</td>
                        <td>
                          <code style={{ fontSize:'11px', background:'#f4f4f4',
                            padding:'2px 6px', borderRadius:'4px' }}>
                            {t.reference_mobile_money ?? '—'}
                          </code>
                        </td>
                        <td>
                          <span className={`badge ${getBadge(t.statut)}`}>{t.statut}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ marginTop:'12px', fontSize:'12px', color:'#888' }}>
                  {rapport.transactions.length} transaction(s)
                </p>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};
export default Rapports;

