# 📋 Cahier des Besoins Fonctionnels — CTM-Consult
> Plateforme de Gestion Médicale & Suivi des Patients
> Stack : Laravel 10 (API REST) · React SPA · JWT Auth · MySQL

---

## Acteurs du Système

| Rôle | Périmètre |
|---|---|
| **Administrateur** | Gestion globale : utilisateurs, bons, rapports, paramètres |
| **Médecin (Praticien)** | Agenda, saisie consultations, accès dossier patient |
| **Patient** | Achat bons, prise de RDV, dossier médical personnel |

---

## Module 1 — Authentification & Sécurité

| ID | Besoin |
|---|---|
| BF-01.1 | Inscription patient publique avec génération auto `numero_patient` (PAT-AAAA-XXXX, verrou DB) |
| BF-01.2 | Connexion email/MDP avec token JWT — compte désactivé refusé (403) |
| BF-01.3 | Changement de MDP obligatoire au 1er login après création par admin (flag `doit_changer_mdp`) |
| BF-01.4 | Modification de profil (nom, prénom, email, téléphone) |
| BF-01.5 | Changement de MDP volontaire (vérification ancien MDP, complexité min 8 car.) |
| BF-01.6 | Déconnexion (invalidation JWT) + refresh token |
| BF-01.7 | Journal d'audit : toutes les actions critiques tracées (IP, action, modèle, auteur) |

---

## Module 2 — Gestion des Utilisateurs (Admin)

| ID | Besoin |
|---|---|
| BF-02.1 | Liste paginée + recherche fulltext (nom, prénom, email, téléphone, N° patient) |
| BF-02.2 | Filtres : rôle (admin/patient/medecin), statut (actif/inactif) |
| BF-02.3 | Création de compte tous rôles — rôle médecin exige une fiche médecin liée (unique) |
| BF-02.4 | Tout compte créé par admin → `doit_changer_mdp = true` automatiquement |
| BF-02.5 | Modification complète des données utilisateur |
| BF-02.6 | Désactivation douce (actif = false) — pas de suppression physique |
| BF-02.7 | Un admin ne peut pas supprimer son propre compte |
| BF-02.8 | Réinitialisation MDP → MDP temporaire `Ctm@XXXX` affiché une seule fois |
| BF-02.9 | Stats : total, par rôle, actifs, doivent changer MDP, nouveaux ce mois |
| BF-02.10 | Profil patient détaillé : stats bons/consultations/RDV/dépenses |

---

## Module 3 — Gestion des Médecins (Admin)

| ID | Besoin |
|---|---|
| BF-03.1 | CRUD fiches médecins (nom, prénom, spécialité, N° ordre, bio, statut actif/inactif) |
| BF-03.2 | Définition des disponibilités par jour de la semaine (heure début, heure fin, actif) |
| BF-03.3 | Durée configurable par plage : `duree_minutes` (15/20/30/45/60 min, défaut 30) |
| BF-03.4 | Créneaux générés dynamiquement = plages - RDV pris non annulés |
| BF-03.5 | Réponse créneau inclut : heure, disponibilité, durée_minutes |
| BF-03.6 | Désactivation bloquée si RDV à venir existants |
| BF-03.7 | Endpoint spécialités distinctes des médecins actifs |

---

## Module 4 — Dossiers Patients (Admin)

| ID | Besoin |
|---|---|
| BF-04.1 | Création réservée aux patients — 1 seul dossier ouvert par patient par service |
| BF-04.2 | `numero_dossier` auto-généré (DOS-AAAA-XXXX, verrou DB anti-doublon concurrent) |
| BF-04.3 | Données : service, antécédents, allergies, notes, date d'ouverture |
| BF-04.4 | Recherche : N° dossier, service, nom patient, statut, période |
| BF-04.5 | Fermeture BLOQUÉE si RDV actifs OU consultation `en_cours` présente |
| BF-04.6 | Archivage logique (action destroy → statut `archive`) |

---

## Module 5 — Rendez-vous

| ID | Acteur | Besoin |
|---|---|---|
| BF-05.1 | Admin | Création avec validations : médecin actif, bon valide/propriétaire/non expiré, créneau libre, anti-doublon patient |
| BF-05.2 | Admin | Dossier créé automatiquement si non fourni |
| BF-05.3 | Patient | Prise de RDV autonome : wizard 5 étapes (spécialité → médecin → date → créneau → confirmation) |
| BF-05.4 | Patient | Annulation bloquée si < 2h avant le RDV ou consultation `en_cours` |
| BF-05.5 | Admin/Médecin | Changement de statut avec règles métier |
| BF-05.6 | Système | Passage à `confirme` → création auto d'une consultation brouillon (`en_cours`) |
| BF-05.7 | Médecin | Refus avec motif (statut `annule`) |
| BF-05.8 | Système | Notification médecin à chaque nouveau RDV (in-app + email si configuré) |
| BF-05.9 | Système | Notification patient à chaque changement de statut significatif |
| BF-05.10 | Admin | Filtres : statut, médecin, patient, dossier, date, priorité, "à venir" |
| BF-05.11 | Admin | Vue RDV du jour et flux temps réel par médecin |

Cycle de vie RDV :
```
en_attente → confirme (→ brouillon consultation créé)
           → annule
confirme   → en_cours → termine (bon → utilise)
           → annule
```

---

## Module 6 — Consultations (Médecin + Admin)

| ID | Besoin |
|---|---|
| BF-06.1 | Saisie liée obligatoirement à un RDV du médecin connecté |
| BF-06.2 | Champs : diagnostic (textarea), traitement prescrit (textarea), orientation, bon |
| BF-06.3 | Brouillon auto-créé à la confirmation du RDV — mise à jour libre avant clôture |
| BF-06.4 | Clôture BLOQUÉE si diagnostic ou traitement = valeur vide ou placeholder par défaut |
| BF-06.5 | À la clôture : bon → `utilise`, RDV → `termine` |
| BF-06.6 | Panneau historique patient en temps réel (dossiers+antécédents, 10 dernières consultations) |

---

## Module 7 — Bons de Consultation

| ID | Acteur | Besoin |
|---|---|---|
| BF-07.1 | Admin | CRUD types de bons (nom, prix, spécialité, validité jours, actif/inactif) |
| BF-07.2 | Patient | Consultation catalogue et achat de bon |
| BF-07.3 | Admin | Génération directe pour un patient (prise en charge, don) — durée configurable |
| BF-07.4 | Admin | Validation par code unique ou QR code à la réception |
| BF-07.5 | Admin | Annulation (impossible si `utilise` ou `annule`) |
| BF-07.6 | Admin | Prolongation depuis date actuelle ou aujourd'hui si expiré (réactive si expiré) |
| BF-07.7 | Système | Alerte bons expirant ≤ 7j côté patient et ≤ 3j côté admin |
| BF-07.8 | Formulaires | Bons filtrés par patient sélectionné — avertissement si aucun bon valide |

Cycle de vie Bon :
```
en_attente → valide → utilise (à la clôture consultation)
                    → annule (action admin)
                    → expire (dépassement date)
expire → valide (si prolongé)
```

---

## Module 8 — Transactions & Facturation

| ID | Besoin |
|---|---|
| BF-08.1 | Chaque achat bon génère une transaction traçable (montant, statut, date) |
| BF-08.2 | Revenus du jour / du mois / cumulés dans le tableau de bord admin |
| BF-08.3 | Stats transactions : total, en attente de confirmation |

---

## Module 9 — Rapports & Analytique (Admin)

| ID | Besoin |
|---|---|
| BF-09.1 | KPI opérationnels du jour : RDV (total, attente, confirmés, terminés), consultations, médecins actifs |
| BF-09.2 | Alerte admin : bons expirant dans ≤ 3 jours |
| BF-09.3 | Graphique mensuel 6 mois : ventes, revenus, consultations |
| BF-09.4 | Taux d'honoring : % RDV honorés (terminés) ce mois |
| BF-09.5 | Top 5 médecins par volume de consultations terminées ce mois |
| BF-09.6 | Génération de rapports sur période — stockés, consultables, supprimables |
| BF-09.7 | Flux du jour admin (tous médecins) et médecin (agenda personnel uniquement) |

---

## Module 10 — Espace Patient : Mon Dossier

| ID | Besoin |
|---|---|
| BF-10.1 | Tableau de bord : dossiers ouverts, consultations, bons valides, total dépensé, prochain RDV |
| BF-10.2 | Alerte bons expirants ≤ 7j avec code et date (bandeau orange visible) |
| BF-10.3 | Dossiers affichés en accordéon : antécédents, allergies, RDV et consultations liés |
| BF-10.4 | Tous les RDV (passés + à venir) avec filtre tri-état : Tous / À venir / Passés |
| BF-10.5 | RDV passés visuellement grisés (opacité réduite) |
| BF-10.6 | Historique consultations : diagnostic, traitement, orientation, bon utilisé |
| BF-10.7 | Chronologie clinique unifiée : dossiers, RDV, consultations, paiements |
| BF-10.8 | Onglet Notifications : événements RDV/consultation avec badge "Nouveau" (< 7j) |
| BF-10.9 | Bouton "Prendre un RDV" accessible depuis le tableau de bord (wizard) |

---

## Module 11 — Espace Médecin

| ID | Besoin |
|---|---|
| BF-11.1 | Dashboard personnel : flux du jour filtré sur son agenda uniquement |
| BF-11.2 | Liste de ses RDV avec actions changement de statut et refus |
| BF-11.3 | Saisie consultations avec panneau historique patient contextuel |
| BF-11.4 | Accès historique complet patient CONDITIONNÉ à l'existence d'un RDV commun |
| BF-11.5 | Notifications in-app (nouveau RDV) avec marquage lu |

---

## Module 12 — Réception & Salle d'Attente (Admin)

| ID | Besoin |
|---|---|
| BF-12.1 | Interface réception : flux du jour, accueil patient, validation bon par QR/code |
| BF-12.2 | Salle d'attente : file en temps réel, gestion des passages |
| BF-12.3 | Scanner QR code intégré pour validation rapide des bons |

---

## Règles Métier Transversales

| Code | Règle |
|---|---|
| RM-01 | `numero_patient` et `numero_dossier` générés avec `DB::transaction + lockForUpdate()` — zéro doublon en concurrence |
| RM-02 | Consultation non clôturable avec diagnostic ou traitement = valeur vide ou placeholder |
| RM-03 | Dossier non fermable si RDV actifs ou consultation `en_cours` |
| RM-04 | Bon `utilise` ou `annule` : immuable (annulation/prolongation impossibles) |
| RM-05 | Médecin : voit uniquement ses RDV/consultations — accès patient conditionné |
| RM-06 | Patient : voit uniquement ses données — bons filtrés dans tous les formulaires |
| RM-07 | Médecin inactif : ne peut pas recevoir de nouveau RDV |
| RM-08 | Bon expiré prolongeable → réactivé automatiquement à `valide` |

---

## Modèle de Données (Entités Clés)

```
Utilisateur(patient) ──< DossierPatient ──< RendezVous ──> Consultation
                     ──< Bon ──> Transaction            ──> Medecin
                     ──< Journal                        ──> Bon

Medecin ──< Disponibilite (jour_semaine, heure_debut, heure_fin, duree_minutes)
        ──< MedecinNotification
        ──< RendezVous
        ──< Consultation

TypeBon ──< Bon
Rapport (generé par admin)
```

---

## Pages Frontend (couverture complète)

| Espace | Pages |
|---|---|
| **Auth** | Login, Register, Changement MDP forcé |
| **Admin** | Dashboard, Utilisateurs, Médecins, Dossiers Patients, Parcours de Soins (RDV), Bons, Types Bons, Réception, Salle d'Attente, QR Scanner, Rapports, Paramètres |
| **Médecin** | Dashboard, Mes Consultations |
| **Patient** | Dashboard, Mon Dossier Médical (onglets : Dossiers / RDV / Consultations / Chronologie / Notifications), Prendre un RDV (5 étapes), Acheter un Bon, Historique |
