import { useState, useEffect } from 'react';
import axios from 'axios';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WishlistProvider } from './contexts/WishlistContext';
import Header from './components/Header';
import PlansModal from './components/PlansModal.tsx';
import Hero from './components/Hero';
import Destinations from './components/Destinations';
import Hotels from './components/Hotels';
// import Culture from './components/Culture'; // Removed per requirement
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import TripPlanModal from './components/TripPlanModal';
import ItineraryPreview from './components/ItineraryPreview';
import DestinationDetail from './components/DestinationDetail';
import Notification from './components/notification';
import Wishlist from './components/Wishlist';
import BookingModal from './components/BookingModal';
import Chatbot from './components/Chatbot';
// import TripsSection from './components/TripsSection';
import SafetyCheckModal from './components/SafetyCheckModal';
import { Destination, TripPlan, Booking } from './types';
import { useWishlist } from './contexts/WishlistContext';
import { CulturalDestination } from './types/Cultural';
import GuideInfo from './components/GuideInfo';
import AllDestinations from './components/AllDestinations';
import BookGuideModal from './components/BookGuideModal';
import GuideBookings from './components/GuideBookings';

function AppContent() {
  // --- STATE MANAGEMENT FOR MODALS ---
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isTripPlanModalOpen, setIsTripPlanModalOpen] = useState(false);
  const [isItineraryPreviewOpen, setIsItineraryPreviewOpen] = useState(false);
  const [isDestinationDetailOpen, setIsDestinationDetailOpen] = useState(false);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isSafetyCheckOpen, setIsSafetyCheckOpen] = useState(false);
  const [isPlansOpen, setIsPlansOpen] = useState(false);
  const [isGuideInfoOpen, setIsGuideInfoOpen] = useState(false);
  const [isBookGuideOpen, setIsBookGuideOpen] = useState(false);
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);
  const [isGuideBookingsOpen, setIsGuideBookingsOpen] = useState(false);
  const [isAllDestinationsOpen, setIsAllDestinationsOpen] = useState(false);

  // --- STATE MANAGEMENT FOR DATA ---
  const [selectedDestination, setSelectedDestination] = useState<Destination | CulturalDestination | null>(null);
  const [currentTripPlan, setCurrentTripPlan] = useState<TripPlan | null>(null);
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);

  // Auth context
  const { user, token } = useAuth();
  const { removeFromWishlist } = useWishlist();

  // Clear trip plan when user logs out
  useEffect(() => {
    if (!user) {
      setCurrentTripPlan(null);
    }
  }, [user]);

  // --- HANDLERS ---
  const handleStartJourney = () =>
    user ? setIsTripPlanModalOpen(true) : setIsAuthModalOpen(true);

  const handleSignInClick = () => setIsAuthModalOpen(true);
  const handleWishlistClick = () => setIsWishlistModalOpen(true);
  const handleAuthSuccess = () => setIsAuthModalOpen(false);

  const handleExploreDestination = (destination: Destination) => {
    setSelectedDestination(destination);
    setIsDestinationDetailOpen(true);
  };

  // Cultural destination flow removed with Culture section

  const handleTripPlanSubmit = (tripPlanData: {
    destination: string;
    budget: string;
    tripType: 'cultural' | 'adventure' | 'spiritual' | 'nature' | 'food';
    safetyMonitoring: boolean;
    trustedContactEmail?: string;
    numberOfPeople: number;
    startDate?: string;
    endDate?: string;
    selectedDestinations: Destination[];
  }) => {
    const tripPlan: TripPlan = {
      ...tripPlanData,
      id: currentTripPlan?.id || Date.now().toString(), // ✅ keep same ID if editing
      userId: user?.id || '',
      createdAt: currentTripPlan?.createdAt || new Date(), // ✅ preserve original creation date
      itineraryText: currentTripPlan?.itineraryText || ''
    };
    setCurrentTripPlan(tripPlan);
    setIsTripPlanModalOpen(false);
    setIsItineraryPreviewOpen(true);
  };

  const handleEditTrip = () => {
    setIsItineraryPreviewOpen(false);
    setIsTripPlanModalOpen(true); // ✅ opens modal with prefilled data now
  };

  const handleBookNow = async () => {
    if (!currentTripPlan || !token) {
      alert('You must be logged in to book.');
      return;
    }
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const resp = await axios.post('http://localhost:5000/api/bookings', currentTripPlan, config);
      const newBooking: Booking | undefined = resp?.data?.booking;
      // After successful booking, remove booked destinations from wishlist
      if (currentTripPlan.selectedDestinations && currentTripPlan.selectedDestinations.length > 0) {
        for (const d of currentTripPlan.selectedDestinations) {
          // Fire and forget; backend expects wishlist item delete by destination id
          // If any fails, we silently continue to not block UX
          removeFromWishlist(d.id);
        }
      }
      setIsItineraryPreviewOpen(false);
      setIsBookingModalOpen(true);
      setCurrentTripPlan(null);
      if (newBooking) setCurrentBooking(newBooking);
    } catch (e) {
      console.error('Booking failed', e);
      alert('Booking failed.');
    }
  };

  // 1-minute safety check trigger for the current booking (demo)
  useEffect(() => {
    if (!currentBooking?.safetyMonitoring || !currentBooking?.startDate || !currentBooking?.endDate) return;
    let timer: any;
    let interval: any;
    const start = new Date(currentBooking.startDate as any);
    const end = new Date(currentBooking.endDate as any);
    const tick = () => {
      const now = new Date();
      if (now >= start && now <= end) {
        setIsSafetyCheckOpen(true);
      }
    };
    const schedule = () => {
      const now = new Date();
      if (now < start) {
        timer = setTimeout(() => {
          tick();
          interval = setInterval(tick, 60 * 1000);
        }, start.getTime() - now.getTime());
      } else if (now >= start && now <= end) {
        interval = setInterval(tick, 60 * 1000);
      }
    };
    schedule();
    return () => { if (timer) clearTimeout(timer); if (interval) clearInterval(interval); };
  }, [currentBooking]);

  const handleSaveItinerary = async (itineraryText: string) => {
    if (!currentTripPlan || !token) {
      alert('You must be logged in to save an itinerary.');
      return;
    }

    const planToSave = { ...currentTripPlan, itineraryText };

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post('http://localhost:5000/api/tripplans', planToSave, config);
      alert('Itinerary saved successfully!');
      setIsItineraryPreviewOpen(false);
      setCurrentTripPlan(null);
    } catch (error) {
      console.error('Failed to save itinerary:', error);
      alert('Failed to save itinerary. Please try again.');
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        onSignInClick={handleSignInClick}
        onWishlistClick={handleWishlistClick}
        onPlansClick={() => setIsPlansOpen(true)}
        onFindGuides={() => setIsGuideInfoOpen(true)}
        onGuideBookings={() => setIsGuideBookingsOpen(true)}
      />
      <Hero onStartJourney={handleStartJourney} />
      <Destinations onExploreDestination={handleExploreDestination} onViewAll={() => setIsAllDestinationsOpen(true)} />
      <Hotels />
      {/* Culture section removed per requirement */}
      {/* Removed My Plans/My Bookings section from home per new nav placement */}
      <Footer />

      {/* Chatbot floating widget */}
      <Chatbot />

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <Wishlist
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
        onExploreDestination={handleExploreDestination}
        onPlanTrip={() => {
          setIsWishlistModalOpen(false);
          setIsTripPlanModalOpen(true);
        }}
      />

      {/* ✅ Pass existing plan to modal if editing */}
      <TripPlanModal
        isOpen={isTripPlanModalOpen}
        onClose={() => setIsTripPlanModalOpen(false)}
        onSubmit={handleTripPlanSubmit}
        onFindGuides={(name) => { setIsGuideInfoOpen(true); setSelectedGuideId(null); }}
        initialData={currentTripPlan ? {
          destination: currentTripPlan.destination,
          budget: currentTripPlan.budget,
          tripType: currentTripPlan.tripType,
          safetyMonitoring: currentTripPlan.safetyMonitoring,
          trustedContactEmail: currentTripPlan.trustedContactEmail,
          numberOfPeople: currentTripPlan.numberOfPeople,
          startDate: currentTripPlan.startDate ? new Date(currentTripPlan.startDate).toISOString().split('T')[0] : '',
          endDate: currentTripPlan.endDate ? new Date(currentTripPlan.endDate).toISOString().split('T')[0] : '',
          selectedDestinations: currentTripPlan.selectedDestinations || [],
        } : undefined}
      />

      <ItineraryPreview
        isOpen={isItineraryPreviewOpen}
        tripPlan={currentTripPlan}
        onClose={() => setIsItineraryPreviewOpen(false)}
        onSave={handleSaveItinerary}
        onEdit={handleEditTrip}
        onBookNow={handleBookNow}
      />

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />

      <PlansModal isOpen={isPlansOpen} onClose={() => setIsPlansOpen(false)} />

      <AllDestinations
        isOpen={isAllDestinationsOpen}
        onClose={() => setIsAllDestinationsOpen(false)}
        onExploreDestination={handleExploreDestination}
      />

      {/* Guides */}
      <GuideInfo
        isOpen={isGuideInfoOpen}
        onClose={() => setIsGuideInfoOpen(false)}
        onBook={(guideId) => { setSelectedGuideId(guideId); setIsBookGuideOpen(true); }}
        initialDestination={typeof selectedDestination === 'object' && selectedDestination ? (('name' in selectedDestination) ? selectedDestination.name : selectedDestination.title) : ''}
      />
      <BookGuideModal
        isOpen={isBookGuideOpen}
        guideId={selectedGuideId}
        onClose={() => setIsBookGuideOpen(false)}
      />
      <GuideBookings
        isOpen={isGuideBookingsOpen}
        onClose={() => setIsGuideBookingsOpen(false)}
      />

      <DestinationDetail
        isOpen={isDestinationDetailOpen}
        onClose={() => setIsDestinationDetailOpen(false)}
        destination={selectedDestination}
      />

      {/* Safety modal controlled by booking dates */}
      {user && token && currentBooking?.safetyMonitoring && (
        <SafetyCheckModal
          isOpen={isSafetyCheckOpen}
          onClose={() => setIsSafetyCheckOpen(false)}
          planId={currentBooking._id}
          token={token}
        />
      )}
    </div>
  );
}

function App() {
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showNotification = (message: string, type: 'success' | 'error' = 'success') =>
    setNotification({ message, type });

  return (
    <AuthProvider showNotification={showNotification}>
      <WishlistProvider showNotification={showNotification}>
        <AppContent />
      </WishlistProvider>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </AuthProvider>
  );
}

export default App;
