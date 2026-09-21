import React from 'react';
import HeroCarousel from '../components/home/HeroCarousel';
import AboutPreview from '../components/home/AboutPreview';
import PlatformPrinciples from '../components/home/PlatformPrinciples';
import LearningPaths from '../components/home/LearningPaths';

export default function Home() {
  return (
    <div className="home-page">
      {/* 1. Large Hero Image Carousel / Banner */}
      <HeroCarousel />

      {/* 2. About EcoIntuition Section */}
      <AboutPreview />

      {/* 3. Platform Principles (Concise 3 foundational pillars) */}
      <PlatformPrinciples />

      {/* 4. Courses + Bootcamp Discovery Section */}
      <LearningPaths />
    </div>
  );
}
