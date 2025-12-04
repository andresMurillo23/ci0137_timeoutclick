/**
 * PopupManager - Custom popup system
 * Replaces alert() and confirm() with styled popups
 */
class PopupManager {
    constructor() {
        this.popupCounter = 0;
        this.activePopups = new Map();
        this.setupGlobalListeners();
    }

    /**
     * Shows a confirmation popup
     * @param {string} title - Popup title
     * @param {string} message - Popup message
     * @param {Object} options - Additional options
     * @param {boolean} options.danger - If it's a dangerous action (red button)
     * @param {string} options.confirmText - Confirm button text
     * @param {string} options.cancelText - Cancel button text
     * @returns {Promise<boolean>} - true if confirmed, false if cancelled
     */
    confirm(title, message, options = {}) {
        return new Promise((resolve) => {
            const popupId = `popup-${++this.popupCounter}`;
            const danger = options.danger || false;
            const confirmText = options.confirmText || 'Confirm';
            const cancelText = options.cancelText || 'Cancel';

            const popup = this.createPopupElement(popupId, 'confirm', title, message);
            
            // Create action buttons
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'popup-actions';

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'popup-btn popup-btn-cancel';
            cancelBtn.textContent = cancelText;
            cancelBtn.onclick = () => {
                this.closePopup(popupId);
                resolve(false);
            };

            const confirmBtn = document.createElement('button');
            confirmBtn.className = `popup-btn ${danger ? 'popup-btn-danger' : 'popup-btn-confirm'}`;
            confirmBtn.textContent = confirmText;
            confirmBtn.onclick = () => {
                this.closePopup(popupId);
                resolve(true);
            };

            actionsDiv.appendChild(cancelBtn);
            actionsDiv.appendChild(confirmBtn);

            const popupContent = popup.querySelector('.popup-content');
            popupContent.appendChild(actionsDiv);

            document.body.appendChild(popup);
            this.activePopups.set(popupId, { element: popup, resolve, type: 'confirm' });

            // Activate popup with animation
            setTimeout(() => popup.classList.add('active'), 10);

            // Focus on confirm button
            setTimeout(() => confirmBtn.focus(), 100);
        });
    }

    /**
     * Shows a success popup
     * @param {string} title - Popup title
     * @param {string} message - Popup message
     * @param {number} autoClose - Time in ms to auto-close (default: 3000)
     */
    success(title, message, autoClose = 3000) {
        const popupId = `popup-${++this.popupCounter}`;
        const popup = this.createPopupElement(popupId, 'success', title, message);

        // Create OK button
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'popup-actions';

        const okBtn = document.createElement('button');
        okBtn.className = 'popup-btn popup-btn-ok';
        okBtn.textContent = 'OK';
        okBtn.onclick = () => this.closePopup(popupId);

        actionsDiv.appendChild(okBtn);

        const popupContent = popup.querySelector('.popup-content');
        popupContent.appendChild(actionsDiv);

        document.body.appendChild(popup);
        this.activePopups.set(popupId, { element: popup, type: 'success' });

        // Activate popup with animation
        setTimeout(() => popup.classList.add('active'), 10);

        // Auto-close after specified time
        if (autoClose > 0) {
            setTimeout(() => this.closePopup(popupId), autoClose);
        }
    }

    /**
     * Shows an error popup
     * @param {string} title - Popup title
     * @param {string} message - Popup message
     */
    error(title, message) {
        const popupId = `popup-${++this.popupCounter}`;
        const popup = this.createPopupElement(popupId, 'error', title, message);

        // Create OK button
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'popup-actions';

        const okBtn = document.createElement('button');
        okBtn.className = 'popup-btn popup-btn-ok';
        okBtn.textContent = 'OK';
        okBtn.onclick = () => this.closePopup(popupId);

        actionsDiv.appendChild(okBtn);

        const popupContent = popup.querySelector('.popup-content');
        popupContent.appendChild(actionsDiv);

        document.body.appendChild(popup);
        this.activePopups.set(popupId, { element: popup, type: 'error' });

        // Activate popup with animation
        setTimeout(() => popup.classList.add('active'), 10);

        // Focus on button
        setTimeout(() => okBtn.focus(), 100);
    }

    /**
     * Creates the popup DOM element
     * @private
     */
    createPopupElement(popupId, type, title, message) {
        const popup = document.createElement('div');
        popup.id = popupId;
        popup.className = `popup popup-${type}`;

        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';
        overlay.onclick = () => {
            if (type !== 'confirm') {
                this.closePopup(popupId);
            }
        };

        const content = document.createElement('div');
        content.className = 'popup-content';

        const titleElement = document.createElement('h3');
        titleElement.className = 'popup-title';
        titleElement.textContent = title;

        const messageElement = document.createElement('p');
        messageElement.className = 'popup-message';
        messageElement.textContent = message;

        content.appendChild(titleElement);
        content.appendChild(messageElement);

        popup.appendChild(overlay);
        popup.appendChild(content);

        return popup;
    }

    /**
     * Closes a specific popup
     * @param {string} popupId - ID of popup to close
     */
    closePopup(popupId) {
        const popupData = this.activePopups.get(popupId);
        if (!popupData) return;

        const { element, resolve, type } = popupData;

        // Remove active class for exit animation
        element.classList.remove('active');

        // Remove from DOM after animation
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.activePopups.delete(popupId);

            // If confirm closes without response, resolve as false
            if (type === 'confirm' && resolve) {
                resolve(false);
            }
        }, 300);
    }

    /**
     * Sets up global listeners (ESC to close)
     * @private
     */
    setupGlobalListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activePopups.size > 0) {
                // Close the last active popup
                const lastPopupId = Array.from(this.activePopups.keys()).pop();
                const popupData = this.activePopups.get(lastPopupId);
                
                // Only close with ESC if not a confirm
                if (popupData && popupData.type !== 'confirm') {
                    this.closePopup(lastPopupId);
                }
            }
        });
    }

    /**
     * Closes all active popups
     */
    closeAll() {
        const popupIds = Array.from(this.activePopups.keys());
        popupIds.forEach(id => this.closePopup(id));
    }
}

// Create global instance
window.PopupManager = new PopupManager();
