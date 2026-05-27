import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { Html5QrcodeScanner } from 'html5-qrcode';
import API from '../../api/axios';
import toast from 'react-hot-toast';
import {
  QrCode, CheckCircle, XCircle, RefreshCw, User, CreditCard,
  CalendarDays, ArrowRight, Keyboard, Clock, AlertCircle,
} from 'lucide-react';

/* ─── Sous-composant scanner camera ─────────────────────────── */
const ScannerCore = ({ onScanSuccess }) => {
  const scannerRef = useRef(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      const scanner = new Html5QrcodeScanner('qr-reader', {
        qrbox: { width: 260, height: 260 },
        fps: 8,
      });
      scannerRef.current = scanner;
      scanner.render((result) => onScanSuccess(result), () => {});
    }, 100);
    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [onScanSuccess]);
  return (
    <div>
      <div id="qr-reader" style={{ borderRadius: 12, overflow: 'hidden' }} />
      <p style={{ textAlign: 'center', marginTop: 14, color: '#666', fontSize: 13 }}>
        📷 Positionnez le QR Code dans le cadre pour le scanner automatiquement.
      </p>
    </div>
  );
};

/* ─── Étape de chronologie ──────────────────────────────────── */
const EtapeChrono = ({ numero, titre, description, statut }) => {
  const couleurs = {
    fait:       { bg: '#eafaf1', border: '#27ae60', icone: '#27ae60' },
    en_cours:   { bg: '#eaf2fb', border: '#1F5C9E', icone: '#1F5C9E' },
    attente:    { bg: '#f5f5f5', border: '#ddd',    icone: '#bbb'    },
    erreur:     { bg: '#fdecea', border: '#C0392B', icone: '#C0392B' },
  };
  const c = couleurs[statut] || couleurs.attente;
  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'flex-start',
      padding: '10px 14px', borderRadius: 10, marginBottom: 8,
      background: c.bg, border: `1px solid ${c.border}`,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', background: c.border,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, color: '#fff', fontWeight: 700, fontSize: 12,
      }}>
        {statut === 'fait'   && <CheckCircle size={14} />}
        {statut === 'erreur' && <XCircle size={14} />}
        {statut === 'attente' && numero}
        {statut === 'en_cours' && <span style={{ fontSize: 10 }}>●</span>}
      </div>
      <div>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#1a1a1a' }}>{titre}</p>
        {description && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#666' }}>{description}</p>}
      </div>
    </div>
  );
};

/* ─── Page principale ───────────────────────────────────────── */
const QrScanner = () => {
  const navigate  = useNavigate();
  const [mode, setMode]               = useState('scan');    // 'scan' | 'manuel'
  const [codeManuel, setCodeManuel]   = useState('');
  const [codeScanne, setCodeScanne]   = useState(null);
  const [loading, setLoading]         = useState(false);
  const [bonInfo, setBonInfo]         = useState(null);      // données du bon après vérification
  const [bonValide, setBonValide]     = useState(null);      // null | true | false
  const [etape, setEtape]             = useState('scan');    // 'scan' | 'verifie' | 'valide' | 'erreur'
  const [scannerKey, setScannerKey]   = useState(0);

  /* ── Étape 1 : vérifier le bon (sans le consommer) ───────── */
  const verifierBon = useCallback(async (code) => {
    const c = (code || codeManuel).trim().toUpperCase();
    if (!c) { toast.error('Entrez ou scannez un code.'); return; }
    setCodeScanne(c);
    setLoading(true);
    setEtape('verifie');
    try {
      // On interroge l'index admin en filtrant par code_unique pour preview
      const res = await API.get(`/admin/bons?recherche=${encodeURIComponent(c)}&per_page=1`);
      const list = res.data?.data?.data || res.data?.data || [];
      const bon  = list.find(b => b.code_unique?.toUpperCase() === c);

      if (!bon) {
        setBonValide(false);
        setBonInfo(null);
        setEtape('erreur');
        toast.error('Aucun bon trouvé pour ce code.');
        return;
      }
      if (bon.statut !== 'valide') {
        setBonValide(false);
        setBonInfo(bon);
        setEtape('erreur');
        toast.error(`Ce bon est "${bon.statut}" — il ne peut pas être utilisé.`);
        return;
      }
      const expDate = bon.date_expiration ? new Date(bon.date_expiration) : null;
      if (expDate && expDate < new Date()) {
        setBonValide(false);
        setBonInfo(bon);
        setEtape('erreur');
        toast.error('Ce bon a expiré.');
        return;
      }

      setBonValide(true);
      setBonInfo(bon);
      setEtape('verifie');
      toast.success('Bon valide — en attente de confirmation.');
    } catch {
      setBonValide(false);
      setEtape('erreur');
      toast.error('Erreur lors de la vérification.');
    } finally {
      setLoading(false);
    }
  }, [codeManuel]);

  /* ── Étape 2 : consommer / valider définitivement le bon ─── */
  const confirmerValidation = async () => {
    if (!codeScanne) return;
    setLoading(true);
    try {
      const res = await API.post('/admin/bons/valider', { code_unique: codeScanne });
      if (res.data.succes) {
        setBonInfo(res.data.bon);
        setEtape('valide');
        toast.success('Bon consommé avec succès !');
      } else {
        setEtape('erreur');
        toast.error(res.data.message || 'Erreur.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors de la validation.';
      setEtape('erreur');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ── Action rapide : créer un RDV pour ce patient ────────── */
  const allerCreerRdv = () => {
    if (!bonInfo) return;
    navigate('/admin/parcours-soins', {
      state: {
        prefill: {
          bon_code: codeScanne,
          bon_info: bonInfo,
        },
      },
    });
  };

  const resetScanner = () => {
    setCodeScanne(null);
    setCodeManuel('');
    setBonInfo(null);
    setBonValide(null);
    setEtape('scan');
    setScannerKey(p => p + 1);
  };

  const handleScanSuccess = useCallback((result) => {
    verifierBon(result);
  }, [verifierBon]);

  /* ── Calcul des étapes de chronologie ────────────────────── */
  const chronologie = [
    {
      numero: 1,
      titre:  'Scan / Saisie du code',
      description: codeScanne ? `Code : ${codeScanne}` : 'Attente du code bon...',
      statut: codeScanne ? 'fait' : 'en_cours',
    },
    {
      numero: 2,
      titre:  'Vérification du bon',
      description: etape === 'erreur'   ? 'Bon invalide ou expiré'
                  : bonValide === true   ? `Patient : ${bonInfo?.utilisateur?.prenom} ${bonInfo?.utilisateur?.nom} — Type : ${bonInfo?.type_bon?.nom}`
                  : 'En attente du scan...',
      statut: etape === 'erreur'   ? 'erreur'
            : bonValide === true   ? 'fait'
            : codeScanne           ? 'en_cours'
                                   : 'attente',
    },
    {
      numero: 3,
      titre:  'Confirmation & consommation',
      description: etape === 'valide'   ? `Bon marqué "utilisé" le ${new Date().toLocaleDateString('fr-FR')}`
                  : bonValide === true   ? 'Cliquez sur "Confirmer" pour consommer le bon'
                  : '',
      statut: etape === 'valide' ? 'fait'
            : bonValide === true ? 'en_cours'
                                 : 'attente',
    },
    {
      numero: 4,
      titre:  'Création du rendez-vous',
      description: etape === 'valide' ? 'Vous pouvez créer le RDV maintenant.' : 'Disponible après validation.',
      statut: etape === 'valide' ? 'en_cours' : 'attente',
    },
  ];

  return (
    <div className="layout">
      <Navbar />
      <div className="main-content">
        <div className="page-title">
          <h1><QrCode size={22} /> Scanner / Valider un Bon</h1>
          <p>Scannez ou saisissez le code du bon avant de créer un rendez-vous.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>

          {/* ── Colonne gauche : scanner / résultat ─────────── */}
          <div className="card">

            {/* Sélecteur de mode */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {[['scan', <QrCode size={14}/>, 'Scanner QR'], ['manuel', <Keyboard size={14}/>, 'Saisie manuelle']].map(([m, icon, lbl]) => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontWeight: 600, fontSize: 13,
                    background: mode === m ? '#1F5C9E' : '#f0f0f0',
                    color:      mode === m ? '#fff' : '#555',
                  }}>
                  {icon} {lbl}
                </button>
              ))}
            </div>

            {/* Zone active selon étape */}
            {etape === 'scan' && (
              <>
                {mode === 'scan' && (
                  <ScannerCore key={scannerKey} onScanSuccess={handleScanSuccess} />
                )}
                {mode === 'manuel' && (
                  <div>
                    <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
                      Code unique du bon (ex: CTM-ABCD1234)
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        value={codeManuel}
                        onChange={e => setCodeManuel(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && verifierBon()}
                        placeholder="CTM-XXXXXXXX"
                        style={{
                          flex: 1, padding: '10px 14px', border: '2px solid #1F5C9E',
                          borderRadius: 8, fontSize: 15, fontFamily: 'monospace',
                          letterSpacing: 2, textTransform: 'uppercase',
                        }}
                        autoFocus
                      />
                      <button type="button" className="btn btn-primary" onClick={() => verifierBon()} disabled={loading}>
                        {loading ? <RefreshCw size={16} className="spin" /> : 'Vérifier'}
                      </button>
                    </div>
                    <p style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
                      Vous pouvez aussi appuyer sur Entrée après avoir saisi le code.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* ── Résultat vérification ── */}
            {(etape === 'verifie' || etape === 'erreur' || etape === 'valide') && bonInfo && (
              <div style={{
                borderRadius: 10, padding: 20,
                background: etape === 'erreur' ? '#fdecea' : etape === 'valide' ? '#eafaf1' : '#f0f7ff',
                border: `1px solid ${etape === 'erreur' ? '#e74c3c' : etape === 'valide' ? '#27ae60' : '#1F5C9E'}`,
              }}>
                {/* Icône + titre */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  {etape === 'erreur'  && <XCircle size={32} color="#C0392B" />}
                  {etape === 'verifie' && <CheckCircle size={32} color="#1F5C9E" />}
                  {etape === 'valide'  && <CheckCircle size={32} color="#27ae60" />}
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15, margin: 0, color: etape === 'erreur' ? '#C0392B' : etape === 'valide' ? '#1A7A4A' : '#1F5C9E' }}>
                      {etape === 'erreur'  ? 'Bon invalide ou expiré'
                      : etape === 'valide'  ? 'Bon consommé avec succès'
                      :                      'Bon valide — confirmation requise'}
                    </p>
                    <p style={{ fontSize: 12, color: '#666', margin: '2px 0 0' }}>Code : <strong style={{ fontFamily: 'monospace' }}>{codeScanne}</strong></p>
                  </div>
                </div>

                {/* Fiche patient + bon */}
                <div style={{ background: '#fff', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <User size={16} color="#1F5C9E" />
                      <div>
                        <p style={{ fontSize: 11, color: '#888', margin: 0 }}>Patient</p>
                        <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>
                          {bonInfo.utilisateur?.prenom} {bonInfo.utilisateur?.nom}
                        </p>
                        <p style={{ fontSize: 11, color: '#888', margin: 0 }}>N° {bonInfo.utilisateur?.numero_patient}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <CreditCard size={16} color="#1F5C9E" />
                      <div>
                        <p style={{ fontSize: 11, color: '#888', margin: 0 }}>Type de bon</p>
                        <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{bonInfo.type_bon?.nom || bonInfo.typeBon?.nom || '—'}</p>
                        <p style={{ fontSize: 11, color: '#888', margin: 0 }}>
                          {Number(bonInfo.type_bon?.prix || bonInfo.typeBon?.prix || bonInfo.montant_paye || 0).toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>
                    </div>
                  </div>
                  {bonInfo.date_expiration && (
                    <div style={{ marginTop: 10, padding: '6px 10px', background: '#fff8e6', borderRadius: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                      <Clock size={13} color="#E67E22" />
                      <span style={{ fontSize: 12, color: '#c87a00' }}>
                        Expire le : <strong>{new Date(bonInfo.date_expiration).toLocaleDateString('fr-FR')}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions selon étape */}
                {etape === 'verifie' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={confirmerValidation}
                      disabled={loading}
                      style={{ width: '100%' }}
                    >
                      {loading ? <RefreshCw size={14} /> : <CheckCircle size={14} />}
                      {' '}{loading ? 'Validation...' : 'Confirmer — Marquer le bon comme utilisé'}
                    </button>
                    <p style={{ fontSize: 11, color: '#666', textAlign: 'center', margin: 0 }}>
                      ⚠️ Cette action est irréversible. Le bon sera marqué "utilisé".
                    </p>
                  </div>
                )}

                {etape === 'valide' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={allerCreerRdv}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <CalendarDays size={15} /> Créer le rendez-vous
                      <ArrowRight size={14} />
                    </button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={resetScanner}>
                      <RefreshCw size={14} /> Nouveau scan
                    </button>
                  </div>
                )}

                {etape === 'erreur' && (
                  <button type="button" className="btn btn-outline btn-sm" onClick={resetScanner} style={{ width: '100%' }}>
                    <RefreshCw size={14} /> Réessayer avec un autre code
                  </button>
                )}
              </div>
            )}

            {/* État de chargement initial (vérification en cours) */}
            {loading && !bonInfo && (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <RefreshCw size={24} color="#1F5C9E" style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ color: '#666', marginTop: 8 }}>Vérification du bon en cours...</p>
              </div>
            )}
          </div>

          {/* ── Colonne droite : chronologie des actions ─────── */}
          <div>
            <div className="card">
              <div className="card-header" style={{ marginBottom: 12 }}>
                <h2 style={{ fontSize: 14 }}>📋 Chronologie des actions</h2>
              </div>
              <div>
                {chronologie.map((e) => (
                  <EtapeChrono key={e.numero} {...e} />
                ))}
              </div>

              {/* Aide contextuelle */}
              <div style={{ marginTop: 16, padding: '10px 12px', background: '#f8f9fa', borderRadius: 8 }}>
                <p style={{ fontWeight: 700, fontSize: 12, color: '#444', margin: '0 0 6px' }}>
                  <AlertCircle size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Comment ça marche ?
                </p>
                <ol style={{ fontSize: 11, color: '#666', margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
                  <li>Scannez le QR Code ou saisissez le code manuellement.</li>
                  <li>Vérifiez les informations du patient et du bon.</li>
                  <li>Confirmez pour <strong>consommer</strong> le bon.</li>
                  <li>Créez le rendez-vous depuis la page "Parcours de soins".</li>
                </ol>
              </div>
            </div>

            {/* Accès rapide si scan déjà fait */}
            {etape === 'scan' && (
              <div className="card" style={{ marginTop: 12 }}>
                <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Accès rapide</p>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => navigate('/admin/parcours-soins')}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <CalendarDays size={14} /> Aller à la gestion des RDV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QrScanner;
