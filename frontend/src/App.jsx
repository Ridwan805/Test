import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Courses from './pages/Courses';
import Bootcamp from './pages/Bootcamp';
import CourseDashboard from './pages/CourseDashboard';
import LessonPage from './pages/LessonPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import Databank from './pages/Databank';
import Shop from './pages/Shop';
import About from './pages/About';
import Projects from './pages/Projects';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navbar />
          <main style={{ flex: '1 0 auto' }}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/bootcamp" element={<Bootcamp />} />
              <Route path="/bootcamp/:courseSlug" element={<Bootcamp />} />
              <Route path="/databank" element={<Databank />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/about" element={<About />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Protected Learning Routes */}
              <Route
                path="/learn/:courseSlug"
                element={
                  <ProtectedRoute>
                    <CourseDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/learn/:courseSlug/module/:moduleNumber/lesson/:lessonSlug"
                element={
                  <ProtectedRoute>
                    <LessonPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
