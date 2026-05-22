import { DialogComponent } from '@theme/dialog';
import { CartAddEvent } from '@theme/events';

/**
 * A custom element that manages a cart drawer.
 *
 * @extends {DialogComponent}
 */
class CartDrawerComponent extends DialogComponent {
  focusableSelectors =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener(CartAddEvent.eventName, this.#handleCartAdd);
    this.addEventListener('keydown', this.#handleKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener(CartAddEvent.eventName, this.#handleCartAdd);
    this.removeEventListener('keydown', this.#handleKeyDown);
  }

  #handleCartAdd = () => {
    if (this.hasAttribute('auto-open')) {
      this.showDialog();
    }
  };

  #handleKeyDown = (event) => {
    if (event.key === 'Escape' && this.refs.dialog?.open) {
      this.close();
    }

    if (event.key === 'Tab') {
      this.handleFocusTrap(event);
    }
  };

  open() {
    this.showDialog();

    /**
     * Close cart drawer when installments CTA is clicked to avoid overlapping dialogs
     */
    customElements.whenDefined('shopify-payment-terms').then(() => {
      const installmentsContent = document.querySelector('shopify-payment-terms')?.shadowRoot;
      const cta = installmentsContent?.querySelector('#shopify-installments-cta');
      cta?.addEventListener('click', this.closeDialog, { once: true });
    });
  }

  close() {
    this.closeDialog();
  }

  handleFocusTrap(event) {
    if (!this.refs.dialog?.open) return;

    const focusableElements = this.refs.dialog.querySelectorAll(
      this.focusableSelectors
    );

    if (!focusableElements.length) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  async updateQuantity(line, quantity) {
    try {
      this.setLoading(true);

      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          line,
          quantity
        })
      });

      const cart = await response.json();

      if (quantity === 0) {
        this.removeLineItem(line);
      }

      this.renderCart(cart);
      this.updateCartCount(cart.item_count);
    } catch (error) {
      console.error('Cart update failed', error);
    } finally {
      this.setLoading(false);
    }
  }

  setLoading(isLoading) {
    const dialog = this.refs.dialog;
    if (!dialog) return;

    if (isLoading) {
      dialog.classList.add('cart-loading');
    } else {
      dialog.classList.remove('cart-loading');
    }
  }

  removeLineItem(line) {
    const lineItem = this.refs.dialog?.querySelector(
      `[data-line-item="${line}"]`
    );
    if (lineItem) {
      lineItem.remove();
    }
  }

  renderCart(cart) {
    // Dispatch a custom event to notify other components that the cart has been updated
    this.dispatchEvent(
      new CustomEvent('cart:updated', {
        detail: { cart },
        bubbles: true
      })
    );
  }

  updateCartCount(count) {
    const cartCount = document.querySelector('[data-cart-count]');
    if (cartCount) {
      cartCount.textContent = count;
      cartCount.setAttribute('aria-label', `Cart, ${count} items`);
    }
  }
}

if (!customElements.get('cart-drawer-component')) {
  customElements.define('cart-drawer-component', CartDrawerComponent);
}
