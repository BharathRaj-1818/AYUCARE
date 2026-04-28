import { createContext, useContext, useState, useEffect } from 'react';
import { patientPortalAPI } from '../lib/api';

const PatientPortalContext = createContext(null);

export function PatientPortalProvider({ children }) {
  const [patientUser, setPatientUser] = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ayucare_patient_token');
    const saved = localStorage.getItem('ayucare_patient_user');
    if (token && saved) {
      setPatientUser(JSON.parse(saved));
    }
    setLoading(false);
  }, []);

  const loginPatient = async (email, password) => {
    const res = await patientPortalAPI.login({ email, password });
    const { access_token, user } = res.data;
    localStorage.setItem('ayucare_patient_token', access_token);
    localStorage.setItem('ayucare_patient_user', JSON.stringify(user));
    // Point axios to use patient token for patient portal routes
    setPatientUser(user);
    return user;
  };

  const logoutPatient = () => {
    localStorage.removeItem('ayucare_patient_token');
    localStorage.removeItem('ayucare_patient_user');
    setPatientUser(null);
  };

  return (
    <PatientPortalContext.Provider value={{ patientUser, loginPatient, logoutPatient, loading }}>
      {children}
    </PatientPortalContext.Provider>
  );
}

export const usePatientPortal = () => useContext(PatientPortalContext);