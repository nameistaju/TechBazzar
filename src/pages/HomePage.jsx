import React, { useEffect } from 'react';
import HeroSection from '../components/home/HeroSection';
import CategoryCircles from '../components/home/CategoryCircles';
import PromoTiles from '../components/home/PromoTiles';
import FlashSaleSection from '../components/home/FlashSaleSection';
import EditorialBlock from '../components/home/EditorialBlock';
import TrendingSection from '../components/home/TrendingSection';
import RecommendedSection from '../components/home/RecommendedSection';
import RecentlyViewedSection from '../components/home/RecentlyViewedSection';
import ShopByBrand from '../components/home/ShopByBrand';
import TechBazaarPlusBanner from '../components/home/TechBazaarPlusBanner';
import TrustStrip from '../components/home/TrustStrip';

export default function HomePage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen">
      {/* 1. Large Editorial Hero with curved cut */}
      <HeroSection />

      {/* 2. Category Circles Row */}
      <CategoryCircles />

      {/* 3. Promo Tiles Side by Side */}
      <PromoTiles />

      {/* 4. Flash Sale with Live Countdown */}
      <FlashSaleSection />

      {/* 5. Editorial Block (1 Large + 1 Small Image) */}
      <EditorialBlock />

      {/* 6. Trending Now Product Grid */}
      <TrendingSection />

      {/* 7. Recommended For You */}
      <RecommendedSection />

      {/* 8. Recently Viewed Hardware */}
      <RecentlyViewedSection />

      {/* 9. Shop by Brand Logo Strip */}
      <ShopByBrand />

      {/* 10. Membership Banner: TechBazaar Plus */}
      <TechBazaarPlusBanner />

      {/* 11. Why Shop With Us Trust Strip */}
      <TrustStrip />
    </div>
  );
}
