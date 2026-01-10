// src/content/components/SidePanel/Footer.tsx
import React, { useState, useEffect } from 'react';
import { Copy, Check, Crown } from 'lucide-react';
import styles from './Footer.module.css';
import { CouponService } from '@/api-services/CouponService';
import { GetActiveHighlightedCouponResponse } from '@/api-services/dto/CouponDTO';
import { ENV } from '@/config/env';

export interface FooterProps {
  /** Whether component is rendered in Shadow DOM (uses plain class names) */
  useShadowDom?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ useShadowDom = false }) => {
  const [coupon, setCoupon] = useState<GetActiveHighlightedCouponResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  const getClassName = (baseClass: string) => {
    if (useShadowDom) {
      return baseClass;
    }
    const styleClass = styles[baseClass as keyof typeof styles];
    return styleClass || baseClass;
  };

  // Fetch coupon data
  useEffect(() => {
    let abortController: AbortController | null = null;

    const fetchCoupon = async () => {
      abortController = new AbortController();
      setLoading(true);

      await CouponService.getActiveHighlightedCoupon(
        {
          onSuccess: async (response) => {
            if (response.code === 'NO_ACTIVE_HIGHLIGHTED_COUPON' || !response.id) {
              setCoupon(null);
            } else {
              setCoupon(response);
            }
            setLoading(false);
          },
          onError: (errorCode, errorMessage) => {
            console.error('[Footer] Failed to fetch coupon:', errorCode, errorMessage);
            setCoupon(null);
            setLoading(false);
          },
        },
        abortController.signal
      );
    };

    fetchCoupon();

    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, []);

  // Handle coupon button click (opens pricing page)
  const handleCouponClick = () => {
    const pricingUrl = `${ENV.XPLAINO_WEBSITE_BASE_URL}/pricing`;
    window.open(pricingUrl, '_blank');
  };

  // Handle copy icon click
  const handleCopyClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent button click from firing
    
    if (coupon?.coupon_code) {
      try {
        await navigator.clipboard.writeText(coupon.coupon_code);
        setIsCopied(true);
        console.log('[Footer] Coupon code copied:', coupon.coupon_code);
        
        // Reset after 1 second
        setTimeout(() => {
          setIsCopied(false);
        }, 1000);
      } catch (error) {
        console.error('[Footer] Failed to copy code:', error);
      }
    }
  };

  // Format discount percentage
  const discountPercent = coupon?.discount
    ? Math.round(coupon.discount)
    : null;

  // Handle upgrade button click
  const handleUpgradeClick = () => {
    const pricingUrl = `${ENV.XPLAINO_WEBSITE_BASE_URL}/pricing`;
    window.open(pricingUrl, '_blank');
  };

  const hasCoupon = coupon && !loading && discountPercent && coupon.coupon_code;

  return (
    <div className={getClassName('footer')}>
      <div className={getClassName('footerContent')}>
        {hasCoupon && (
          <button
            className={getClassName('couponButton')}
            onClick={handleCouponClick}
            type="button"
          >
            <span className={getClassName('couponText')}>
              Save {discountPercent}% by using {coupon.coupon_code}{' '}
              <span
                className={getClassName('copyIcon')}
                onClick={handleCopyClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCopyClick(e as any);
                  }
                }}
              >
                {isCopied ? (
                  <>
                    <Check size={16} strokeWidth={2.5} />
                    <span className={getClassName('copiedText')}>Copied</span>
                  </>
                ) : (
                  <Copy size={16} strokeWidth={2.5} />
                )}
              </span>
            </span>
          </button>
        )}
        <button
          className={`${getClassName('upgradeButton')} ${!hasCoupon ? getClassName('upgradeButtonCentered') : ''}`}
          onClick={handleUpgradeClick}
          type="button"
        >
          <Crown size={16} strokeWidth={2.5} />
          <span>Upgrade</span>
        </button>
      </div>
    </div>
  );
};

Footer.displayName = 'Footer';
