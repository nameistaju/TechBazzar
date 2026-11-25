import React, { useEffect } from 'react';
import HeroSection from '@features/home/components/HeroSection';
import CategoryCircles from '@features/home/components/CategoryCircles';
import PromoTiles from '@features/home/components/PromoTiles';
import FlashSaleSection from '@features/home/components/FlashSaleSection';
import EditorialBlock from '@features/home/components/EditorialBlock';
import TrendingSection from '@features/home/components/TrendingSection';
import RecommendedSection from '@features/home/components/RecommendedSection';
import RecentlyViewedSection from '@features/home/components/RecentlyViewedSection';
import ShopByBrand from '@features/home/components/ShopByBrand';
import TechBazaarPlusBanner from '@features/home/components/TechBazaarPlusBanner';
import TrustStrip from '@features/home/components/TrustStrip';
import HowWholesaleWorks from '@features/home/components/HowWholesaleWorks';
import TrustNumbersStrip from '@features/home/components/TrustNumbersStrip';
import WholesaleFAQ from '@features/home/components/WholesaleFAQ';
import BannerSlot from '@shared/ui/BannerSlot';

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
