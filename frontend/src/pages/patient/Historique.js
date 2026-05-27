import React, { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import API from '../../api/axios';
import toast from 'react-hot-toast';
import '../../styles/bons.css';
import { History, Search, Filter } from 'lucide-react';

const Historique = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [recherche, setRecherche]       = useState('');
  const [filtre, setFiltre]             = useState('tous');

  useEffect(() => {
    API.get('/patient/historique')
      .then(res => setTransactions((res.data.data && res.data.data.data) || res.data.data || []))
      .catch(() => toast.error('Impossible de charger l\'historique.'))
      .finally(() => setLoading(false));
  }, []);

  const getBadge = (statut) => {
    const map = {
      valide:    'badge-valide',
      expire:    'badge-expire',
      utilise:   'badge-utilise',
      annule:    'badge-annule',
      en_attente:'badge-attente',
      confirmee: 'badge-confirme',
      echouee:   'badge-echoue',
    };
    return map[statut] || 'badge-attente';
  };

  // Chaque item est une Transaction; son Bon est dans t.bon
  const transactionsFiltrees = transactions.filter(t => {
    const statutBon   = t.bon?.statut || '';
    const statutTrans = t.statut || '';
    const codeUnique  = t.bon?.code_unique || '';
    const nomType     = t.bon?.type_bon?.nom || '';

    const matchFiltre = filtre === 'tous'
      || statutBon === filtre
      || statutTrans === filtre;

    const matchRecherche = codeUnique.toLowerCase().includes(recherche.toLowerCase())
      || nomType.toLowerCase().includes(recherche.toLowerCase());

    return matchFiltre && matchRecherche;
  });

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="layout">
      <Navbar />
      <div className="main-content">
        <div className="page-title">
          <h1><History size={22}/> Historique des achats</h1>
          <p>Consultez tous vos bons de consultation</p>
        </div>

        <div className="card">
          {/* Filtres */}
          <div style={{ display:'flex', gap:'12px', marginBottom:'20px', flexWrap:'wrap' }}>
            <div style={{ position:'relative', flex:1, minWidth:'200px' }}>
              <Search size={16} style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'#888' }}/>
              <input
                style={{ paddingLeft:'34px', width:'100%', padding:'9px 9px 9px 34px',
                  border:'1px solid #ccc', borderRadius:'6px', fontSize:'13px' }}
                placeholder="Rechercher par code ou type de bon..."
                value={recherche}
                onChange={e => setRecherche(e.target.value)}
              />
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <Filter size={16} color="#888"/>
              <select value={filtre} onChange={e => setFiltre(e.target.value)}
                style={{ padding:'9px 12px', border:'1px solid #ccc', borderRadius:'6px', fontSize:'13px' }}>
                <option value="tous">Tous les statuts</option>
                <option value="valide">Bon valide</option>
                <option value="utilise">Bon utilisé</option>
                <option value="expire">Bon expiré</option>
                <option value="annule">Bon annulé</option>
                <option value="confirmee">Paiement confirmé</option>
                <option value="echouee">Paiement échoué</option>
              </select>
            </div>
          </div>

          {transactionsFiltrees.length === 0 ? (
            <div className="empty-state">
              <History size={40} color="#ccc"/>
              <p>Aucun historique trouvé.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Code bon</th>
                  <th>Type de bon</th>
                  <th>Montant</th>
                  <th>Opérateur</th>
                  <th>Date achat</th>
                  <th>Expiration</th>
                  <th>Statut bon</th>
                  <th>Statut paiement</th>
                </tr>
              </thead>
              <tbody>
                {transactionsFiltrees.map((t) => (
                  <tr key={t.id || t.id_transaction}>
                    <td>
                      {t.bon?.code_unique
                        ? <code style={{ background:'#f4f4f4', padding:'2px 6px', borderRadius:'4px', fontSize:'12px' }}>{t.bon.code_unique}</code>
                        : <span style={{ color:'#aaa' }}>—</span>
                      }
                    </td>
                    <td>{t.bon?.type_bon?.nom || '—'}</td>
                    <td><strong>{t.montant} FCFA</strong></td>
                    <td>{t.mode_paiement ?? '—'}</td>
                    <td>
                      {t.bon?.date_achat
                        ? new Date(t.bon.date_achat).toLocaleDateString('fr-FR')
                        : new Date(t.created_at).toLocaleDateString('fr-FR')
                      }
                    </td>
                    <td>
                      {t.bon?.date_expiration
                        ? new Date(t.bon.date_expiration).toLocaleDateString('fr-FR')
                        : '—'
                      }
                    </td>
                    <td>
                      {t.bon?.statut
                        ? <span className={`badge ${getBadge(t.bon.statut)}`}>{t.bon.statut}</span>
                        : <span style={{ color:'#aaa' }}>—</span>
                      }
                    </td>
                    <td><span className={`badge ${getBadge(t.statut)}`}>{t.statut}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <p style={{ marginTop:'12px', fontSize:'12px', color:'#888' }}>
            {transactionsFiltrees.length} entrée(s) trouvée(s)
          </p>
        </div>
      </div>
    </div>
  );
};

export default Historique;