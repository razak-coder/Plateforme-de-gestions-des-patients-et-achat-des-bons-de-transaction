<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmation de bon — CTM-Consult</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4f8; color: #333; }
    .wrapper { max-width: 580px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1F5C9E 0%, #0a3a6e 100%); color: #fff; text-align: center; padding: 36px 24px; }
    .header h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
    .header p { font-size: 14px; opacity: 0.85; }
    .check-icon { font-size: 48px; margin-bottom: 12px; }
    .body { padding: 32px 28px; }
    .greeting { font-size: 16px; color: #444; margin-bottom: 20px; }
    .info-box { background: #eaf2fb; border-left: 4px solid #1F5C9E; border-radius: 8px; padding: 20px 24px; margin-bottom: 24px; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(31,92,158,0.12); }
    .info-row:last-child { border-bottom: none; padding-bottom: 0; }
    .info-label { font-size: 13px; color: #6b7c93; font-weight: 500; }
    .info-value { font-size: 13px; color: #1a2b3c; font-weight: 700; text-align: right; }
    .code-box { background: #1F5C9E; color: #fff; text-align: center; padding: 18px; border-radius: 8px; margin-bottom: 24px; letter-spacing: 3px; font-size: 22px; font-weight: 700; font-family: monospace; }
    .alert-box { background: #fff8e1; border: 1px solid #ffe082; border-radius: 8px; padding: 14px 18px; font-size: 13px; color: #7c5e00; margin-bottom: 24px; }
    .cta-btn { display: block; text-align: center; background: #1A7A4A; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin-bottom: 24px; }
    .footer { background: #f8f9fb; border-top: 1px solid #e8ecf0; text-align: center; padding: 20px 24px; font-size: 12px; color: #999; }
    .footer strong { color: #1F5C9E; }
  </style>
</head>
<body>
  <div class="wrapper">
    <!-- Header -->
    <div class="header">
      <div class="check-icon">✅</div>
      <h1>Bon acheté avec succès !</h1>
      <p>CTM-Consult — Système de gestion des bons de consultation</p>
    </div>

    <!-- Body -->
    <div class="body">
      <p class="greeting">Bonjour <strong>{{ $nomComplet }}</strong>,</p>
      <p style="font-size:14px; color:#555; margin-bottom:24px;">
        Votre paiement a été confirmé et votre bon de consultation a été généré avec succès.
        Conservez le code ci-dessous pour votre prochaine consultation.
      </p>

      <!-- Code unique -->
      <p style="font-size:13px; color:#888; text-align:center; margin-bottom:8px;">CODE UNIQUE DE VOTRE BON</p>
      <div class="code-box">{{ $codeBon }}</div>

      <!-- Détails -->
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Type de soin</span>
          <span class="info-value">{{ $typeBon }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Montant payé</span>
          <span class="info-value">{{ $montant }} FCFA</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date d'expiration</span>
          <span class="info-value">{{ $dateExpiration }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Statut</span>
          <span class="info-value" style="color:#1A7A4A;">✓ Valide</span>
        </div>
      </div>

      <!-- Alerte -->
      <div class="alert-box">
        ⚠️ <strong>Important :</strong> Présentez ce code ou le QR Code associé lors de votre consultation.
        Une fois utilisé, le bon ne peut plus être réutilisé.
      </div>

      <!-- CTA -->
      <a href="http://localhost:3000/patient/historique" class="cta-btn">
        📋 Voir mon historique de bons
      </a>

      <p style="font-size:13px; color:#777; text-align:center;">
        Si vous n'avez pas effectué cet achat, contactez-nous immédiatement.
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <strong>CTM-Consult</strong> — Système de gestion des bons de consultation<br>
      Cet email a été envoyé automatiquement, merci de ne pas y répondre.
    </div>
  </div>
</body>
</html>
