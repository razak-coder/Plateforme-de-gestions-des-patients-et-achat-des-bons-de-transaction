<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Nouveau rendez-vous</title>
</head>
<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
  <h2 style="color:#1F5C9E;">Nouveau rendez-vous programme</h2>
  <p>Bonjour Dr {{ $rendezVous->medecin?->prenom }} {{ $rendezVous->medecin?->nom }},</p>
  <p>Un nouveau rendez-vous vous a ete attribue.</p>

  <ul>
    <li><strong>Patient :</strong> {{ $rendezVous->utilisateur?->prenom }} {{ $rendezVous->utilisateur?->nom }}</li>
    <li><strong>Date :</strong> {{ optional($rendezVous->date_rdv)->format('d/m/Y') }}</li>
    <li><strong>Heure :</strong> {{ substr((string) $rendezVous->heure_rdv, 0, 5) }}</li>
    <li><strong>Motif :</strong> {{ $rendezVous->motif }}</li>
    <li><strong>Priorite :</strong> {{ $rendezVous->priorite }}</li>
  </ul>

  <p>Connectez-vous a votre espace personnel pour confirmer ou refuser ce rendez-vous.</p>
</body>
</html>
