import React, { useState, useEffect } from 'react'
import axios from 'axios'
import TripDetailScreen from './components/TripDetailScreen'
import AuthScreen from './components/AuthScreen'
import DashboardScreen from './components/DashboardScreen'
import './App.css'

function App() {
  const [loggedInUser, setLoggedInUser] = useState(() => {
    const saved = localStorage.getItem('travel_app_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [currentView, setCurrentView] = useState(() => {
    return localStorage.getItem('travel_app_user') ? "dashboard" : "auth";
  });
  const [selectedTrip, setSelectedTrip] = useState("")
  const [photos, setPhotos] = useState([])

  const fetchPhotos = async () => {
    if (!selectedTrip) return;
    try {
      const response = await axios.get(`http://${window.location.hostname}:8080/api/photos?trip_id=${selectedTrip}`)
      setPhotos(response.data)
    } catch (error) {
      console.error("Error fetching photos:", error)
    }
  }

  // selectedTrip または currentView が変わった時に写真を再取得
  useEffect(() => {
    if (currentView === "map" && selectedTrip) {
      fetchPhotos()
    }
  }, [selectedTrip, currentView])

  const handleLoginSuccess = (user) => {
    setLoggedInUser(user);
    localStorage.setItem('travel_app_user', JSON.stringify(user));
    setCurrentView("dashboard");
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    localStorage.removeItem('travel_app_user');
    setSelectedTrip("");
    setPhotos([]);
    setCurrentView("auth");
  };

  const handleSelectTrip = (tripId) => {
    setSelectedTrip(tripId);
    setCurrentView("map");
  };

  const handleBackToDashboard = () => {
    setSelectedTrip("");
    setCurrentView("dashboard");
  };

  return (
    <>
      {currentView === "auth" && <AuthScreen onLoginSuccess={handleLoginSuccess} />}
      {currentView === "dashboard" && (
        <DashboardScreen user={loggedInUser} onSelectTrip={handleSelectTrip} onLogout={handleLogout} />
      )}
      {currentView === "map" && (
        <TripDetailScreen 
          photos={photos} 
          fetchPhotos={fetchPhotos} 
          currentUserId={loggedInUser?.id}
          selectedTrip={selectedTrip}
          onBack={handleBackToDashboard}
        />
      )}
      <div className="photo-credit">
        Photo by Daniela Cuevas on Unsplash
      </div>
    </>
  )
}

export default App

