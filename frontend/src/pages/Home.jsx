import React from 'react';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import CompaniesStrip from '../components/CompaniesStrip';
import FeaturesGrid from '../components/FeaturesGrid';
import FreeBanner from '../components/FreeBanner';
import Footer from '../components/Footer';

export default function Home() {
  return (
    <div className="bg-[#0B0B0F] min-h-screen overflow-x-hidden">
      <Navbar />
      <main>
        <HeroSection />
        <CompaniesStrip />
        <FeaturesGrid />
        <FreeBanner />
      </main>
      <Footer />
    </div>
  );
}
