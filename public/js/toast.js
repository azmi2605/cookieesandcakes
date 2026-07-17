// Toast notification system for cookieesandcakes
(function () {
    'use strict';

    const CONFIG = {
        position: 'top-right',
        duration: 3500,
        maxToasts: 4,
        animationDuration: 300,
    };

    const COLORS = {
        success: { bg: '#E8F5E9', border: '#4CAF50', text: '#2E7D32', icon: 'check_circle' },
        error: { bg: '#FFEBEE', border: '#EF5350', text: '#C62828', icon: 'error' },
        warning: { bg: '#FFF8E1', border: '#FFA726', text: '#EF6C00', icon: 'warning' },
        info: { bg: '#E3F2FD', border: '#42A5F5', text: '#1565C0', icon: 'info' },
    };

    let container = null;
    let toastId = 0;
    const activeToasts = new Set();

    function ensureContainer() {
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 99999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
                max-width: 420px;
                width: calc(100% - 40px);
            `;
            document.body.appendChild(container);
        }
        return container;
    }

    function showToast(message, type = 'info', options = {}) {
        if (typeof window.App !== 'undefined' && window.App.__suppressToasts) return;

        const theme = COLORS[type] || COLORS.info;
        const id = ++toastId;
        const duration = options.duration || CONFIG.duration;
        const title = options.title || '';

        if (activeToasts.size >= CONFIG.maxToasts) {
            const oldest = activeToasts.values().next().value;
            if (oldest) dismissToast(oldest);
        }

        const toast = document.createElement('div');
        toast.dataset.toastId = id;
        toast.style.cssText = `
            pointer-events: auto;
            background: ${theme.bg};
            border: 1px solid ${theme.border};
            border-left: 4px solid ${theme.border};
            border-radius: 14px;
            padding: 14px 16px;
            box-shadow: 0 8px 24px rgba(90, 51, 43, 0.12);
            display: flex;
            align-items: flex-start;
            gap: 10px;
            font-family: 'Inter', 'Source Sans 3', -apple-system, sans-serif;
            font-size: 13px;
            line-height: 1.4;
            color: ${theme.text};
            transform: translateX(120%);
            opacity: 0;
            transition: transform ${CONFIG.animationDuration}ms cubic-bezier(0.22, 1, 0.36, 1),
                        opacity ${CONFIG.animationDuration}ms cubic-bezier(0.22, 1, 0.36, 1);
        `;

        const iconSpan = document.createElement('span');
        iconSpan.className = 'material-symbols-outlined';
        iconSpan.textContent = theme.icon;
        iconSpan.style.cssText = `
            font-size: 20px;
            color: ${theme.border};
            flex-shrink: 0;
            margin-top: 1px;
        `;

        const contentDiv = document.createElement('div');
        contentDiv.style.cssText = 'flex: 1; min-width: 0;';
        if (title) {
            const titleEl = document.createElement('div');
            titleEl.textContent = title;
            titleEl.style.cssText = `font-weight: 600; margin-bottom: 2px; color: ${theme.text};`;
            contentDiv.appendChild(titleEl);
        }
        const msgEl = document.createElement('div');
        msgEl.textContent = message;
        contentDiv.appendChild(msgEl);

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'close';
        closeBtn.className = 'material-symbols-outlined';
        closeBtn.setAttribute('aria-label', 'Dismiss');
        closeBtn.style.cssText = `
            background: none;
            border: none;
            cursor: pointer;
            font-size: 18px;
            color: ${theme.text};
            opacity: 0.5;
            padding: 0;
            line-height: 1;
            flex-shrink: 0;
            transition: opacity 0.15s ease;
        `;
        closeBtn.addEventListener('mouseenter', () => closeBtn.style.opacity = '1');
        closeBtn.addEventListener('mouseleave', () => closeBtn.style.opacity = '0.5');
        closeBtn.addEventListener('click', () => dismissToast(id));

        toast.appendChild(iconSpan);
        toast.appendChild(contentDiv);
        toast.appendChild(closeBtn);

        const wrapper = document.createElement('div');
        wrapper.dataset.toastId = id;
        wrapper.style.cssText = `
            width: 100%;
            pointer-events: auto;
        `;
        wrapper.appendChild(toast);

        ensureContainer().appendChild(wrapper);
        activeToasts.add(id);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.style.transform = 'translateX(0)';
                toast.style.opacity = '1';
            });
        });

        const timer = setTimeout(() => dismissToast(id), duration);
        toast._timer = timer;

        toast.addEventListener('mouseenter', () => clearTimeout(toast._timer));
        toast.addEventListener('mouseleave', () => {
            toast._timer = setTimeout(() => dismissToast(id), duration);
        });

        return id;
    }

    function dismissToast(id) {
        const wrapper = document.querySelector(`div[data-toast-id="${id}"]`);
        if (!wrapper) return;
        const toast = wrapper.querySelector('div[data-toast-id="${id}"]') || wrapper.firstElementChild;
        if (toast && toast._timer) clearTimeout(toast._timer);
        if (toast) {
            toast.style.transform = 'translateX(120%)';
            toast.style.opacity = '0';
        }
        const remove = () => {
            if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
            activeToasts.delete(id);
        };
        setTimeout(remove, CONFIG.animationDuration + 20);
    }

    window.Toast = {
        success(message, options = {}) { return showToast(message, 'success', { ...options, title: options.title || 'Success' }); },
        error(message, options = {}) { return showToast(message, 'error', { ...options, title: options.title || 'Error' }); },
        warning(message, options = {}) { return showToast(message, 'warning', { ...options, title: options.title || 'Warning' }); },
        info(message, options = {}) { return showToast(message, 'info', { ...options, title: options.title || 'Info' }); },
        dismiss(id) { dismissToast(id); },
    };
})();
