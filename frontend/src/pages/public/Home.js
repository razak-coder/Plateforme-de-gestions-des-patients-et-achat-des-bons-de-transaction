import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ChevronRight, CalendarDays, CreditCard, CheckCircle2, UserCog,
} from 'lucide-react';
import './Home.css';

const Home = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="home-container">
      <nav className={`home-navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="home-navbar-content">
          <div className="home-logo">
            <Activity className="logo-icon" />
            <span>CTM-Consult</span>
          </div>
          <div className="home-nav-links">
            <Link to="/login" className="btn-login">Se connecter</Link>
            <Link to="/register" className="btn-register">S'inscrire</Link>
          </div>
        </div>
      </nav>

      <header className="hero-section">
        <div className="hero-background-elements">
          <div className="glow-orb orb-1" />
          <div className="glow-orb orb-2" />
        </div>
        <div className="hero-content">
          <div className="hero-badge">Plateforme clinique CTM-Consult</div>
          <h1 className="hero-title">
            Gestion clinique complète et moderne <span className="gradient-text">pour patients et médecins</span>
          </h1>
          <p className="hero-subtitle">
            Centralisez les dossiers médicaux, les rendez-vous selon disponibilité, les consultations,
            les paiements et les bons de consultation dans une seule application fiable.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn-primary-large">
              Créer un compte patient <ChevronRight className="btn-icon" />
            </Link>
            <Link to="/login" className="btn-secondary-large">
              Accéder à mon espace sécurisé
            </Link>
          </div>
        </div>
      </header>

      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-item">
            <h3 className="stat-value">Dossiers</h3>
            <p className="stat-label">Création et suivi médical structurés</p>
          </div>
          <div className="stat-item">
            <h3 className="stat-value">RDV</h3>
            <p className="stat-label">Planification selon disponibilité médecin</p>
          </div>
          <div className="stat-item">
            <h3 className="stat-value">Paiements</h3>
            <p className="stat-label">Achats de bons et historique traçable</p>
          </div>
        </div>
      </section>

      

      <section className="parcours-section">
        <div className="section-header">
          <h2 className="section-title">Parcours de soins <span className="gradient-text">en 4 étapes</span></h2>
          <p className="section-description">Un circuit simple et clair pour mieux gérer les opérations quotidiennes.</p>
        </div>
        <div className="parcours-grid">
          <div className="parcours-item">
            <CheckCircle2 className="parcours-icon" />
            <h3>1. Inscription patient</h3>
            <p>Création du compte patient avec informations administratives et cliniques de base.</p>
          </div>
          <div className="parcours-item">
            <UserCog className="parcours-icon" />
            <h3>2. Affectation clinique</h3>
            <p>Ouverture du dossier et choix du médecin selon spécialité et disponibilités.</p>
          </div>
          <div className="parcours-item">
            <CalendarDays className="parcours-icon" />
            <h3>3. Rendez-vous/consultation</h3>
            <p>Réalisation de la consultation et mise à jour du dossier médical en base de données.</p>
          </div>
          <div className="parcours-item">
            <CreditCard className="parcours-icon" />
            <h3>4. Paiement et bon</h3>
            <p>Suivi transparent des transactions et des bons de consultation associés au patient.</p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-content">
          <h2>Démarrer avec CTM-Consult</h2>
          <p>Connectez-vous pour accéder à votre espace et piloter efficacement vos activités cliniques.</p>
          <Link to="/login" className="btn-primary-large cta-btn">
            Se connecter maintenant <ChevronRight className="btn-icon" />
          </Link>
        </div>
      </section>

      <footer className="home-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <Activity className="footer-logo-icon" />
            <span>CTM-Consult</span>
          </div>
          <p className="footer-copyright">&copy; {new Date().getFullYear()} CTM-Consult. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
