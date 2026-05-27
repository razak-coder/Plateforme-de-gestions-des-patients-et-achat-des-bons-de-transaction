import React, { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import API from '../../api/axios';
import toast from 'react-hot-toast';
import '../../styles/bons.css';
import { ShoppingCart, CreditCard, CheckCircle, Loader, FileText } from 'lucide-react';
import QRCode from 'react-qr-code';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const ETAPES = { SELECTION: 1, PAIEMENT: 2, CONFIRMATION: 3 };

const AchatBon = () => {
  const [typesBons, setTypesBons]       = useState([]);
  const [bonChoisi, setBonChoisi]       = useState(null);
  const [telephone, setTelephone]       = useState('');
  const [operateur, setOperateur]       = useState('Flooz');
  const [etape, setEtape]               = useState(ETAPES.SELECTION);
  const [bonGenere, setBonGenere]       = useState(null);
  const [loading, setLoading]           = useState(false);
  const [loadingBons, setLoadingBons]   = useState(true);

  useEffect(() => {
    API.get('/patient/type-bons')
      .then(res => setTypesBons(res.data.data))
      .catch(() => toast.error('Impossible de charger les types de bons.'))
      .finally(() => setLoadingBons(false));
  }, []);

  const selectionnerBon = (bon) => {
    setBonChoisi(bon);
    setEtape(ETAPES.PAIEMENT);
  };

  const handlePaiement = async (e) => {
    e.preventDefault();
    if (!telephone) {
      toast.error('Veuillez saisir votre numéro de téléphone.');
      return;
    }
    setLoading(true);
    try {
      const res = await API.post('/patient/bons/acheter', {
        type_bon_id: bonChoisi.id,
        methode_paiement: 'mobile_money',
        numero_telephone: telephone,
      });
      setBonGenere(res.data.bon);
      setEtape(ETAPES.CONFIRMATION);
      toast.success('Bon acheté avec succès !');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors du paiement.');
    } finally {
      setLoading(false);
    }
  };

  const recommencer = () => {
    setBonChoisi(null);
    setTelephone('');
    setBonGenere(null);
    setEtape(ETAPES.SELECTION);
  };

  const genererPDF = async () => {
    const element = document.getElementById('recu-bon-pdf');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      // Ajout de marge supérieure pour l'esthétique
      pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
      pdf.save(`Reçu_Bon_${bonGenere.code_unique}.pdf`);
      toast.success('Le PDF a été généré avec succès.');
    } catch (err) {
      toast.error('Erreur lors de la génération du PDF.');
    }
  };

  if (loadingBons) return <div className="loading">Chargement...</div>;

  return (
    <div className="layout">
      <Navbar />
      <div className="main-content">
        <div className="page-title">
          <h1><ShoppingCart size={22}/> Acheter un bon</h1>
          <p>Sélectionnez un type de bon et effectuez votre paiement via Mobile Money</p>
        </div>

        {/* Indicateur d'étapes */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'28px' }}>
          {['Sélection', 'Paiement', 'Confirmation'].map((label, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', borderRadius: '20px', fontSize: '13px',
              background: etape === i+1 ? '#1F5C9E' : etape > i+1 ? '#1A7A4A' : '#eeeeee',
              color:      etape >= i+1 ? '#fff' : '#aaa',
              fontWeight: etape === i+1 ? 'bold' : 'normal',
            }}>
              <span>{i+1}</span> {label}
            </div>
          ))}
        </div>

        {/* ÉTAPE 1 — Sélection */}
        {etape === ETAPES.SELECTION && (
          <div>
            {typesBons.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <CreditCard size={40} color="#ccc"/>
                  <p>Aucun bon disponible pour le moment.</p>
                </div>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'16px' }}>
                {typesBons.map((bon) => (
                  <div key={bon.id} className="card" style={{ cursor:'pointer', transition:'transform 0.2s, box-shadow 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
                  >
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' }}>
                      <div style={{ background:'#eaf2fb', borderRadius:'8px', padding:'10px' }}>
                        <CreditCard size={24} color="#1F5C9E"/>
                      </div>
                      <span className="badge badge-valide">Disponible</span>
                    </div>
                    <h3 style={{ fontSize:'16px', color:'#222', marginBottom:'6px' }}>{bon.nom}</h3>
                    {bon.specialite && (
                      <p style={{ fontSize:'12px', color:'#1F5C9E', fontWeight:600, marginBottom:'6px' }}>
                        Spécialité : {bon.specialite}
                      </p>
                    )}
                    <p style={{ fontSize:'24px', fontWeight:'bold', color:'#1F5C9E', marginBottom:'4px' }}>
                      {bon.prix} <span style={{ fontSize:'14px' }}>FCFA</span>
                    </p>
                    <p style={{ fontSize:'12px', color:'#888', marginBottom:'16px' }}>
                      Validité : {bon.validite_jours} jours
                    </p>
                    <button className="btn btn-primary" style={{ width:'100%' }}
                      onClick={() => selectionnerBon(bon)}>
                      <ShoppingCart size={16}/> Acheter
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ÉTAPE 2 — Paiement */}
        {etape === ETAPES.PAIEMENT && bonChoisi && (
          <div style={{ maxWidth:'480px' }}>
            <div className="card" style={{ marginBottom:'16px', background:'#eaf2fb', border:'1px solid #b5d4f4' }}>
              <p style={{ fontWeight:'bold', color:'#1F5C9E', marginBottom:'4px' }}>{bonChoisi.nom}</p>
              <p style={{ fontSize:'13px', color:'#555', marginBottom:'6px' }}>
                Spécialité liée : <strong>{bonChoisi.specialite}</strong>
              </p>
              <p style={{ fontSize:'22px', fontWeight:'bold', color:'#1F5C9E' }}>{bonChoisi.prix} FCFA</p>
              <p style={{ fontSize:'12px', color:'#555', marginTop:'4px' }}>Validité : {bonChoisi.validite_jours} jours</p>
            </div>

            <div className="card">
              <div className="card-header">
                <h2><CreditCard size={18}/> Paiement Mobile Money</h2>
              </div>
              <form onSubmit={handlePaiement}>
                <div className="form-group">
                  <label>Opérateur</label>
                  <select value={operateur} onChange={e => setOperateur(e.target.value)}>
                    <option value="Flooz">Flooz (Moov)</option>
                    <option value="TMoney">TMoney (Togocel)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Numéro de téléphone</label>
                  <input type="tel" value={telephone}
                    onChange={e => setTelephone(e.target.value)}
                    placeholder="+228 XX XX XX XX" required />
                </div>

                <div className="alert alert-info">
                  Vous recevrez une demande de confirmation sur votre téléphone. Saisissez votre code PIN pour valider.
                </div>

                <div style={{ display:'flex', gap:'12px' }}>
                  <button type="button" className="btn btn-secondary"
                    onClick={() => setEtape(ETAPES.SELECTION)}>
                    Retour
                  </button>
                  <button type="submit" className="btn btn-success" disabled={loading}
                    style={{ flex:1 }}>
                    {loading ? <><Loader size={16}/> Traitement...</> : <><CheckCircle size={16}/> Confirmer le paiement</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ÉTAPE 3 — Confirmation */}
        {etape === ETAPES.CONFIRMATION && bonGenere && (
          <div style={{ maxWidth:'480px' }}>
            <div className="card" style={{ textAlign:'center', padding:'40px' }}>
              <div style={{ background:'#eafaf1', borderRadius:'50%', width:'72px', height:'72px',
                display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                <CheckCircle size={40} color="#1A7A4A"/>
              </div>
              <h2 style={{ color:'#1A7A4A', marginBottom:'8px' }}>Paiement réussi !</h2>
              <p style={{ color:'#888', marginBottom:'24px' }}>Votre bon a été généré avec succès.</p>

              <div id="recu-bon-pdf" style={{ background:'#f8f9fa', borderRadius:'8px', padding:'20px', marginBottom:'24px', textAlign:'left' }}>
                <div style={{ marginBottom: '20px', textAlign: 'center', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
                  <h3 style={{ margin: 0, color: '#1F5C9E' }}>CTM-Consult</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#555' }}>Reçu d'Achat de Bon</p>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                  <div>
                    <p style={{ fontSize:'11px', color:'#888', marginBottom:'8px' }}>Code unique & QR</p>
                    <p style={{ fontWeight:'bold', fontSize:'13px', color:'#1F5C9E', marginBottom:'8px' }}>{bonGenere.code_unique}</p>
                    <div style={{ background: '#fff', padding: '10px', display: 'inline-block', borderRadius: '8px' }}>
                      <QRCode value={bonGenere.code_unique} size={100} />
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize:'11px', color:'#888' }}>Statut</p>
                    <span className="badge badge-valide">{bonGenere.statut}</span>
                  </div>
                  <div>
                    <p style={{ fontSize:'11px', color:'#888' }}>Date d'achat</p>
                    <p style={{ fontWeight:'bold', fontSize:'13px' }}>
                      {new Date(bonGenere.date_achat).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize:'11px', color:'#888' }}>Date d'expiration</p>
                    <p style={{ fontWeight:'bold', fontSize:'13px' }}>
                      {new Date(bonGenere.date_expiration).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="alert alert-info" style={{ textAlign:'left' }}>
                Un SMS et un email de confirmation vous ont été envoyés.
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={genererPDF}>
                  <FileText size={16}/> Télécharger PDF
                </button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={recommencer}>
                  <ShoppingCart size={16}/> Autre bon
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AchatBon;