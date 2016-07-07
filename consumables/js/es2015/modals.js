import '../polyfills/array-from';
import '../polyfills/object-assign';
import '../polyfills/custom-event';
import eventMatches from '../polyfills/event-matches';
import toggleClass from '../polyfills/toggle-class';

/**
 * @param {Element} element The element to obtain transition duration from.
 * @returns {number} The transition duration of the given property set in the given element.
 */
function getTransitionDuration(element) {
  const computedStyle = element.ownerDocument.defaultView.getComputedStyle(element);
  const durations = computedStyle.transitionDuration.split(/,\s*/)
    .map((transitionDuration) => parseFloat(transitionDuration))
    .filter((duration) => !isNaN(duration));
  return durations.length > 0 ? Math.max(...durations) : 0;
}

export default class Modal {
  /**
   * Modal dialog.
   * @implements Component
   * @param {HTMLElement} element The element working as a modal dialog.
   * @param {Object} [options] The component options.
   * @param {string} [options.classVisible] The CSS class for the visible state.
   * @param {string} [options.eventBeforeShown]
   *   The name of the custom event fired before this modal is shown.
   *   Cancellation of this event stops showing the modal.
   * @param {string} [options.eventAfterShown] The name of the custom event fired after this modal is shown.
   * @param {string} [options.eventBeforeHidden]
   *   The name of the custom event fired before this modal is hidden.
   *   Cancellation of this event stops hiding the modal.
   * @param {string} [options.eventAfterHidden] The name of the custom event fired after this modal is hidden.
   */
  constructor(element, options = {}) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      throw new TypeError('DOM element should be given to initialize this widget.');
    }

    this.element = element;

    this.options = Object.assign({
      classVisible: 'is-visible',
      eventBeforeShown: 'modal-beingshown',
      eventAfterShown: 'modal-shown',
      eventBeforeHidden: 'modal-beinghidden',
      eventAfterHidden: 'modal-hidden',
    }, options);

    this.constructor.components.set(this.element, this);

    this.hookCloseActions();
  }

  /**
   * Instantiates modal dialog of the given element.
   * @param {HTMLElement} element The element working as a modal dialog.
   * @param {Object} [options] The component options.
   * @param {string} [options.classVisible] The CSS class for the visible state.
   * @param {string} [options.eventBeforeShown]
   *   The name of the custom event fired before this modal is shown.
   *   Cancellation of this event stops showing the modal.
   * @param {string} [options.eventAfterShown] The name of the custom event fired after this modal is shown.
   * @param {string} [options.eventBeforeHidden]
   *   The name of the custom event fired before this modal is hidden.
   *   Cancellation of this event stops hiding the modal.
   * @param {string} [options.eventAfterHidden] The name of the custom event fired after this modal is hidden.
   */
  static create(element, options) {
    return this.components.get(element) || new this(element, options);
  }

  /**
   * Instantiates modal dialogs in the given element.
   * If the given element indicates that it's an modal dialog (having `data-modal` attribute), instantiates it.
   * Otherwise, instantiates modal dialogs by clicking on launcher buttons
   * (buttons with `data-modal-target` attribute) of modal dialogs in the given node.
   * @implements Component
   * @param {Node} target The DOM node to instantiate modal dialogs in. Should be a document or an element.
   * @param {Object} [options] The component options.
   * @param {string} [options.classVisible] The CSS class for the visible state.
   * @param {string} [options.eventBeforeShown]
   *   The name of the custom event fired before this modal is shown.
   *   Cancellation of this event stops showing the modal.
   * @param {string} [options.eventAfterShown] The name of the custom event fired after this modal is shown.
   * @param {string} [options.eventBeforeHidden]
   *   The name of the custom event fired before this modal is hidden.
   *   Cancellation of this event stops hiding the modal.
   * @param {string} [options.eventAfterHidden] The name of the custom event fired after this modal is hidden.
   * @returns {Handle} The handle to remove the event listener to handle clicking.
   */
  static init(target = document, options) {
    if (target.nodeType !== Node.ELEMENT_NODE && target.nodeType !== Node.DOCUMENT_NODE) {
      throw new Error('DOM document or DOM element should be given to search for and initialize this widget.');
    }
    if (target.nodeType === Node.ELEMENT_NODE && target.dataset.modal !== undefined) {
      this.create(target, options);
    } else {
      const handler = (event) => {
        const element = eventMatches(event, '[data-modal-target]');

        if (element) {
          const modalElements = [... element.ownerDocument.querySelectorAll(element.dataset.modalTarget)];
          if (modalElements.length > 1) {
            throw new Error('Target modal must be unique.');
          }

          if (modalElements.length === 1) {
            if (element.tagName === 'A') {
              event.preventDefault();
            }

            const modal = this.create(modalElements[0], options);
            modal.show(element, (error, shownAlready) => {
              if (!error && !shownAlready && modal.element.offsetWidth > 0 && modal.element.offsetHeight > 0) {
                modal.element.focus();
              }
            });
          }
        }
      };
      target.addEventListener('click', handler);
      return {
        release: () => target.removeEventListener('click', handler),
      };
    }
  }

  /**
   * Adds event listeners for closing this dialog.
   */
  hookCloseActions() {
    this.element.addEventListener('click', (event) => {
      if (event.currentTarget === event.target) this.hide();
    });

    if (this.keydownHandler) {
      this.element.ownerDocument.body.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }

    this.keydownHandler = (event) => {
      if (event.which === 27) {
        this.hide();
      }
    };

    this.element.ownerDocument.body.addEventListener('keydown', this.keydownHandler);

    [... this.element.querySelectorAll('[data-modal-close]')].forEach((element) => {
      element.addEventListener('click', () => {
        this.hide();
      });
    });
  }

  /**
   * Internal method of {@linkcode Modal#show .show()} and  {@linkcode Modal#hide .hide()}, to change show/hidden state.
   * @private
   * @param {boolean} visible `true` to make this modal dialog visible.
   * @param {Function} callback Callback called when change in state completes.
   */
  _changeState(visible, callback) {
    toggleClass(document.body, 'bx--noscroll', visible);
    let finished;
    const finishedTransition = () => {
      if (!finished) {
        finished = true;
        this.element.removeEventListener('transitionend', finishedTransition);
        callback();
      }
    };

    this.element.addEventListener('transitionend', finishedTransition);
    const transitionDuration = getTransitionDuration(this.element);
    toggleClass(this.element, this.options.classVisible, visible);
    if (transitionDuration === 0) {
      finishedTransition();
    }
  }

  /**
   * The callback called once showing/hiding this dialog is finished or is canceled.
   * @callback Modal~stateChangeCallback
   * @param {Error} error
   *   An error object with `true` in its `canceled` property if the showing/hiding this dialog is canceled.
   *   Cancellation happens if the handler of a custom event, that is fired before showing/hiding this dialog happens,
   *   calls `.preventDefault()` against the event.
   * @param {boolean} newState The new toggle state.
   */

  /**
   * Shows this modal dialog.
   * @param {HTMLElement} [launchingElement] The DOM element that triggered calling this function.
   * @param {Modal~stateChangeCallback} [callback] The callback called once showing this dialog is finished or is canceled.
   */
  show(launchingElement, callback) {
    if (typeof launchingElement === 'function') {
      callback = launchingElement; // eslint-disable-line no-param-reassign
      launchingElement = null; // eslint-disable-line no-param-reassign
    }

    if (launchingElement && !launchingElement.nodeType) {
      throw new TypeError('DOM Node should be given for launchingElement.');
    }

    if (this.element.classList.contains(this.options.classVisible)) {
      if (callback) {
        callback(null, true);
      }
      return;
    }

    const eventStart = new CustomEvent(this.options.eventBeforeShown, {
      bubbles: true,
      cancelable: true,
      detail: { launchingElement: launchingElement },
    });

    // https://connect.microsoft.com/IE/feedback/details/790389/event-defaultprevented-returns-false-after-preventdefault-was-called
    if (this.element.dispatchEvent(eventStart)) {
      this._changeState(true, () => {
        this.element.dispatchEvent(new CustomEvent(this.options.eventAfterShown, {
          bubbles: true,
          cancelable: true,
          detail: { launchingElement: launchingElement },
        }));
        if (callback) {
          callback();
        }
      });
    } else {
      const error = new Error('Showing dialog has been canceled.');
      error.canceled = true;
      if (callback) {
        callback(error);
      }
    }
  }

  /**
   * Hides this modal dialog.
   * @param {Modal~stateChangeCallback} [callback] The callback called once showing this dialog is finished or is canceled.
   */
  hide(callback) {
    if (!this.element.classList.contains(this.options.classVisible)) {
      if (callback) {
        callback(null, true);
      }
      return;
    }

    const eventStart = new CustomEvent(this.options.eventBeforeHidden, {
      bubbles: true,
      cancelable: true,
    });

    // https://connect.microsoft.com/IE/feedback/details/790389/event-defaultprevented-returns-false-after-preventdefault-was-called
    if (this.element.dispatchEvent(eventStart)) {
      this._changeState(false, () => {
        this.element.dispatchEvent(new CustomEvent(this.options.eventAfterHidden), {
          bubbles: true,
          cancelable: true,
        });
        if (callback) {
          callback();
        }
      });
    } else {
      const error = new Error('Hiding dialog has been canceled.');
      error.canceled = true;
      if (callback) {
        callback(error);
      }
    }
  }

  release() {
    if (this.keydownHandler) {
      this.element.ownerDocument.body.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
    this.constructor.components.delete(this.element);
  }

  /**
   * @deprecated
   */
  static hook() {
    console.warn('Modals.hook() is deprecated. Use Modals.init() instead.'); // eslint-disable-line no-console
  }
}

/**
 * The component options.
 * @member {Object} Modal#options
 * @property {string} [classVisible] The CSS class for the visible state.
 * @property {string} [eventBeforeShown]
 *   The name of the custom event fired before this modal is shown.
 *   Cancellation of this event stops showing the modal.
 * @property {string} [eventAfterShown] The name of the custom event fired after this modal is shown.
 * @property {string} [eventBeforeHidden]
 *   The name of the custom event fired before this modal is hidden.
 *   Cancellation of this event stops hiding the modal.
 * @property {string} [eventAfterHidden] The name of the custom event fired after this modal is hidden.
 */

/**
 * The map associating DOM element and modal instance.
 * @type {WeakMap}
 */
Modal.components = new WeakMap();
