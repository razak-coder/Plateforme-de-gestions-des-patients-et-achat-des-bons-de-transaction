import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import API from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser]                     = useState(null);
  const [loading, setLoading]               = useState(true);
  const [doitChangerMdp, setDoitChangerMdp] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token      = localStorage.getItem('token');
    const forceMdp   = localStorage.getItem('doit_changer_mdp') === 'true';
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      setDoitChangerMdp(forceMdp);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res         = await API.post('/auth/login', { email, password });
    const utilisateur = res.data.utilisateur;
    const token       = res.data.token;
    const forceMdp    = !!res.data.doit_changer_mdp;

    localStorage.setItem('token',            token);
    localStorage.setItem('user',             JSON.stringify(utilisateur));
    localStorage.setItem('doit_changer_mdp', String(forceMdp));

    setUser(utilisateur);
    setDoitChangerMdp(forceMdp);
    return utilisateur;
  };

  const register = async (donnees) => {
    const res = await API.post('/auth/register', {
      nom:       donnees.nom,
      prenom:    donnees.prenom,
      email:     donnees.email,
      telephone: donnees.telephone,
      password:  donnees.password,
      password_confirmation: donnees.password_confirmation,
    });
    return res.data;
  };

  /** Appelé après changement de mot de passe forcé réussi */
  const confirmerChangementMdp = useCallback(() => {
    localStorage.setItem('doit_changer_mdp', 'false');
    setDoitChangerMdp(false);
  }, []);

  const logout = async () => {
    try {
      await API.post('/auth/logout');
    } catch (err) {
      console.error(err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('doit_changer_mdp');
      setUser(null);
      setDoitChangerMdp(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user, login, register, logout, loading,
      doitChangerMdp, confirmerChangementMdp,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);