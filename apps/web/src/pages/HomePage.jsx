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
import HowWholesaleWorks from '../components/home/HowWholesaleWorks';
import TrustNumbersStrip from '../components/home/TrustNumbersStrip';
import WholesaleFAQ from '../components/home/WholesaleFAQ';
import BannerSlot from '../components/common/BannerSlot';

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

      {/* Slot 1: home-mid-1 Banner (Between Promo Tiles and Flash Sale) */}
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 my-8">
        <BannerSlot slot="home-mid-1" />
      </div>

      {/* 4. Flash Sale with Live Countdown */}
      <FlashSaleSection />

      {/* 5. Editorial Block (1 Large + 1 Small Image) */}
      <EditorialBlock />

      {/* 6. How Wholesale Works (4-Step Strip) */}
      <HowWholesaleWorks />

      {/* 7. Trending Now Product Grid */}
      <TrendingSection />

      {/* Slot 2: home-mid-2 Banner (Between Trending and Recommended) */}
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 my-8">
        <BannerSlot slot="home-mid-2" />
      </div>

      {/* 8. Recommended For You */}
      <RecommendedSection />

      {/* 9. Trust Numbers Strip */}
      <TrustNumbersStrip />

      {/* 10. Recently Viewed Hardware */}
      <RecentlyViewedSection />

      {/* 11. Shop by Brand Logo Strip */}
      <ShopByBrand />

      {/* Slot 3: home-mid-3 Banner (Before Membership Banner) */}
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 my-8">
        <BannerSlot slot="home-mid-3" />
      </div>

      {/* 12. Membership Banner: TechBazaar Plus */}
      <TechBazaarPlusBanner />

      {/* 13. Wholesale FAQ Accordion */}
      <WholesaleFAQ />

      {/* 14. Why Shop With Us Trust Strip */}
      <TrustStrip />
    </div>
  );
}
