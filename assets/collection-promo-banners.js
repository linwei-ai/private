if (!customElements.get('collection-promo-banners')) {
  customElements.define(
    'collection-promo-banners',
    class CollectionPromoBanners extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        this.track = this.querySelector('.collection-promo-banners__track');
        this.nextEl = this.querySelector('.swiper-button-next');
        this.prevEl = this.querySelector('.swiper-button-prev');
        this.sliderInstance = null;

        if (!this.track || !window.FoxTheme?.Carousel) return;

        const slidesDesktop = Math.max(1, parseFloat(this.dataset.slidesDesktop) || 3);
        const slidesMobile = Math.max(1, parseFloat(this.dataset.slidesMobile) || 1);
        const gapDesktop = parseFloat(this.dataset.gapDesktop);
        const gapMobile = parseFloat(this.dataset.gapMobile);
        const spaceDesktop = Number.isFinite(gapDesktop) ? gapDesktop : 16;
        const spaceMobile = Number.isFinite(gapMobile) ? gapMobile : 12;

        const options = {
          slidesPerView: slidesMobile,
          spaceBetween: spaceMobile,
          threshold: 2,
          watchOverflow: true,
          navigation:
            this.nextEl && this.prevEl
              ? {
                  nextEl: this.nextEl,
                  prevEl: this.prevEl,
                }
              : false,
          pagination: false,
          loop: false,
          mousewheel: {
            enabled: true,
            forceToAxis: true,
          },
          breakpoints: {
            768: {
              slidesPerView: slidesDesktop,
              spaceBetween: spaceDesktop,
            },
          },
        };

        this.classList.add('swiper');
        this.track.classList.add('swiper-wrapper');

        this.sliderInstance = new window.FoxTheme.Carousel(this, options, [FoxTheme.Swiper.Mousewheel]);
        this.sliderInstance.init();
      }

      disconnectedCallback() {
        if (this.sliderInstance?.slider) {
          try {
            this.sliderInstance.slider.destroy(true, true);
          } catch (e) {
            /* noop */
          }
          this.sliderInstance = null;
        }
      }
    }
  );
}
